import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface Category {
  name: string;
  icon: string;
  color: string;
  qrCode: string;
}

interface EmergencyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: Category[];
  onEmergencyStart: (categoryName: string, reason: string) => void;
}

export const EmergencyDialog = ({ open, onOpenChange, categories, onEmergencyStart }: EmergencyDialogProps) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (selectedCategory && reason.trim()) {
      onEmergencyStart(selectedCategory, reason.trim());
      setSelectedCategory('');
      setReason('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <DialogTitle>Report Emergency Incident</DialogTitle>
          </div>
          <DialogDescription>
            Select the system that requires emergency maintenance and provide a reason for this unscheduled checklist.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="reason" className="text-base">Emergency Reason *</Label>
            <Textarea
              id="reason"
              placeholder="Describe the emergency situation requiring immediate attention..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-2 min-h-[100px]"
              required
            />
          </div>

          <div>
            <Label className="text-base">Select System for Emergency Check *</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              {categories.map((category) => (
                <Card
                  key={category.name}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    selectedCategory === category.name
                      ? 'ring-2 ring-primary bg-primary/5'
                      : 'hover:bg-accent'
                  }`}
                  onClick={() => setSelectedCategory(category.name)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`text-3xl ${category.color}`}>
                      {category.icon}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{category.name}</h4>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={handleSubmit}
              disabled={!selectedCategory || !reason.trim()}
              className="flex-1"
              variant="destructive"
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Start Emergency Checklist
            </Button>
            <Button
              onClick={() => onOpenChange(false)}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
