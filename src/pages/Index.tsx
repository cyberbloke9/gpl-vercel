import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigation } from "@/components/Navigation";
import { CategoryDashboard } from "@/components/CategoryDashboard";
import { IssuesTracker } from "@/components/IssuesTracker";
import { ReportsViewer } from "@/components/ReportsViewer";
import ChecklistView from "@/components/ChecklistView";
import { QRScanner } from "@/components/QRScanner";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";
import { toast } from "sonner";

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
  const [profile, setProfile] = useState<any>(null);
  const [currentChecklist, setCurrentChecklist] = useState<any>(null);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
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

  const handleStartChecklist = async (checklist: any) => {
    try {
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

      // Create completed checklist record with timestamp and user name
      const { data: completedChecklist, error: checklistError } = await supabase
        .from('completed_checklists')
        .insert({
          checklist_id: currentChecklist.id,
          user_id: user?.id,
          equipment_id: currentChecklist.equipment?.id,
          notes: results.find(r => r.notes)?.notes || null,
          category_unlocked_at: new Date().toISOString(),
          completed_by_name: userName, // Store name for audit trail
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
          priority: 'high',
          reported_by: user?.id,
          reported_by_name: userName, // Store name for audit trail
          reported_at: new Date().toISOString(),
        }));

        const { error: issuesError } = await supabase
          .from('issues')
          .insert(issues);

        if (issuesError) console.error('Error creating issues:', issuesError);
      }

      toast.success("✅ Checklist completed successfully!");
      setShowChecklist(false);
      setCurrentChecklist(null);
      loadData();
    } catch (error) {
      console.error('Error completing checklist:', error);
      toast.error("Failed to save checklist");
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
                Maintenance Hub
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
