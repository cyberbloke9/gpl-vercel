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

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  sort_order: number;
  category: string;
  expected_value: string | null;
  unit: string | null;
  icon: string | null;
}

const Index = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('checklists');
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [currentChecklist, setCurrentChecklist] = useState<any>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [completedItems, setCompletedItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    loadData();
  }, [user, navigate]);

  const loadData = async () => {
    try {
      // Load user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleQRScan = async (qrCode: string) => {
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

      // Find checklist for this equipment's category
      const { data: checklist, error: checklistError } = await supabase
        .from('checklists')
        .select('*')
        .ilike('title', `%${equipment.category}%`)
        .single();

      if (checklistError || !checklist) {
        toast.error("No checklist found for this equipment category");
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

      setCurrentChecklist({ ...checklist, equipment, category: equipment.category });
      setChecklistItems(items || []);
      setShowQRScanner(false);
      setShowChecklist(true);
      toast.success(`✅ ${equipment.category} unlocked! Starting checklist...`);
    } catch (error) {
      console.error('Error handling QR scan:', error);
      toast.error("Failed to load checklist");
      setShowQRScanner(false);
    }
  };

  // Listen for simulated QR scans (for testing)
  useEffect(() => {
    const handleSimulatedScan = (event: CustomEvent) => {
      handleQRScan(event.detail);
    };
    window.addEventListener('simulateQRScan' as any, handleSimulatedScan);
    return () => {
      window.removeEventListener('simulateQRScan' as any, handleSimulatedScan);
    };
  }, [user]);

  const handleStartChecklist = async (checklist: any) => {
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
        setChecklistItems(items || []);
        setCompletedItems(existingCompletion.completed_items || []);
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
      setChecklistItems(items || []);
      setShowChecklist(true);
    } catch (error) {
      console.error('Error loading checklist items:', error);
      toast.error("Failed to load checklist items");
    }
  };

  const handleCompleteChecklist = async (results: any[]) => {
    try {
      // Get current user's name for audit trail
      const userName = profile?.full_name || 'Unknown User';
      const currentSession = getCurrentSession();
      
      // Check for emergency context
      const emergencyContextStr = sessionStorage.getItem('emergencyContext');
      const emergencyContext = emergencyContextStr ? JSON.parse(emergencyContextStr) : null;
      
      // Allow completion if either in valid session OR in emergency mode
      if (!currentSession && !emergencyContext) {
        toast.error("Cannot complete checklist outside of scheduled time slots");
        return;
      }

      // Format time slot for storage (e.g., "08:00", "12:00", "17:30", "23:45")
      const timeSlot = format(new Date(), 'HH:mm');

      // Create completed checklist record with session tracking
      const { data: completedChecklist, error: checklistError } = await supabase
        .from('completed_checklists')
        .insert({
          checklist_id: currentChecklist.id,
          user_id: user?.id,
          equipment_id: currentChecklist.equipment?.id,
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

      // Create issue records for failed items
      const failedItems = results.filter(r => r.status === 'fail');
      if (failedItems.length > 0 && insertedItems) {
        const issues = failedItems.map((result, index) => ({
          completed_item_id: insertedItems[index].id,
          description: result.notes || 'Item marked as failed',
          priority: emergencyContext ? 'critical' : 'high',
          reported_by: user?.id,
          reported_by_name: userName,
          reported_at: new Date().toISOString(),
        }));

        const { error: issuesError } = await supabase
          .from('issues')
          .insert(issues);

        if (issuesError) console.error('Error creating issues:', issuesError);
      }

      if (emergencyContext) {
        toast.success("🚨 Emergency checklist completed successfully!");
        // Clear emergency context
        sessionStorage.removeItem('emergencyContext');
      } else {
        toast.success("✅ Checklist completed successfully!");
        // Check if all 6 checklists for this session are completed
        await checkAndGenerateReport(currentSession!);
      }
      
      setShowChecklist(false);
      setCurrentChecklist(null);
      loadData();
    } catch (error) {
      console.error('Error completing checklist:', error);
      toast.error("Failed to save checklist");
    }
  };

  const checkAndGenerateReport = async (sessionNumber: number) => {
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

      // If all 6 checklists are completed, generate report
      if (sessionCompletions && sessionCompletions.length === 6) {
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
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Gayatri Mini Hydel
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground font-medium">{profile?.full_name}</span>
              </div>
              <Button 
                onClick={() => signOut()} 
                variant="ghost" 
                size="icon"
                className="hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="h-5 w-5" />
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
