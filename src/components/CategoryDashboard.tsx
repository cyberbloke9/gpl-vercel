import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, Droplet, Wind, Zap, Shield, CheckCircle2, Lock, QrCode, PlayCircle, Clock, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { getCurrentSession, getNextTimeSlot, formatTimeSlot } from "@/utils/timeSlots";
import { EmergencyDialog } from "./EmergencyDialog";
import { format } from "date-fns";

interface Checklist {
  id: string;
  title: string;
  description: string;
  category: string;
}

interface CategoryStatus {
  unlocked: boolean;
  completed: boolean;
  unlockedAt?: string;
  completedAt?: string;
}

interface Equipment {
  id: string;
  name: string;
  qr_code: string;
  location: string | null;
  description: string | null;
}

interface CategoryWithIcon {
  name: string;
  icon: any;
  color: string;
  qrCode: string;
}

interface CategoryDashboardProps {
  onStartChecklist: (checklist: Checklist) => void;
  onScanQR: () => void;
}

// Icon mapping function based on equipment name
const getIconForEquipment = (name: string): { icon: any; color: string } => {
  if (name.toLowerCase().includes('turbine')) {
    return { icon: Activity, color: 'text-primary' };
  } else if (name.toLowerCase().includes('oil') || name.toLowerCase().includes('pressure')) {
    return { icon: Droplet, color: 'text-warning' };
  } else if (name.toLowerCase().includes('cooling')) {
    return { icon: Wind, color: 'text-info' };
  } else if (name.toLowerCase().includes('generator')) {
    return { icon: Zap, color: 'text-success' };
  } else if (name.toLowerCase().includes('electrical')) {
    return { icon: Shield, color: 'text-secondary' };
  } else if (name.toLowerCase().includes('safety') || name.toLowerCase().includes('general')) {
    return { icon: CheckCircle2, color: 'text-muted-foreground' };
  }
  // Default fallback
  return { icon: CheckCircle2, color: 'text-muted-foreground' };
};

