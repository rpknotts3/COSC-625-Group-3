// src/components/EventList.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { eventsAPI, registrationsAPI } from '@/lib/api';
import EventCard from './EventCard';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;     // ISO string
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
  const [events, setEvents]   = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  /* ----------------------------- Fetch from API ------------------------------ */
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      /* 1. all approved events */
      const { data: raw } = await eventsAPI.getEvents();

      /* 2. student’s existing registrations (may 401 if not student) */
      let registered = new Set<string>();
      try {
        const { data } = await registrationsAPI.myRegistrations(); // ['id','id',…]
        registered = new Set(data);
      } catch {
        /* not logged in or not student – ignore */
      }

      /* 3. map backend → card shape */
      const rows: Event[] = raw.map((e: any) => ({
        id:          e._id,
        title:       e.event_name,
        description: e.description,
        date:        e.event_date,
        location:    e.location,
        status:      e.status,
        rsvpCount:   e.rsvp_count ?? 0,
        userRsvp:    registered.has(e._id),
      }));

      /* 4. client-side filtering (same as before) */
      let filtered = [...rows];

      if (searchParams && Object.values(searchParams).some(Boolean)) {
        if (searchParams.keyword) {
          const kw = searchParams.keyword.toLowerCase();
          filtered = filtered.filter(ev =>
              ev.title.toLowerCase().includes(kw) ||
              ev.description.toLowerCase().includes(kw) ||
              ev.location.toLowerCase().includes(kw)
          );
        }
        if (searchParams.location) {
          const loc = searchParams.location.toLowerCase();
          filtered = filtered.filter(ev =>
              ev.location.toLowerCase().includes(loc)
          );
        }
        if (searchParams.startDate) {
          const s = new Date(searchParams.startDate);
          filtered = filtered.filter(ev => new Date(ev.date) >= s);
        }
        if (searchParams.endDate) {
          const ed = new Date(searchParams.endDate);
          filtered = filtered.filter(ev => new Date(ev.date) <= ed);
        }
      }

      setEvents(filtered);
    } catch (err) {
      console.error('Error fetching events:', err);
      toast.error('Failed to load events. Please try again later.');
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  /* refetch on mount & whenever search params change */
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  /* ------------------------------ UI states ---------------------------------- */
  if (loading) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col space-y-3">
                <Skeleton className="h-[250px] w-full rounded-xl" />
              </div>
          ))}
        </div>
    );
  }

  if (events.length === 0) {
    return (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium text-muted-foreground">
            No events found
          </h3>
          <p className="text-muted-foreground mt-2">
            Try adjusting your search criteria
          </p>
        </div>
    );
  }

  /* -------------------------------- Render ----------------------------------- */
  return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map(ev => (
            <EventCard key={ev.id} event={ev} onRsvpChange={fetchEvents} />
        ))}
      </div>
  );
};

export default EventList;
