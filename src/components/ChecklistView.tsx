import React, { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  XCircle, 
  Minus, 
  Camera, 
  ArrowLeft, 
  FileText,
  MapPin,
  Activity,
  Zap,
  Droplet,
  Wind,
  Shield
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

interface ChecklistViewProps {
  checklist: {
    id: string;
    title: string;
    description: string;
    equipment: {
      name: string;
      location: string;
    };
  };
  items: ChecklistItem[];
  onComplete: (results: Array<{
    itemId: string;
    status: 'pass' | 'fail' | 'na';
    notes?: string;
    actualValue?: string;
    hasIssue?: boolean;
  }>) => void;
  onBack: () => void;
}

type ItemStatus = 'pass' | 'fail' | 'na' | 'pending';

interface ItemResult {
  status: ItemStatus;
  notes: string;
  actualValue: string;
  hasIssue: boolean;
}

const ChecklistView: React.FC<ChecklistViewProps> = ({
  checklist,
  items,
  onComplete,
  onBack,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<Record<string, ItemResult>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentItem = items[currentIndex];
  const progress = ((currentIndex + 1) / items.length) * 100;

  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, ChecklistItem[]>);

  const handleStatusChange = (status: ItemStatus) => {
    if (!currentItem) return;
    
    setResults(prev => ({
      ...prev,
      [currentItem.id]: {
        ...prev[currentItem.id],
        status,
        notes: prev[currentItem.id]?.notes || '',
        actualValue: prev[currentItem.id]?.actualValue || '',
        hasIssue: status === 'fail',
      },
    }));
  };

  const handleNotesChange = (notes: string) => {
    if (!currentItem) return;
    
    setResults(prev => ({
      ...prev,
      [currentItem.id]: {
        ...prev[currentItem.id],
        notes,
        status: prev[currentItem.id]?.status || 'pending',
        actualValue: prev[currentItem.id]?.actualValue || '',
        hasIssue: prev[currentItem.id]?.hasIssue || false,
      },
    }));
  };

  const handleActualValueChange = (value: string) => {
    if (!currentItem) return;
    
    setResults(prev => ({
      ...prev,
      [currentItem.id]: {
        ...prev[currentItem.id],
        actualValue: value,
        status: prev[currentItem.id]?.status || 'pending',
        notes: prev[currentItem.id]?.notes || '',
        hasIssue: prev[currentItem.id]?.hasIssue || false,
      },
    }));
  };

  const handlePhotoCapture = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      toast({
        title: "Photo Captured",
        description: "Photo will be attached to this inspection item.",
      });
    }
  };

  const canProceed = () => {
    const currentResult = results[currentItem?.id];
    return currentResult?.status && currentResult.status !== 'pending';
  };

  const handleNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    const completedResults = items.map(item => ({
      itemId: item.id,
      status: results[item.id]?.status as 'pass' | 'fail' | 'na' || 'na',
      notes: results[item.id]?.notes,
      actualValue: results[item.id]?.actualValue,
      hasIssue: results[item.id]?.hasIssue,
    }));

    await onComplete(completedResults);
    setIsSubmitting(false);
  };

  const getStatusColor = (status: ItemStatus) => {
    switch (status) {
      case 'pass': return 'text-success';
      case 'fail': return 'text-destructive';
      case 'na': return 'text-muted-foreground';
      default: return 'text-muted-foreground';
    }
  };

  const isComplete = currentIndex === items.length - 1 && canProceed();

  if (!currentItem) return null;

  const categoryIcon = getCategoryIcon(currentItem.category);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="font-bold text-lg">{checklist.title}</h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                <span>{checklist.equipment.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                <span>{checklist.equipment.location}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{currentIndex + 1} of {items.length}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Current Item Card */}
        <Card className="shadow-card border-2 border-primary/20">
          <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
            <div className="flex items-center gap-2">
              {categoryIcon}
              <div className="flex-1">
                <CardTitle className="text-base">{currentItem.title}</CardTitle>
                <CardDescription className="text-xs">{currentItem.category}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* Expected Value Display */}
            {currentItem.expected_value && (
              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <div className="text-xs text-muted-foreground mb-1">Expected Value</div>
                <div className="text-lg font-bold text-primary">
                  {currentItem.expected_value}
                  {currentItem.unit && <span className="ml-1 text-sm">{currentItem.unit}</span>}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{currentItem.description}</div>
              </div>
            )}

            {/* Actual Value Input (if expected value exists) */}
            {currentItem.expected_value && (
              <div className="space-y-2">
                <Label htmlFor="actual-value" className="text-sm font-medium">Actual Reading</Label>
                <div className="flex gap-2">
                  <input
                    id="actual-value"
                    type="text"
                    placeholder={`Enter reading${currentItem.unit ? ` (${currentItem.unit})` : ''}`}
                    value={results[currentItem.id]?.actualValue || ''}
                    onChange={(e) => handleActualValueChange(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-sm"
                  />
                </div>
              </div>
            )}

            {/* Status Buttons */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Inspection Result</Label>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant={results[currentItem.id]?.status === 'pass' ? 'success' : 'outline'}
                  onClick={() => handleStatusChange('pass')}
                  className="flex flex-col gap-1 h-auto py-3"
                >
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-xs">Pass</span>
                </Button>
                <Button
                  variant={results[currentItem.id]?.status === 'fail' ? 'destructive' : 'outline'}
                  onClick={() => handleStatusChange('fail')}
                  className="flex flex-col gap-1 h-auto py-3"
                >
                  <XCircle className="h-5 w-5" />
                  <span className="text-xs">Fail</span>
                </Button>
                <Button
                  variant={results[currentItem.id]?.status === 'na' ? 'secondary' : 'outline'}
                  onClick={() => handleStatusChange('na')}
                  className="flex flex-col gap-1 h-auto py-3"
                >
                  <Minus className="h-5 w-5" />
                  <span className="text-xs">N/A</span>
                </Button>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any observations or comments..."
                value={results[currentItem.id]?.notes || ''}
                onChange={(e) => handleNotesChange(e.target.value)}
                className="min-h-[80px]"
              />
            </div>

            {/* Photo Capture */}
            <Button
              variant="outline"
              onClick={handlePhotoCapture}
              className="w-full"
            >
              <Camera className="h-4 w-4 mr-2" />
              Attach Photo
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className="flex-1"
          >
            Previous
          </Button>
          {isComplete ? (
            <Button
              variant="industrial"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1"
            >
              Complete Checklist
            </Button>
          ) : (
            <Button
              variant="industrial"
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex-1"
            >
              Next
            </Button>
          )}
        </div>

        {/* Category-based Progress */}
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <div className="space-y-2">
              {Object.entries(groupedItems).map(([category, categoryItems]) => {
                const completedInCategory = categoryItems.filter(
                  item => results[item.id]?.status && results[item.id].status !== 'pending'
                ).length;
                const totalInCategory = categoryItems.length;
                const isCurrentCategory = currentItem.category === category;
                
                return (
                  <div
                    key={category}
                    className={`flex items-center justify-between p-2 rounded text-xs ${
                      isCurrentCategory ? 'bg-primary/10 border border-primary/20' : ''
                    }`}
                  >
                    <span className="font-medium">{category}</span>
                    <span className="text-muted-foreground">
                      {completedInCategory}/{totalInCategory}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const getCategoryIcon = (category: string) => {
  const iconMap: Record<string, React.ReactNode> = {
    'Turbine System': <Activity className="h-5 w-5 text-primary" />,
    'Generator': <Zap className="h-5 w-5 text-primary" />,
    'Oil Pressure Unit': <Droplet className="h-5 w-5 text-primary" />,
    'Cooling System': <Wind className="h-5 w-5 text-primary" />,
    'Electrical Systems': <Zap className="h-5 w-5 text-primary" />,
    'Safety & General': <Shield className="h-5 w-5 text-primary" />,
  };
  return iconMap[category] || <FileText className="h-5 w-5 text-primary" />;
};

export default ChecklistView;