import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Calendar, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { generateReportHTML, downloadReport } from "@/utils/reportGenerator";
import { downloadQRCodeSheet } from "@/utils/qrCodeGenerator";
import { toast } from "sonner";

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
        .eq('generated_by', user?.id)
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

      // Fetch completed checklists with full details
      const { data: completedChecklists, error: checklistsError } = await supabase
        .from('completed_checklists')
        .select(`
          *,
          equipment:equipment_id(*),
          completed_items:completed_items(
            *,
            checklist_item:checklist_item_id(*)
          )
        `)
        .gte('completed_at', dateFrom.toISOString())
        .lte('completed_at', now.toISOString());

      if (checklistsError) throw checklistsError;

      // Fetch issues
      const { data: issues, error: issuesError } = await supabase
        .from('issues')
        .select('*')
        .gte('reported_at', dateFrom.toISOString())
        .lte('reported_at', now.toISOString());

      if (issuesError) throw issuesError;

      // Get current user's name
      const { data: userName } = await supabase.rpc('get_current_user_name');

      // Create summary with actual data
      const summary = {
        totalChecklists: completedChecklists?.length || 0,
        totalIssues: issues?.length || 0,
        dateGenerated: now.toISOString()
      };

      const { error } = await supabase
        .from('reports')
        .insert({
          title: `${type.charAt(0).toUpperCase() + type.slice(1)} Report - ${format(now, 'PP')}`,
          report_type: type,
          generated_by: user?.id,
          generated_by_name: userName || 'System',
          date_from: dateFrom.toISOString(),
          date_to: now.toISOString(),
          summary
        });

      if (error) throw error;
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} report generated successfully!`);
      loadReports();
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report');
    }
  };

  const handleDownloadReport = async (report: Report) => {
    try {
      toast.loading('Generating report document...');

      // Fetch detailed data for the report period
      const { data: completedChecklists, error: checklistsError } = await supabase
        .from('completed_checklists')
        .select(`
          *,
          equipment:equipment_id(*),
          completed_items:completed_items(
            *,
            checklist_item:checklist_item_id(*)
          )
        `)
        .gte('completed_at', report.date_from)
        .lte('completed_at', report.date_to);

      if (checklistsError) throw checklistsError;

      const { data: issues, error: issuesError } = await supabase
        .from('issues')
        .select('*')
        .gte('reported_at', report.date_from)
        .lte('reported_at', report.date_to);

      if (issuesError) throw issuesError;

      // Transform data to match expected format
      const transformedChecklists = (completedChecklists || []).map((c: any) => ({
        ...c,
        items: c.completed_items || []
      }));

      const reportHTML = generateReportHTML({
        completedChecklists: transformedChecklists,
        issues: issues || [],
        dateFrom: new Date(report.date_from),
        dateTo: new Date(report.date_to),
        reportType: report.report_type,
        generatedBy: report.generated_by_name || 'System'
      });

      const filename = `maintenance-report-${report.report_type}-${format(new Date(report.date_from), 'yyyy-MM-dd')}.html`;
      downloadReport(reportHTML, filename);
      
      toast.dismiss();
      toast.success('Report downloaded successfully!');
    } catch (error) {
      console.error('Error downloading report:', error);
      toast.dismiss();
      toast.error('Failed to download report');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getFilteredReports = (type: string) => {
    return reports.filter(r => r.report_type === type);
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex flex-col gap-4">
        <h2 className="text-2xl font-bold">My Inspection Reports</h2>
        <p className="text-muted-foreground text-sm">
          Reports are automatically generated after completing all 6 checklists in a session
        </p>
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
        <div className="space-y-8">
          {/* Daily Reports */}
          <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Daily Reports
            </h3>
            <div className="space-y-4">
              {getFilteredReports('daily').length === 0 ? (
                <p className="text-muted-foreground text-sm">No daily reports generated yet</p>
              ) : (
                getFilteredReports('daily').map((report) => (
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
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDownloadReport(report)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground">
                        <p>Period: {format(new Date(report.date_from), 'PP')} - {format(new Date(report.date_to), 'PP')}</p>
                        {report.summary && (
                          <div className="mt-2 flex gap-4">
                            <span>✓ {report.summary.totalChecklists || 0} checklists</span>
                            <span>⚠️ {report.summary.totalIssues || 0} issues</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Weekly Reports */}
          <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-info" />
              Weekly Reports
            </h3>
            <div className="space-y-4">
              {getFilteredReports('weekly').length === 0 ? (
                <p className="text-muted-foreground text-sm">No weekly reports generated yet</p>
              ) : (
                getFilteredReports('weekly').map((report) => (
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
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDownloadReport(report)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground">
                        <p>Period: {format(new Date(report.date_from), 'PP')} - {format(new Date(report.date_to), 'PP')}</p>
                        {report.summary && (
                          <div className="mt-2 flex gap-4">
                            <span>✓ {report.summary.totalChecklists || 0} checklists</span>
                            <span>⚠️ {report.summary.totalIssues || 0} issues</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Monthly Reports */}
          <div>
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-success" />
              Monthly Reports
            </h3>
            <div className="space-y-4">
              {getFilteredReports('monthly').length === 0 ? (
                <p className="text-muted-foreground text-sm">No monthly reports generated yet</p>
              ) : (
                getFilteredReports('monthly').map((report) => (
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
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDownloadReport(report)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-sm text-muted-foreground">
                        <p>Period: {format(new Date(report.date_from), 'PP')} - {format(new Date(report.date_to), 'PP')}</p>
                        {report.summary && (
                          <div className="mt-2 flex gap-4">
                            <span>✓ {report.summary.totalChecklists || 0} checklists</span>
                            <span>⚠️ {report.summary.totalIssues || 0} issues</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
