
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, User } from 'lucide-react';
import { eventsAPI } from '@/lib/api';
import { toast } from 'sonner';

interface AdminEventCardProps {
  event: {
    id: string;
    title: string;
    description: string;
    date: string;
    location: string;
    status: string;
    createdBy: {
      id: string;
      username: string;
      role: string;
    };
  };
  onStatusChange: () => void;
}

const AdminEventCard: React.FC<AdminEventCardProps> = ({ event, onStatusChange }) => {
  const [isLoading, setIsLoading] = React.useState(false);
  
  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short', 
    day: 'numeric',
    year: 'numeric',
  });
  
  const handleApprove = async () => {
    setIsLoading(true);
    try {
      await eventsAPI.approveEvent(event.id);
      toast.success('Event approved successfully');
      onStatusChange();
    } catch (error) {
      toast.error('Failed to approve event');
      console.error('Approve event error:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleReject = async () => {
    setIsLoading(true);
    try {
      await eventsAPI.rejectEvent(event.id);
      toast.success('Event rejected successfully');
      onStatusChange();
    } catch (error) {
      toast.error('Failed to reject event');
      console.error('Reject event error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="overflow-hidden border-l-4 border-l-amber-400">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl font-bold">{event.title}</CardTitle>
          <Badge variant="secondary">
            {event.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        <p className="text-muted-foreground mb-4">{event.description}</p>
        
        <div className="flex flex-col space-y-2 text-sm mb-4">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>{formattedDate}</span>
          </div>
          
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>{event.location}</span>
          </div>
          
          <div className="flex items-center">
            <User className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>Created by: {event.createdBy.username} ({event.createdBy.role})</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="flex justify-between">
        <Button 
          onClick={handleReject} 
          variant="destructive"
          disabled={isLoading || event.status !== 'pending'}
          className="w-[48%]"
        >
          Reject
        </Button>
        
        <Button 
          onClick={handleApprove} 
          variant="default"
          disabled={isLoading || event.status !== 'pending'}
          className="w-[48%]"
        >
          Approve
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AdminEventCard;
