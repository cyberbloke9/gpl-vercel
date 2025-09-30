import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface Report {
  id: string;
  title: string;
  report_type: 'daily' | 'weekly' | 'monthly' | 'custom';
  generated_at: string;
  date_from: string;
  date_to: string;
  summary?: any;
  generated_by_name?: string;
}

export const ReportsViewer = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadReports();
    }
  }, [user]);

  const loadReports = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('generated_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setReports((data || []) as Report[]);
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const getReportTypeColor = (type: string) => {
    switch (type) {
      case 'daily': return 'bg-primary/10 text-primary border-primary';
      case 'weekly': return 'bg-info/10 text-info border-info';
      case 'monthly': return 'bg-success/10 text-success border-success';
      case 'custom': return 'bg-warning/10 text-warning border-warning';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const handleGenerateReport = async (type: 'daily' | 'weekly' | 'monthly') => {
    try {
      const now = new Date();
      let dateFrom = new Date();
      
      switch (type) {
        case 'daily':
          dateFrom.setHours(0, 0, 0, 0);
          break;
        case 'weekly':
          dateFrom.setDate(dateFrom.getDate() - 7);
          break;
        case 'monthly':
          dateFrom.setMonth(dateFrom.getMonth() - 1);
          break;
      }

      // Get current user's name using the secure function
      const { data: userName } = await supabase.rpc('get_current_user_name');

      const { error } = await supabase
        .from('reports')
        .insert({
          title: `${type.charAt(0).toUpperCase() + type.slice(1)} Report - ${format(now, 'PP')}`,
          report_type: type,
          generated_by: user?.id,
          generated_by_name: userName || 'System', // Store name for audit trail
          date_from: dateFrom.toISOString(),
          date_to: now.toISOString(),
          summary: { generated: true }
        });

      if (error) throw error;
      loadReports();
    } catch (error) {
      console.error('Error generating report:', error);
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
        <h2 className="text-2xl font-bold">Maintenance Reports</h2>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => handleGenerateReport('daily')} variant="default">
            <Calendar className="mr-2 h-4 w-4" />
            Generate Daily Report
          </Button>
          <Button onClick={() => handleGenerateReport('weekly')} variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Generate Weekly Report
          </Button>
          <Button onClick={() => handleGenerateReport('monthly')} variant="outline">
            <Calendar className="mr-2 h-4 w-4" />
            Generate Monthly Report
          </Button>
        </div>
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No reports yet</p>
            <p className="text-muted-foreground">Generate your first report to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={report.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className={getReportTypeColor(report.report_type)}>
                        {report.report_type.toUpperCase()}
                      </Badge>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-lg">{report.title}</CardTitle>
                    <CardDescription>
                      Generated by {report.generated_by_name || 'System'} on {format(new Date(report.generated_at), 'PPp')}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="icon">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  <p>Period: {format(new Date(report.date_from), 'PP')} - {format(new Date(report.date_to), 'PP')}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
