import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle, XCircle, Minus, AlertCircle } from 'lucide-react';

interface CompletedItem {
  id: string;
  checklist_item_id: string;
  status: 'pass' | 'fail' | 'na';
  notes?: string;
  actual_value?: string;
  has_issue: boolean;
}

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  category: string;
  expected_value: string | null;
  unit: string | null;
}

interface ChecklistSummaryProps {
  checklist: {
    id: string;
    title: string;
    description: string;
    completed_at: string;
    completed_by_name: string;
    session_number: number;
    equipment?: {
      name: string;
      location: string;
    } | null;
  };
  items: ChecklistItem[];
  completedItems: CompletedItem[];
  onBack: () => void;
}

const ChecklistSummary: React.FC<ChecklistSummaryProps> = ({
  checklist,
  items,
  completedItems,
  onBack,
}) => {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-5 w-5 text-success" />;
      case 'fail': return <XCircle className="h-5 w-5 text-destructive" />;
      case 'na': return <Minus className="h-5 w-5 text-muted-foreground" />;
      default: return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pass': return <Badge variant="outline" className="bg-success/10 text-success border-success">Pass</Badge>;
      case 'fail': return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive">Fail</Badge>;
      case 'na': return <Badge variant="outline" className="bg-muted text-muted-foreground">N/A</Badge>;
      default: return null;
    }
  };

  const passCount = completedItems.filter(i => i.status === 'pass').length;
  const failCount = completedItems.filter(i => i.status === 'fail').length;
  const naCount = completedItems.filter(i => i.status === 'na').length;

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold text-lg">{checklist.title}</h1>
            <p className="text-sm text-muted-foreground">
              Completed by {checklist.completed_by_name} • Session {checklist.session_number}
            </p>
          </div>
        </div>

        {/* Summary Card */}
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-base">Checklist Summary</CardTitle>
            <CardDescription>Read-only view of completed checklist</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-success">{passCount}</div>
                <div className="text-xs text-muted-foreground">Passed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-destructive">{failCount}</div>
                <div className="text-xs text-muted-foreground">Failed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-muted-foreground">{naCount}</div>
                <div className="text-xs text-muted-foreground">N/A</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Warning Alert */}
        <Card className="bg-warning/10 border-warning">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
              <div>
                <p className="font-medium text-warning">This checklist has already been completed</p>
                <p className="text-sm text-muted-foreground mt-1">
                  You can review the results below, but cannot make any changes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items List */}
        <div className="space-y-3">
          {items.map(item => {
            const completed = completedItems.find(ci => ci.checklist_item_id === item.id);
            if (!completed) return null;

            return (
              <Card key={item.id} className="border-l-4 border-l-primary">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <CardTitle className="text-sm">{item.title}</CardTitle>
                      <CardDescription className="text-xs">{item.category}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(completed.status)}
                      {getStatusBadge(completed.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {item.expected_value && (
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="bg-muted/50 rounded-lg p-2">
                        <div className="text-xs text-muted-foreground">Expected</div>
                        <div className="font-medium">
                          {item.expected_value} {item.unit}
                        </div>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-2">
                        <div className="text-xs text-muted-foreground">Actual</div>
                        <div className="font-medium">
                          {completed.actual_value || 'N/A'} {completed.actual_value && item.unit}
                        </div>
                      </div>
                    </div>
                  )}
                  {completed.notes && (
                    <div className="bg-muted/30 rounded-lg p-3 text-sm">
                      <div className="text-xs text-muted-foreground mb-1">Notes</div>
                      <p className="text-foreground">{completed.notes}</p>
                    </div>
                  )}
                  {completed.has_issue && (
                    <div className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 rounded-lg p-2">
                      <AlertCircle className="h-4 w-4" />
                      <span>Issue reported for this item</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ChecklistSummary;