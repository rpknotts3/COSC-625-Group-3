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
  /* ─── auth guard ─── */
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

  /* ─── local state ─── */
  const [eventName, setEventName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [date, setDate] = React.useState<Date | undefined>();
  const [time, setTime] = React.useState('');   // HH:mm
  const [venue, setVenue] = React.useState(''); // <─ plain-text location
  const [priority, setPriority] = React.useState<'normal'|'low'|'high'|'mandatory'>('normal');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  /* ─── validation ─── */
  const validate = () => {
    const e: Record<string, string> = {};
    if (!eventName.trim()) e.eventName = 'Title is required';
    if (!description.trim()) e.description = 'Description is required';
    if (!date) e.date = 'Date is required';
    if (!time.trim()) e.time = 'Time is required';
    if (!venue.trim()) e.location = 'Location is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ─── submit ─── */
  const handleSubmit = async (evt: React.FormEvent) => {
    evt.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await eventsAPI.createEvent({
        event_name: eventName,
        description,
        event_date: date!.toISOString(),
        event_time: time,  // "HH:mm"
        venue,             // <─ send correct key
        priority,
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

  /* ─── render ─── */
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
                  {/* title */}
                  <div className="space-y-2">
                    <Label htmlFor="eventName">Event Title</Label>
                    <Input
                        id="eventName"
                        value={eventName}
                        onChange={(e) => setEventName(e.target.value)}
                        placeholder="Enter event title"
                    />
                    {errors.eventName && (
                        <p className="text-destructive text-sm">{errors.eventName}</p>
                    )}
                  </div>

                  {/* description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Event Description</Label>
                    <Textarea
                        id="description"
                        rows={4}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Describe your event"
                    />
                    {errors.description && (
                        <p className="text-destructive text-sm">{errors.description}</p>
                    )}
                  </div>

                  {/* date */}
                  <div className="space-y-2">
                    <Label>Event Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {date ? format(date, 'PPP') : 'Select a date'}
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

                  {/* time */}
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

                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <select
                        id="priority"
                        className="w-full border rounded px-2 py-1"
                        value={priority}
                        onChange={e => setPriority(e.target.value as any)}
                    >
                      <option value="normal">Normal</option>
                      <option value="low">Low</option>
                      <option value="high">High</option>
                      <option value="mandatory">Mandatory</option>
                    </select>
                  </div>

                  {/* venue */}
                  <div className="space-y-2">
                    <Label htmlFor="venue">Event Location</Label>
                    <Input
                        id="venue"
                        value={venue}
                        onChange={(e) => setVenue(e.target.value)}
                        placeholder="Enter event location"
                    />
                    {errors.location && (
                        <p className="text-destructive text-sm">{errors.location}</p>
                    )}
                  </div>
                </CardContent>

                <CardFooter className="flex justify-between">
                  <Button type="button" variant="outline" onClick={() => navigate('/')}>
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
