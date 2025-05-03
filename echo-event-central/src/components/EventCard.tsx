
import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { eventsAPI } from '@/lib/api';
import { toast } from 'sonner';

interface EventCardProps {
  event: {
    id: string;
    title: string;
    description: string;
    date: string;
    location: string;
    status: string;
    rsvpCount: number;
    userRsvp: boolean;
  };
  onRsvpChange: () => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onRsvpChange }) => {
  const { user, isStudent } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  
  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  
  const handleRsvp = async () => {
    if (!user) {
      toast.error('You must be logged in to RSVP');
      return;
    }
    
    setIsLoading(true);
    try {
      if (event.userRsvp) {
        await eventsAPI.cancelRsvp(event.id);
        toast.success('RSVP canceled successfully');
      } else {
        await eventsAPI.rsvpToEvent(event.id);
        toast.success('RSVP confirmed successfully');
      }
      onRsvpChange(); // Refresh the event list
    } catch (error) {
      toast.error('Failed to update RSVP status');
      console.error('RSVP error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="event-card overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl font-bold">{event.title}</CardTitle>
          <Badge variant={event.status === 'approved' ? 'default' : 'secondary'}>
            {event.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="pb-2">
        <p className="text-muted-foreground mb-4">{event.description}</p>
        
        <div className="flex flex-col space-y-2 text-sm">
          <div className="flex items-center">
            <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>{formattedDate}</span>
          </div>
          
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>{event.location}</span>
          </div>
          
          <div className="flex items-center">
            <Users className="h-4 w-4 mr-2 text-muted-foreground" />
            <span>{event.rsvpCount} attending</span>
          </div>
        </div>
      </CardContent>
      
      <CardFooter>
        {isStudent() && event.status === 'approved' && (
          <Button 
            onClick={handleRsvp} 
            variant={event.userRsvp ? 'destructive' : 'default'}
            disabled={isLoading}
            className="w-full"
          >
            {isLoading 
              ? 'Processing...' 
              : event.userRsvp 
                ? 'Cancel RSVP' 
                : 'RSVP to Event'}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default EventCard;
