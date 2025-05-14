import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { eventsAPI, registrationsAPI } from '@/lib/api';
import { toast } from 'sonner';

interface EventCardProps {
  event: {
    id: string;
    title: string;
    description: string;
    date: string;
    time: string;
    venue: string;          // plain text like “Library”
    status: string;
    priority: 'normal' | 'low' | 'high' | 'mandatory';
    rsvpCount: number;
    userRsvp: boolean;
  };
  onRsvpChange: () => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onRsvpChange }) => {
  const { user, isStudent, isAdmin } = useAuth();           /* ← added isAdmin */
  const [busy, setBusy]   = useState(false);
  const [rsvp, setRsvp]   = useState(event.userRsvp);
  const [count, setCount] = useState(event.rsvpCount);

  /* pull live count once on mount */
  useEffect(() => {
    registrationsAPI
        .countForEvent(event.id)
        .then(({ data }) => setCount(data.count))
        .catch(() => {});
  }, [event.id]);

  const formattedDate = new Date(event.date).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const refreshCount = async () => {
    const { data } = await registrationsAPI.countForEvent(event.id);
    setCount(data.count);
  };


  const priorityLabel = (p: 'normal'|'low'|'high'|'mandatory') => {
    switch (p) {
      case 'low':        return 'Low priority';
      case 'high':       return 'High priority';
      case 'mandatory':  return 'Attendance Mandatory';       // reads well without “priority”
      default:           return '';
    }
  };

  const handleRsvp = async () => {
    if (!user) {
      toast.error('You must be logged in to RSVP');
      return;
    }
    setBusy(true);
    try {
      if (rsvp) {
        await eventsAPI.cancelRsvp(event.id);
        setRsvp(false);
        toast.success('RSVP canceled');
      } else {
        await eventsAPI.rsvpToEvent(event.id);
        setRsvp(true);
        toast.success('RSVP confirmed');
      }
      await refreshCount();
      onRsvpChange();
    } catch (err: any) {
      toast.error(err?.response?.data?.error ?? 'Failed to update RSVP');
    } finally {
      setBusy(false);
    }
  };

  /* accept only “true” updates from parent to avoid flicker */
  useEffect(() => {
    if (event.userRsvp && !rsvp) setRsvp(true);
  }, [event.userRsvp, rsvp]);

  return (
      <Card className="event-card overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            {/* title (unchanged) */}
            <CardTitle className="text-xl font-bold">{event.title}</CardTitle>

            {/* ───────── Right-hand badge column ───────── */}
            <div className="flex flex-col items-end space-y-1">
              {/* only admins see the approval badge */}
              {isAdmin() && event.status === 'approved' && (
                  <Badge variant="default">approved</Badge>
              )}

              {/* priority badge shown to everyone if not "normal" */}
              {event.priority !== 'normal' && (
                  <Badge
                      variant={
                        event.priority === 'low'
                            ? 'secondary'
                            : event.priority === 'high'
                                ? 'default'
                                : 'destructive'        /* mandatory */
                      }
                      className={
                        event.priority === 'low'
                            ? 'bg-green-500 text-white'
                            : event.priority === 'high'
                                ? 'bg-yellow-400 text-black'
                                : ''                    /* mandatory already red */
                      }
                  >
                    {priorityLabel(event.priority)}
                  </Badge>
              )}
            </div>
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
              <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>{event.time}</span>
            </div>

            <div className="flex items-center">
              <MapPin className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>{event.venue || 'Location TBA'}</span>
            </div>

            <div className="flex items-center">
              <Users className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>{count} attending</span>
            </div>
          </div>
        </CardContent>

        <CardFooter>
          {isStudent() && event.status === 'approved' && (
              <Button
                  onClick={handleRsvp}
                  variant={rsvp ? 'destructive' : 'default'}
                  disabled={busy}
                  className="w-full"
              >
                {busy ? 'Processing…' : rsvp ? 'Cancel RSVP' : 'RSVP to Event'}
              </Button>
          )}
        </CardFooter>
      </Card>
  );
};

export default EventCard;