export const CategoryDashboard = ({ onStartChecklist, onScanQR }: CategoryDashboardProps) => {
  const { user } = useAuth();
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [categories, setCategories] = useState<CategoryWithIcon[]>([]);
  const [categoryStatuses, setCategoryStatuses] = useState<Record<string, CategoryStatus>>({});
  const [loading, setLoading] = useState(true);
  const [selectedSimulation, setSelectedSimulation] = useState<string>("");
  const [currentSession, setCurrentSession] = useState<number | null>(null);
  const [nextSlot, setNextSlot] = useState<{ session: number; time: string } | null>(null);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [showEmergencyDialog, setShowEmergencyDialog] = useState(false);
  const [emergencyContext, setEmergencyContext] = useState<{ reason: string } | null>(null);

  useEffect(() => {
    if (user) {
      loadData();
      checkTimeSlot();
      // Check time slot every minute
      const interval = setInterval(checkTimeSlot, 60000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const checkTimeSlot = () => {
    const session = getCurrentSession();
    setCurrentSession(session);
    const next = getNextTimeSlot();
    setNextSlot(next);
  };

  const loadData = async () => {
    try {
      // Load equipment from database
      const { data: equipmentData, error: equipmentError } = await supabase
        .from('equipment')
        .select('*')
        .order('name');

      if (equipmentError) throw equipmentError;

      // Map equipment to categories with icons
      const loadedCategories: CategoryWithIcon[] = (equipmentData || []).map((equipment: Equipment) => {
        const { icon, color } = getIconForEquipment(equipment.name);
        return {
          name: equipment.name,
          icon: icon,
          color: color,
          qrCode: equipment.qr_code
        };
      });

      setCategories(loadedCategories);

      // Load all checklists
      const { data: checklistsData, error: checklistsError } = await supabase
        .from('checklists')
        .select('*')
        .order('title');

      if (checklistsError) throw checklistsError;

      const categorizedChecklists = (checklistsData || []).map(checklist => ({
        ...checklist,
        category: checklist.title.replace(' Checklist', '').replace(' Inspection', '')
      }));

      setChecklists(categorizedChecklists);

      // Load today's completion statuses for current session
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const session = getCurrentSession();

      const { data: completedData, error: completedError } = await supabase
        .from('completed_checklists')
        .select('checklist_id, category_unlocked_at, completed_at, session_number')
        .eq('user_id', user?.id)
        .gte('completed_at', today.toISOString());

      if (completedError) throw completedError;

      // Build status map
      const statusMap: Record<string, CategoryStatus> = {};
      loadedCategories.forEach(cat => {
        statusMap[cat.name] = { unlocked: false, completed: false };
      });

      // Check if current session is completed
      const currentSessionCompletions = completedData?.filter(c => c.session_number === session) || [];
      setSessionCompleted(currentSessionCompletions.length === loadedCategories.length);

      categorizedChecklists.forEach(checklist => {
        const completed = completedData?.find(c =>
          c.checklist_id === checklist.id && c.session_number === session
        );
        if (completed) {
          statusMap[checklist.category] = {
            unlocked: true,
            completed: true,
            unlockedAt: completed.category_unlocked_at,
            completedAt: completed.completed_at
          };
        }
      });

      setCategoryStatuses(statusMap);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartChecklist = (category: string) => {
    if (currentSession === null) {
      toast.error(`Checklists are only available during scheduled time slots. Next slot: ${nextSlot?.time}`);
      return;
    }

    if (sessionCompleted) {
      toast.info('All checklists for this session are completed. You can view them but not edit.');
    }

    const checklist = checklists.find(c => c.category === category);
    if (checklist) {
      onStartChecklist(checklist);
    }
  };

  const handleSimulateScan = () => {
    if (!selectedSimulation) {
      toast.error("Please select a category to simulate");
      return;
    }
    if (currentSession === null && !emergencyContext) {
      toast.error(`Checklists are only available during scheduled time slots. Next slot: ${nextSlot?.time}`);
      return;
    }
    const category = categories.find(cat => cat.name === selectedSimulation);
    if (category) {
      toast.success(`🎯 Simulating QR scan for ${category.name}...`);
      const qrEvent = new CustomEvent('simulateQRScan', {
        detail: category.qrCode,
      });
      window.dispatchEvent(qrEvent);
    }
  };

  const handleEmergencyStart = async (categoryName: string, reason: string) => {
    // Set emergency context
    setEmergencyContext({ reason });

    // Store emergency info for the next checklist completion
    sessionStorage.setItem('emergencyContext', JSON.stringify({
      reason,
      reportedAt: new Date().toISOString()
    }));

    toast.success(`🚨 Emergency checklist initiated for ${categoryName}`);

    // Automatically trigger QR scan for the selected category
    const category = categories.find(cat => cat.name === categoryName);
    if (category) {
      const qrEvent = new CustomEvent('simulateQRScan', { detail: category.qrCode });
      window.dispatchEvent(qrEvent);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isAccessible = currentSession !== null || emergencyContext !== null;
  const completedCount = Object.values(categoryStatuses).filter(s => s.completed).length;

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-4">
      <EmergencyDialog
        open={showEmergencyDialog}
        onOpenChange={setShowEmergencyDialog}
        categories={categories.map(c => ({ ...c, icon: c.icon.name, color: c.color }))}
        onEmergencyStart={handleEmergencyStart}
      />
      
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold">Daily Maintenance Checklists</h2>
            {emergencyContext ? (
              <p className="text-xs sm:text-sm text-destructive font-semibold mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
                EMERGENCY MODE ACTIVE
              </p>
            ) : currentSession ? (
              <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                Session {currentSession} of 4 • {formatTimeSlot(currentSession)} • Progress: {completedCount}/{categories.length}
              </p>
            ) : null}
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button 
              onClick={() => setShowEmergencyDialog(true)} 
              variant="destructive" 
              size="sm"
              className="flex items-center gap-1 sm:gap-2 flex-1 sm:flex-initial text-xs sm:text-sm h-9"
            >
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden xs:inline">Report </span>Emergency
            </Button>
            <Button onClick={onScanQR} size="sm" disabled={!isAccessible} className="flex-1 sm:flex-initial text-xs sm:text-sm h-9">
              <QrCode className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5" />
              <span className="hidden xs:inline">Scan Equipment QR</span>
              <span className="xs:hidden">Scan QR</span>
            </Button>
          </div>
        </div>

        {/* Time Slot Status */}
        {!isAccessible ? (
          <Card className="bg-warning/10 border-warning">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-warning flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm sm:text-base font-semibold text-warning">Checklists Currently Locked</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Next available slot: {nextSlot?.time} (Session {nextSlot?.session})
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Access windows: 8:00 AM, 12:00 PM, 5:30 PM, 11:45 PM (±30 min)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : sessionCompleted ? (
          <Card className="bg-success/10 border-success">
            <CardContent className="pt-4 sm:pt-6">
              <div className="flex items-start sm:items-center gap-2 sm:gap-3">
                <CheckCircle2 className="h-6 w-6 sm:h-8 sm:w-8 text-success flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm sm:text-base font-semibold text-success">Session {currentSession} Completed!</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    All {categories.length} checklists completed. Next session: {nextSlot?.time}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <p className="text-xs sm:text-sm text-muted-foreground">
          Scan equipment QR codes to unlock and complete category checklists
        </p>

        {/* Testing Simulation */}
        {isAccessible && (
          <Card className="bg-muted/30 border-dashed">
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="flex-1 space-y-1">
                  <div className="font-medium text-sm">🎯 Testing Mode - Simulate QR Scan</div>
                  <div className="text-xs text-muted-foreground">Select a category to simulate scanning its QR code</div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <Select value={selectedSimulation} onValueChange={setSelectedSimulation}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.name} value={cat.name}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleSimulateScan} 
                    variant="outline"
                    disabled={!selectedSimulation}
                  >
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Simulate
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {categories.map((category) => {
          const Icon = category.icon;
          const status = categoryStatuses[category.name] || { unlocked: false, completed: false };
          const isLocked = !status.unlocked || !isAccessible;
          const isCompleted = status.completed;

          return (
            <Card
              key={category.name}
              className={`transition-all ${isCompleted ? 'border-success bg-success/5' : isLocked ? 'border-border opacity-60' : 'border-primary'}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <Icon className={`h-6 w-6 sm:h-8 sm:w-8 ${isCompleted ? 'text-success' : category.color} flex-shrink-0`} />
                  {isLocked ? (
                    <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                  ) : isCompleted ? (
                    <Badge variant="outline" className="bg-success/10 text-success border-success text-xs">
                      ✓ Completed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary text-xs">
                      ✓ Unlocked
                    </Badge>
                  )}
                </div>
                <CardTitle className="mt-3 sm:mt-4 text-base sm:text-lg">{category.name}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  {!isAccessible
                    ? 'Not available - outside time window'
                    : isLocked
                      ? 'Scan QR code to unlock'
                      : isCompleted
                        ? `Completed in session ${currentSession}`
                        : 'Ready for inspection'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => handleStartChecklist(category.name)}
                  disabled={!isAccessible || (!status.unlocked && !isCompleted)}
                  variant={isCompleted ? "outline" : "default"}
                  className="w-full text-sm sm:text-base h-9 sm:h-10"
                >
                  {!isAccessible
                    ? 'Locked'
                    : isCompleted
                      ? 'View Checklist'
                      : isLocked
                        ? 'Locked'
                        : 'Start Checklist'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};