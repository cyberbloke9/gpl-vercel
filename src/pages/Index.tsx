import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigation } from "@/components/Navigation";
import { CategoryDashboard } from "@/components/CategoryDashboard";
import { IssuesTracker } from "@/components/IssuesTracker";
import { ReportsViewer } from "@/components/ReportsViewer";
import ChecklistView from "@/components/ChecklistView";
import ChecklistSummary from "@/components/ChecklistSummary";
import { QRScanner } from "@/components/QRScanner";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { toast } from "sonner";
import { getCurrentSession } from "@/utils/timeSlots";
import { format } from "date-fns";
import type {
  Profile,
  Checklist,
  ChecklistItem,
  CompletedItem,
  ChecklistResult,
  EmergencyContext,
  Equipment,
} from "@/types";

// BUG FIX #5: Define constant for total categories instead of magic number
const TOTAL_CHECKLIST_CATEGORIES = 6;

// Declare custom event for QR simulation
declare global {
  interface WindowEventMap {
    simulateQRScan: CustomEvent<string>;
  }
}

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('checklists');
  const [showQRScanner, setShowQRScanner] = useState<boolean>(false);
  const [showChecklist, setShowChecklist] = useState<boolean>(false);
  const [showSummary, setShowSummary] = useState<boolean>(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentChecklist, setCurrentChecklist] = useState<Checklist | null>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [completedItems, setCompletedItems] = useState<CompletedItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadData();
  }, [user, navigate]);

  const loadData = async (): Promise<void> => {
    try {
      // Load user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData as Profile);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleQRScan = async (qrCode: string): Promise<void> => {
    try {
      // Find equipment by QR code
      const { data: equipment, error: equipmentError } = await supabase
        .from('equipment')
        .select('*')
        .eq('qr_code', qrCode)
        .single();

      if (equipmentError || !equipment) {
        toast.error("Equipment not found");
        setShowQRScanner(false);
        return;
      }

      // BUG FIX #1 & #7: Use equipment_id foreign key for exact matching instead of fuzzy title matching
      // This prevents matching wrong checklists and uses proper database relationships
      const { data: checklist, error: checklistError } = await supabase
        .from('checklists')
        .select('*')
        .eq('equipment_id', equipment.id)
        .single();

      if (checklistError || !checklist) {
        toast.error("No checklist found for this equipment");
        setShowQRScanner(false);
        return;
      }

      // Load checklist items
      const { data: items, error: itemsError } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('checklist_id', checklist.id)
        .order('sort_order');

      if (itemsError) throw itemsError;

      const typedEquipment = equipment as Equipment;
      const typedChecklist: Checklist = {
        ...checklist,
        equipment: typedEquipment,
        category: typedEquipment.category,
      };

      setCurrentChecklist(typedChecklist);
      setChecklistItems((items || []) as ChecklistItem[]);
      setShowQRScanner(false);
      setShowChecklist(true);
      toast.success(`✅ ${typedEquipment.category} unlocked! Starting checklist...`);
    } catch (error) {
      console.error('Error handling QR scan:', error);
      toast.error("Failed to load checklist");
      setShowQRScanner(false);
    }
  };

  // Listen for simulated QR scans (for testing)
  useEffect(() => {
    const handleSimulatedScan = (event: Event): void => {
      const customEvent = event as CustomEvent<string>;
      handleQRScan(customEvent.detail);
    };
    window.addEventListener('simulateQRScan', handleSimulatedScan);
    return () => {
      window.removeEventListener('simulateQRScan', handleSimulatedScan);
    };
  }, [user]);

  const handleStartChecklist = async (checklist: Checklist): Promise<void> => {
    try {
      // Check if checklist is already completed for current session
      const currentSession = getCurrentSession();
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: existingCompletion } = await supabase
        .from('completed_checklists')
        .select('*, completed_items(*)')
        .eq('checklist_id', checklist.id)
        .eq('user_id', user?.id)
        .eq('session_number', currentSession)
        .gte('completed_at', today.toISOString())
        .maybeSingle();

      // If already completed, show summary instead
      if (existingCompletion) {
        const { data: items } = await supabase
          .from('checklist_items')
          .select('*')
          .eq('checklist_id', checklist.id)
          .order('sort_order');

        setCurrentChecklist({
          ...checklist,
          completed_at: existingCompletion.completed_at,
          completed_by_name: existingCompletion.completed_by_name,
          session_number: existingCompletion.session_number,
        });
        setChecklistItems((items || []) as ChecklistItem[]);
        setCompletedItems((existingCompletion.completed_items || []) as CompletedItem[]);
        setShowSummary(true);
        return;
      }

      // Otherwise, start new checklist
      const { data: items, error } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('checklist_id', checklist.id)
        .order('sort_order');

      if (error) throw error;

      setCurrentChecklist(checklist);
      setChecklistItems((items || []) as ChecklistItem[]);
      setShowChecklist(true);
    } catch (error) {
      console.error('Error loading checklist items:', error);
      toast.error("Failed to load checklist items");
    }
  };

  const handleCompleteChecklist = async (results: ChecklistResult[]): Promise<void> => {
    // BUG FIX #4: Add try-catch-finally to ensure emergency context is always cleared
    try {
      // Get current user's name for audit trail
      const userName = profile?.full_name || 'Unknown User';
      const currentSession = getCurrentSession();

      // Check for emergency context
      const emergencyContextStr = sessionStorage.getItem('emergencyContext');
      const emergencyContext: EmergencyContext | null = emergencyContextStr
        ? JSON.parse(emergencyContextStr) as EmergencyContext
        : null;

      // Allow completion if either in valid session OR in emergency mode
      if (!currentSession && !emergencyContext) {
        toast.error("Cannot complete checklist outside of scheduled time slots");
        return;
      }

      // Format time slot for storage (e.g., "08:00", "12:00", "17:30", "23:45")
      const timeSlot = format(new Date(), 'HH:mm');

      // BUG FIX #2: Validate equipment ID before insert to prevent undefined values
      const equipmentId = currentChecklist?.equipment?.id;
      if (!equipmentId) {
        console.error('Missing equipment ID in checklist:', currentChecklist);
        toast.error("Cannot complete checklist: Equipment information is missing");
        throw new Error("Equipment ID is required but was undefined");
      }

      // Create completed checklist record with session tracking
      const { data: completedChecklist, error: checklistError } = await supabase
        .from('completed_checklists')
        .insert({
          checklist_id: currentChecklist.id,
          user_id: user?.id,
          equipment_id: equipmentId, // Now validated to be defined
          notes: results.find(r => r.notes)?.notes || null,
          category_unlocked_at: new Date().toISOString(),
          completed_by_name: userName,
          session_number: emergencyContext ? null : currentSession,
          time_slot: timeSlot,
          is_emergency: !!emergencyContext,
          emergency_reason: emergencyContext?.reason || null,
          emergency_reported_at: emergencyContext?.reportedAt || null,
        })
        .select()
        .single();

      if (checklistError) throw checklistError;

      // Create completed items records
      const completedItems = results.map(result => ({
        completed_checklist_id: completedChecklist.id,
        checklist_item_id: result.itemId,
        status: result.status,
        notes: result.notes,
        actual_value: result.actualValue,
        has_issue: result.status === 'fail',
      }));

      const { data: insertedItems, error: itemsError } = await supabase
        .from('completed_items')
        .insert(completedItems)
        .select();

      if (itemsError) throw itemsError;

      // BUG FIX #3: Create issue records for failed items with correct mapping
      // Find matching insertedItem by checklist_item_id instead of relying on array index
      const failedItems = results.filter(r => r.status === 'fail');
      if (failedItems.length > 0 && insertedItems) {
        const issues = failedItems.map((result) => {
          // Find the corresponding inserted item by matching checklist_item_id
          const matchingInsertedItem = insertedItems.find(
            item => item.checklist_item_id === result.itemId
          );

          if (!matchingInsertedItem) {
            console.error('Could not find matching inserted item for failed item:', result);
            return null;
          }

          return {
            completed_item_id: matchingInsertedItem.id,
            description: result.notes || 'Item marked as failed',
            priority: emergencyContext ? 'critical' : 'high',
            reported_by: user?.id,
            reported_by_name: userName,
            reported_at: new Date().toISOString(),
          };
        }).filter(issue => issue !== null); // Remove any null entries from mapping failures

        if (issues.length > 0) {
          const { error: issuesError } = await supabase
            .from('issues')
            .insert(issues);

          // BUG FIX #6: Keep console.error and ensure meaningful toast for users
          if (issuesError) {
            console.error('Error creating issues:', issuesError);
            toast.error("Checklist saved but failed to create issue reports. Please contact support.");
          }
        }
      }

      if (emergencyContext) {
        toast.success("🚨 Emergency checklist completed successfully!");
      } else {
        toast.success("✅ Checklist completed successfully!");
        // Check if all checklists for this session are completed
        await checkAndGenerateReport(currentSession!);
      }

      setShowChecklist(false);
      setCurrentChecklist(null);
      loadData();
    } catch (error) {
      console.error('Error completing checklist:', error);
      // BUG FIX #6: Provide meaningful error message to user
      toast.error("Failed to save checklist. Please try again or contact support.");
    } finally {
      // BUG FIX #4: Always clear emergency context in finally block
      // This ensures cleanup happens even if there's an error
      const emergencyContextStr = sessionStorage.getItem('emergencyContext');
      if (emergencyContextStr) {
        sessionStorage.removeItem('emergencyContext');
      }
    }
  };

  const checkAndGenerateReport = async (sessionNumber: number): Promise<void> => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Count completed checklists for this session today
      const { data: sessionCompletions, error: countError } = await supabase
        .from('completed_checklists')
        .select('id')
        .eq('user_id', user?.id)
        .eq('session_number', sessionNumber)
        .gte('completed_at', today.toISOString());

      if (countError) throw countError;

      // BUG FIX #5: Use constant instead of magic number
      // If all checklists are completed, generate report
      if (sessionCompletions && sessionCompletions.length === TOTAL_CHECKLIST_CATEGORIES) {
        // Check if report already exists for this session
        const { data: existingReport } = await supabase
          .from('reports')
          .select('id')
          .eq('generated_by', user?.id)
          .gte('generated_at', today.toISOString())
          .eq('report_type', 'daily')
          .limit(1);

        if (!existingReport || existingReport.length === 0) {
          // Generate report
          const now = new Date();
          const { data: completedChecklists } = await supabase
            .from('completed_checklists')
            .select('*')
            .eq('user_id', user?.id)
            .eq('session_number', sessionNumber)
            .gte('completed_at', today.toISOString());

          const { data: issues } = await supabase
            .from('issues')
            .select('*')
            .eq('reported_by', user?.id)
            .gte('reported_at', today.toISOString());

          const summary = {
            totalChecklists: completedChecklists?.length || 0,
            totalIssues: issues?.length || 0,
            sessionNumber: sessionNumber,
            dateGenerated: now.toISOString()
          };

          const { error: reportError } = await supabase
            .from('reports')
            .insert({
              title: `Session ${sessionNumber} Report - ${format(now, 'PP')}`,
              report_type: 'daily',
              generated_by: user?.id,
              generated_by_name: profile?.full_name || 'System',
              date_from: today.toISOString(),
              date_to: now.toISOString(),
              summary
            });

          if (reportError) throw reportError;

          toast.success(`🎉 Session ${sessionNumber} completed! Report generated automatically.`);
        }
      }
    } catch (error) {
      console.error('Error checking/generating report:', error);
      // BUG FIX #6: Provide meaningful feedback to user
      toast.error("Session completed but report generation failed. Reports can be generated manually.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-industrial-darker via-industrial-dark to-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="relative">
            <div className="w-20 h-20 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-10 h-10 bg-primary/20 rounded-full animate-pulse"></div>
            </div>
          </div>
          <p className="text-muted-foreground animate-pulse">Loading maintenance system...</p>
        </div>
      </div>
    );
  }

  // Show summary view if viewing completed checklist
  if (showSummary && currentChecklist) {
    return (
      <ChecklistSummary
        checklist={currentChecklist}
        items={checklistItems}
        completedItems={completedItems}
        onBack={() => {
          setShowSummary(false);
          setCurrentChecklist(null);
          setCompletedItems([]);
        }}
      />
    );
  }

  // Show checklist view if active
  if (showChecklist && currentChecklist) {
    return (
      <ChecklistView
        checklist={currentChecklist}
        items={checklistItems}
        onComplete={handleCompleteChecklist}
        onBack={() => {
          setShowChecklist(false);
          setCurrentChecklist(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-industrial-darker via-industrial-dark to-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-20">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent truncate">
                Gayatri Mini Hydel
              </h1>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              <div className="hidden sm:flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground font-medium">{profile?.full_name}</span>
              </div>
              <Button
                onClick={() => signOut()}
                variant="ghost"
                size="icon"
                className="hover:bg-destructive/10 hover:text-destructive h-9 w-9 sm:h-10 sm:w-10"
              >
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <main className="container mx-auto max-w-7xl">
        {activeTab === 'checklists' && (
          <CategoryDashboard
            onStartChecklist={handleStartChecklist}
            onScanQR={() => setShowQRScanner(true)}
          />
        )}
        {activeTab === 'issues' && <IssuesTracker />}
        {activeTab === 'reports' && <ReportsViewer />}
      </main>

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <QRScanner
          onScanSuccess={handleQRScan}
          onClose={() => setShowQRScanner(false)}
        />
      )}
    </div>
  );
};

export default Index;
