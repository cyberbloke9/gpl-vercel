import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, FileText, Play } from 'lucide-react';

interface ChecklistCardProps {
  id: string;
  title: string;
  description: string;
  equipment: {
    name: string;
    location: string;
    qr_code: string;
  };
  frequency: string;
  onStart: () => void;
}

const ChecklistCard: React.FC<ChecklistCardProps> = ({
  title,
  description,
  equipment,
  frequency,
  onStart,
}) => {
  const getFrequencyColor = (freq: string) => {
    switch (freq) {
      case 'daily': return 'bg-primary';
      case 'weekly': return 'bg-accent';
      case 'monthly': return 'bg-secondary';
      default: return 'bg-muted';
    }
  };

  return (
    <Card className="shadow-card hover:shadow-button transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold">{title}</CardTitle>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>
          <Badge variant="outline" className={`${getFrequencyColor(frequency)} text-white border-0`}>
            {frequency}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" />
            <span className="font-medium">{equipment.name}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{equipment.location}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className="capitalize">{frequency} maintenance</span>
          </div>
        </div>
        <Button 
          variant="industrial" 
          size="mobile" 
          className="w-full"
          onClick={onStart}
        >
          <Play className="h-4 w-4" />
          Start Checklist
        </Button>
      </CardContent>
    </Card>
  );
};

export default ChecklistCard;