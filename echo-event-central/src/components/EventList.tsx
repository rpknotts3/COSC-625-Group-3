
import React, { useState, useEffect } from 'react';
import { eventsAPI } from '@/lib/api';
import EventCard from './EventCard';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  status: string;
  rsvpCount: number;
  userRsvp: boolean;
}

interface EventListProps {
  searchParams?: {
    keyword?: string;
    location?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  };
}

const EventList: React.FC<EventListProps> = ({ searchParams }) => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      // For demo, we'll use mock data instead of API call
      const mockEvents = [
        {
          id: '1',
          title: 'Science Fair 2024',
          description: 'Annual science exhibition showcasing student projects from across departments. Join us for demonstrations, experiments, and innovation.',
          date: '2024-05-05T14:00:00',
          location: 'Building A, Room 102',
          status: 'approved',
          rsvpCount: 75,
          userRsvp: false
        },
        {
          id: '2',
          title: 'Annual Music Festival',
          description: 'A celebration of music featuring performances from our students, faculty, and special guest artists.',
          date: '2024-04-20T16:00:00',
          location: 'Campus Center Outdoor Stage',
          status: 'approved',
          rsvpCount: 230,
          userRsvp: true
        },
        {
          id: '3',
          title: 'Tech Innovation Conference',
          description: 'Learn about the latest technology trends and innovations from industry experts and academic leaders.',
          date: '2024-04-15T09:00:00',
          location: 'Engineering Building Convention Center',
          status: 'approved',
          rsvpCount: 120,
          userRsvp: false
        },
        {
          id: '6',
          title: 'International Food Festival',
          description: 'Experience cuisines from around the world prepared by our diverse student community.',
          date: '2024-05-12T12:00:00',
          location: 'Student Union Plaza',
          status: 'approved',
          rsvpCount: 185,
          userRsvp: false
        },
        {
          id: '7',
          title: 'Research Symposium',
          description: 'Undergraduate and graduate students present their research findings across various disciplines.',
          date: '2024-04-28T10:00:00',
          location: 'Science Center Auditorium',
          status: 'approved',
          rsvpCount: 60,
          userRsvp: false
        },
        {
          id: '8',
          title: 'Career Development Workshop',
          description: 'Gain valuable skills and insights for your future career through interactive sessions led by career counselors.',
          date: '2024-05-18T13:00:00',
          location: 'Business School, Room 305',
          status: 'approved',
          rsvpCount: 45,
          userRsvp: true
        }
      ];
      
      // Filter events based on search params if provided
      let filteredEvents = [...mockEvents];
      
      if (searchParams && Object.keys(searchParams).some(key => !!searchParams[key as keyof typeof searchParams])) {
        if (searchParams.keyword) {
          const keyword = searchParams.keyword.toLowerCase();
          filteredEvents = filteredEvents.filter(event => 
            event.title.toLowerCase().includes(keyword) || 
            event.description.toLowerCase().includes(keyword) ||
            event.location.toLowerCase().includes(keyword)
          );
        }
        
        if (searchParams.location) {
          const location = searchParams.location.toLowerCase();
          filteredEvents = filteredEvents.filter(event => 
            event.location.toLowerCase().includes(location)
          );
        }
        
        if (searchParams.startDate) {
          const startDate = new Date(searchParams.startDate);
          filteredEvents = filteredEvents.filter(event => 
            new Date(event.date) >= startDate
          );
        }
        
        if (searchParams.endDate) {
          const endDate = new Date(searchParams.endDate);
          filteredEvents = filteredEvents.filter(event => 
            new Date(event.date) <= endDate
          );
        }
      }
      
      setEvents(filteredEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, index) => (
          <div key={index} className="flex flex-col space-y-3">
            <Skeleton className="h-[250px] w-full rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-xl font-medium text-muted-foreground">No events found</h3>
        <p className="text-muted-foreground mt-2">Try adjusting your search criteria</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {events.map((event) => (
        <EventCard 
          key={event.id} 
          event={event} 
          onRsvpChange={fetchEvents} 
        />
      ))}
    </div>
  );
};

export default EventList;
