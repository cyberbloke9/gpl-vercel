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

interface CategoryDashboardProps {
  onStartChecklist: (checklist: Checklist) => void;
  onScanQR: () => void;
}

const CATEGORIES = [
  { name: "Turbine System", icon: Activity, color: "text-primary", qrCode: "TURB-2025-001" },
  { name: "Oil Pressure Unit", icon: Droplet, color: "text-warning", qrCode: "OPU-2025-001" },
  { name: "Cooling System", icon: Wind, color: "text-info", qrCode: "CS-2025-001" },
  { name: "Generator", icon: Zap, color: "text-success", qrCode: "GEN-2025-001" },
  { name: "Electrical Systems", icon: Shield, color: "text-secondary", qrCode: "ELEC-2025-001" },
  { name: "Safety & General", icon: CheckCircle2, color: "text-muted-foreground", qrCode: "SAFE-2025-001" }
];

export const CategoryDashboard = ({ onStartChecklist, onScanQR }: CategoryDashboardProps) => {
  const { user } = useAuth();
  const [checklists, setChecklists] = useState<Checklist[]>([]);
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
      // Load all checklists
      const { data: checklistsData, error: checklistsError } = await supabase
        .from('checklists')
        .select('*')
        .order('title');

      if (checklistsError) throw checklistsError;

      const categorizedChecklists = (checklistsData || []).map(checklist => ({
        ...checklist,
        category: checklist.title.replace(' Checklist', '')
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
      CATEGORIES.forEach(cat => {
        statusMap[cat.name] = { unlocked: false, completed: false };
      });

      // Check if current session is completed
      const currentSessionCompletions = completedData?.filter(c => c.session_number === session) || [];
      setSessionCompleted(currentSessionCompletions.length === 6);

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
    const category = CATEGORIES.find(cat => cat.name === selectedSimulation);
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
    const category = CATEGORIES.find(cat => cat.name === categoryName);
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
    <div className="space-y-6 p-4">
      <EmergencyDialog
        open={showEmergencyDialog}
        onOpenChange={setShowEmergencyDialog}
        categories={CATEGORIES.map(c => ({ ...c, icon: c.icon.name, color: c.color }))}
        onEmergencyStart={handleEmergencyStart}
      />
      
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold">Daily Maintenance Checklists</h2>
            {emergencyContext ? (
              <p className="text-sm text-destructive font-semibold mt-1 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                EMERGENCY MODE ACTIVE
              </p>
            ) : currentSession ? (
              <p className="text-sm text-muted-foreground mt-1">
                Session {currentSession} of 4 • {formatTimeSlot(currentSession)} • Progress: {completedCount}/6
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowEmergencyDialog(true)} 
              variant="destructive" 
              size="mobile"
              className="flex items-center gap-2"
            >
              <AlertTriangle className="h-5 w-5" />
              Report Emergency
            </Button>
            <Button onClick={onScanQR} variant="industrial" size="mobile" disabled={!isAccessible}>
              <QrCode className="mr-2 h-5 w-5" />
              Scan Equipment QR
            </Button>
          </div>
        </div>

        {/* Time Slot Status */}
        {!isAccessible ? (
          <Card className="bg-warning/10 border-warning">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Clock className="h-8 w-8 text-warning" />
                <div className="flex-1">
                  <p className="font-semibold text-warning">Checklists Currently Locked</p>
                  <p className="text-sm text-muted-foreground">
                    Next available slot: {nextSlot?.time} (Session {nextSlot?.session})
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Access windows: 8:00 AM, 12:00 PM, 5:30 PM, 11:45 PM (±30 minutes)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : sessionCompleted ? (
          <Card className="bg-success/10 border-success">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-8 w-8 text-success" />
                <div className="flex-1">
                  <p className="font-semibold text-success">Session {currentSession} Completed!</p>
                  <p className="text-sm text-muted-foreground">
                    All 6 checklists completed. Next session: {nextSlot?.time}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <p className="text-muted-foreground">
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
                      {CATEGORIES.map((cat) => (
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CATEGORIES.map((category) => {
          const Icon = category.icon;
          const status = categoryStatuses[category.name] || { unlocked: false, completed: false };
          const isLocked = !status.unlocked || !isAccessible;
          const isCompleted = status.completed;

          return (
            <Card 
              key={category.name} 
              className={`transition-all ${isCompleted ? 'border-success bg-success/5' : isLocked ? 'border-border opacity-60' : 'border-primary'}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <Icon className={`h-8 w-8 ${isCompleted ? 'text-success' : category.color}`} />
                  {isLocked ? (
                    <Lock className="h-5 w-5 text-muted-foreground" />
                  ) : isCompleted ? (
                    <Badge variant="outline" className="bg-success/10 text-success border-success">
                      ✓ Completed
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-primary/10 text-primary border-primary">
                      ✓ Unlocked
                    </Badge>
                  )}
                </div>
                <CardTitle className="mt-4">{category.name}</CardTitle>
                <CardDescription>
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
                  className="w-full"
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