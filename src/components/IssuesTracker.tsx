import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface Issue {
  id: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  reported_at: string;
  reported_by_name?: string;
  resolved_at?: string;
  notes?: string;
  completed_items: {
    checklist_item_id: string;
    checklist_items: {
      title: string;
      category: string;
    };
  };
}

export const IssuesTracker = () => {
  const { user } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');

  useEffect(() => {
    if (user) {
      loadIssues();
    }
  }, [user, filter]);

  const loadIssues = async () => {
    try {
      let query = supabase
        .from('issues')
        .select(`
          *,
          completed_items!inner(
            checklist_item_id,
            checklist_items!inner(
              title,
              category
            )
          )
        `)
        .order('reported_at', { ascending: false });

      if (filter === 'open') {
        query = query.in('status', ['open', 'in_progress']);
      } else if (filter === 'resolved') {
        query = query.in('status', ['resolved', 'closed']);
      }

      const { data, error } = await query;

      if (error) throw error;
      setIssues((data || []) as Issue[]);
    } catch (error) {
      console.error('Error loading issues:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-destructive text-destructive-foreground';
      case 'high': return 'bg-warning text-warning-foreground';
      case 'medium': return 'bg-info text-info-foreground';
      case 'low': return 'bg-success text-success-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertTriangle className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'resolved': return <CheckCircle className="h-4 w-4" />;
      case 'closed': return <XCircle className="h-4 w-4" />;
      default: return null;
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
        <h2 className="text-2xl font-bold">Issues Marked</h2>
        <div className="flex gap-2">
          <Button 
            variant={filter === 'all' ? 'default' : 'outline'}
            onClick={() => setFilter('all')}
          >
            All Issues
          </Button>
          <Button 
            variant={filter === 'open' ? 'default' : 'outline'}
            onClick={() => setFilter('open')}
          >
            Open
          </Button>
          <Button 
            variant={filter === 'resolved' ? 'default' : 'outline'}
            onClick={() => setFilter('resolved')}
          >
            Resolved
          </Button>
        </div>
      </div>

      {issues.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="h-12 w-12 text-success mb-4" />
            <p className="text-lg font-medium">No issues found</p>
            <p className="text-muted-foreground">All systems are running smoothly</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {issues.map((issue) => (
            <Card key={issue.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getPriorityColor(issue.priority)}>
                        {issue.priority.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1">
                        {getStatusIcon(issue.status)}
                        {issue.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">
                      {issue.completed_items.checklist_items.title}
                    </CardTitle>
                    <CardDescription>
                      {issue.completed_items.checklist_items.category} • Reported by {issue.reported_by_name || 'System'} on {format(new Date(issue.reported_at), 'PPp')}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">{issue.description}</p>
                  {issue.notes && (
                    <div className="bg-muted p-3 rounded-md">
                      <p className="text-sm text-muted-foreground">
                        <strong>Notes:</strong> {issue.notes}
                      </p>
                    </div>
                  )}
                  {issue.resolved_at && (
                    <p className="text-sm text-success">
                      Resolved on {format(new Date(issue.resolved_at), 'PPp')}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
