import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import QRScanner from '@/components/QRScanner';
import ChecklistCard from '@/components/ChecklistCard';
import ChecklistView from '@/components/ChecklistView';
import { 
  QrCode, 
  LogOut, 
  User, 
  Settings, 
  Clock,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';

interface Equipment {
  id: string;
  name: string;
  qr_code: string;
  location: string;
  description: string;
}

interface Checklist {
  id: string;
  title: string;
  description: string;
  frequency: string;
  equipment: Equipment;
}

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
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [currentChecklist, setCurrentChecklist] = useState<Checklist | null>(null);
  const [currentItems, setCurrentItems] = useState<ChecklistItem[]>([]);
  const [showChecklistView, setShowChecklistView] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

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
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();
      
      setProfile(profileData);

      // Load checklists with equipment
      const { data: checklistData, error } = await supabase
        .from('checklists')
        .select(`
          *,
          equipment (*)
        `);

      if (error) throw error;
      setChecklists(checklistData || []);
    } catch (error: any) {
      toast({
        title: "Error loading data",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleQRScan = async (qrCode: string) => {
    try {
      // Find checklist by equipment QR code
      const checklist = checklists.find(c => c.equipment.qr_code === qrCode);
      
      if (!checklist) {
        toast({
          title: "Equipment not found",
          description: `No checklist found for QR code: ${qrCode}`,
          variant: "destructive",
        });
        setShowQRScanner(false);
        return;
      }

      // Load checklist items
      const { data: items, error } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('checklist_id', checklist.id)
        .order('sort_order');

      if (error) throw error;

      setCurrentChecklist(checklist);
      setCurrentItems(items || []);
      setShowQRScanner(false);
      setShowChecklistView(true);
      
      toast({
        title: "Checklist loaded",
        description: `Ready to start: ${checklist.title}`,
      });
    } catch (error: any) {
      toast({
        title: "Error loading checklist",
        description: error.message,
        variant: "destructive",
      });
      setShowQRScanner(false);
    }
  };

  const handleStartChecklist = async (checklist: Checklist) => {
    try {
      // Load checklist items
      const { data: items, error } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('checklist_id', checklist.id)
        .order('sort_order');

      if (error) throw error;

      setCurrentChecklist(checklist);
      setCurrentItems(items || []);
      setShowChecklistView(true);
    } catch (error: any) {
      toast({
        title: "Error loading checklist",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCompleteChecklist = async (results: Array<{
    itemId: string;
    status: 'pass' | 'fail' | 'na';
    notes?: string;
    actualValue?: string;
    hasIssue?: boolean;
  }>) => {
    if (!currentChecklist || !user) return;

    try {
      // Create completed checklist record
      const { data: completedChecklist, error: checklistError } = await supabase
        .from('completed_checklists')
        .insert({
          checklist_id: currentChecklist.id,
          user_id: user.id,
          equipment_id: currentChecklist.equipment.id,
          notes: '',
        })
        .select()
        .single();

      if (checklistError) throw checklistError;

      // Create completed items
      const completedItems = results.map(result => ({
        completed_checklist_id: completedChecklist.id,
        checklist_item_id: result.itemId,
        status: result.status,
        notes: result.notes || null,
        actual_value: result.actualValue || null,
        has_issue: result.hasIssue || false,
      }));

      const { error: itemsError } = await supabase
        .from('completed_items')
        .insert(completedItems);

      if (itemsError) throw itemsError;

      toast({
        title: "Checklist completed!",
        description: `${currentChecklist.title} has been successfully completed.`,
      });

      setShowChecklistView(false);
      setCurrentChecklist(null);
      setCurrentItems([]);
    } catch (error: any) {
      toast({
        title: "Error completing checklist",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Settings className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (showChecklistView && currentChecklist) {
    return (
      <ChecklistView
        checklist={currentChecklist}
        items={currentItems}
        onComplete={handleCompleteChecklist}
        onBack={() => setShowChecklistView(false)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-gradient-primary text-white p-4">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Settings className="h-5 w-5" />
              </div>
              <div>
                <h1 className="font-bold text-lg">MaintenanceCheck</h1>
                <p className="text-white/80 text-sm">
                  Welcome, {profile?.full_name || 'Technician'}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <CheckCircle2 className="h-5 w-5 mx-auto mb-1" />
              <div className="text-lg font-bold">12</div>
              <div className="text-xs text-white/80">Completed</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <Clock className="h-5 w-5 mx-auto mb-1" />
              <div className="text-lg font-bold">3</div>
              <div className="text-xs text-white/80">Pending</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <TrendingUp className="h-5 w-5 mx-auto mb-1" />
              <div className="text-lg font-bold">98%</div>
              <div className="text-xs text-white/80">Success Rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* QR Scanner Button */}
        <Button
          variant="industrial"
          size="mobile"
          className="w-full"
          onClick={() => setShowQRScanner(true)}
        >
          <QrCode className="h-5 w-5" />
          Scan Equipment QR Code
        </Button>

        {/* Available Checklists */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Available Checklists</h2>
          {checklists.length > 0 ? (
            <div className="space-y-3">
              {checklists.map((checklist) => (
                <ChecklistCard
                  key={checklist.id}
                  id={checklist.id}
                  title={checklist.title}
                  description={checklist.description}
                  equipment={checklist.equipment}
                  frequency={checklist.frequency}
                  onStart={() => handleStartChecklist(checklist)}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-muted-foreground">No checklists available</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

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
