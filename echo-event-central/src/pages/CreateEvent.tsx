// src/pages/CreateEvent.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

import { format } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { eventsAPI } from '@/lib/api';
import { toast } from 'sonner';
import Navbar from '@/components/Navbar';

const CreateEvent = () => {
  /* ────────────────────────── Auth / navigation guards ───────────────────────── */
  const { user, isAdmin, isProfessor } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (!(isAdmin() || isProfessor())) {
      toast.error('You do not have permission to create events.');
      navigate('/');
    }
  }, [user, isAdmin, isProfessor, navigate]);

  /* ─────────────────────────────── Local state ──────────────────────────────── */
  const [eventName, setEventName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [date, setDate] = React.useState<Date | undefined>();
  const [time, setTime] = React.useState(''); // HH:mm
  const [venue_id, setVenue_id] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  /* ─────────────────────────────── Validation ──────────────────────────────── */
  const validate = () => {
    const e: Record<string, string> = {};

    if (!eventName.trim()) e.eventName = 'Title is required';
    if (!description.trim()) e.description = 'Description is required';
    if (!date) e.date = 'Date is required';
    if (!time.trim()) e.time = 'Time is required';
    if (!venue_id.trim()) e.location = 'Location is required';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ───────────────────────────── Submit handler ────────────────────────────── */
  const handleSubmit = async (evt: React.FormEvent) => {
    evt.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await eventsAPI.createEvent({
        event_name: eventName,
        description,
        event_date: date!.toISOString(),
        event_time: time, // "HH:mm"
        venue_id,
      });

      toast.success('Event created! Awaiting admin approval.');
      navigate('/');
    } catch (err) {
      console.error('Create event error:', err);
      toast.error('Failed to create event. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /* ───────────────────────────────── Render ────────────────────────────────── */
  return (
      <div className="min-h-screen flex flex-col">
        <Navbar />

        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle>Create a New Event</CardTitle>
                <CardDescription>
                  Fill out the form below. Your event will be marked{' '}
                  <strong>pending</strong> until an administrator approves it.
                </CardDescription>
              </CardHeader>

              <form onSubmit={handleSubmit}>
                <CardContent className="space-y-4">
                  {/* Event Title */}
                  <div className="space-y-2">
                    <Label htmlFor="eventName">Event Title</Label>
                    <Input
                        id="eventName"
                        placeholder="Enter event title"
                        value={eventName}
                        onChange={(e) => setEventName(e.target.value)}
                    />
                    {errors.eventName && (
                        <p className="text-destructive text-sm">{errors.eventName}</p>
                    )}
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Event Description</Label>
                    <Textarea
                        id="description"
                        placeholder="Describe your event"
                        rows={4}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                    {errors.description && (
                        <p className="text-destructive text-sm">{errors.description}</p>
                    )}
                  </div>

                  {/* Date */}
                  <div className="space-y-2">
                    <Label>Event Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? format(date, 'PPP') : <span>Select a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            disabled={(d) => d < new Date()}
                            initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {errors.date && (
                        <p className="text-destructive text-sm">{errors.date}</p>
                    )}
                  </div>

                  {/* Time */}
                  <div className="space-y-2">
                    <Label htmlFor="time">Event Time (HH:mm)</Label>
                    <Input
                        id="time"
                        type="time"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                    />
                    {errors.time && (
                        <p className="text-destructive text-sm">{errors.time}</p>
                    )}
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <Label htmlFor="location">Event Location</Label>
                    <Input
                        id="location"
                        placeholder="Enter event location"
                        value={venue_id}
                        onChange={(e) => setVenue_id(e.target.value)}
                    />
                    {errors.location && (
                        <p className="text-destructive text-sm">{errors.location}</p>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="flex justify-between">
                  <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate('/')}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating…' : 'Create Event'}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>
        </main>
      </div>
  );
};

export default CreateEvent;
