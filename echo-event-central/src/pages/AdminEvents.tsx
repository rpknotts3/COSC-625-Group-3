import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { eventsAPI } from '@/lib/api';
import { toast } from 'sonner';
import EventCard from '@/components/EventCard';
import { Button } from '@/components/ui/button';

interface EventRow {
    _id: string;
    event_name: string;
    description: string;
    event_date: string;
    event_time: string;
    venue: string;
    priority: 'normal' | 'low' | 'high' | 'mandatory';
    status: 'pending' | 'approved' | 'rejected';
    rsvp_count?: number;
}

const AdminEvents: React.FC = () => {
    const { user, isAdmin } = useAuth();
    const navigate = useNavigate();
    const [events, setEvents] = useState<EventRow[]>([]);

    useEffect(() => {
        if (!user || !isAdmin()) {
            toast.error('Admin access required');
            navigate('/');
            return;
        }
        eventsAPI.getAllEvents()
            .then(({ data }) => setEvents(data))
            .catch(() => toast.error('Failed to load events'));
    }, [user, isAdmin, navigate]);

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-semibold">All Events</h1>
                <Button variant="outline" onClick={() => navigate('/admin')}>
                    Back to Dashboard
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map(ev => (
                    <Link
                        key={ev._id}
                        to={`/admin/events/${ev._id}`}
                        state={{ event: ev }}
                    >
                        <EventCard
                            event={{
                                id: ev._id,
                                title: ev.event_name,
                                description: ev.description,
                                date: ev.event_date,
                                time: ev.event_time,
                                venue: ev.venue,
                                status: ev.status,
                                priority: ev.priority,
                                rsvpCount: ev.rsvp_count ?? 0,
                                userRsvp: false,
                            }}
                            onRsvpChange={() => {}}
                        />
                    </Link>
                ))}
            </div>
        </div>
    );
};

export default AdminEvents;
