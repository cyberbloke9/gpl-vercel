import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, Droplet, Wind, Zap, Shield, CheckCircle2, Lock, QrCode, PlayCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

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

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

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

      // Load today's completion statuses
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: completedData, error: completedError } = await supabase
        .from('completed_checklists')
        .select('checklist_id, category_unlocked_at, completed_at')
        .eq('user_id', user?.id)
        .gte('completed_at', today.toISOString());

      if (completedError) throw completedError;

      // Build status map
      const statusMap: Record<string, CategoryStatus> = {};
      CATEGORIES.forEach(cat => {
        statusMap[cat.name] = { unlocked: false, completed: false };
      });

      categorizedChecklists.forEach(checklist => {
        const completed = completedData?.find(c => c.checklist_id === checklist.id);
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
    const checklist = checklists.find(c => c.category === category);
    if (checklist) {
      // Pass checklist as-is (category-based, no equipment reference)
      onStartChecklist(checklist);
    }
  };

  const handleSimulateScan = () => {
    if (!selectedSimulation) {
      toast.error("Please select a category to simulate");
      return;
    }
    const category = CATEGORIES.find(cat => cat.name === selectedSimulation);
    if (category) {
      toast.success(`🎯 Simulating QR scan for ${category.name}`);
      onScanQR(); // This will open the scanner, but we'll pass the code directly
      // Simulate the scan by calling with the QR code
      setTimeout(() => {
        const qrEvent = new CustomEvent('simulateQRScan', { detail: category.qrCode });
        window.dispatchEvent(qrEvent);
      }, 100);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-2xl font-bold">Daily Maintenance Checklists</h2>
          <div className="flex gap-2">
            <Button onClick={onScanQR} variant="industrial" size="mobile">
              <QrCode className="mr-2 h-5 w-5" />
              Scan Equipment QR
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground">
          Scan equipment QR codes to unlock and complete category checklists
        </p>

        {/* Testing Simulation */}
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
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CATEGORIES.map((category) => {
          const Icon = category.icon;
          const status = categoryStatuses[category.name] || { unlocked: false, completed: false };
          const isLocked = !status.unlocked;
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
                  {isLocked ? 'Scan QR code to unlock' : isCompleted ? `Completed today` : 'Ready for inspection'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={() => handleStartChecklist(category.name)}
                  disabled={isLocked}
                  variant={isCompleted ? "outline" : "default"}
                  className="w-full"
                >
                  {isCompleted ? 'View Checklist' : isLocked ? 'Locked' : 'Start Checklist'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
