import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import { eventsAPI } from '@/lib/api';

import AdminSidebar from '@/components/AdminSidebar';
import AdminDashboard from '@/components/AdminDashboard';
import { Button } from '@/components/ui/button';

interface EventRow {
  _id: string;
  event_name: string;
  event_date: string;   // ISO
  event_time: string;
  location: string;
  attendees?: number;
  status: 'pending' | 'approved' | 'rejected';
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

const AdminPanel = () => {
  /* ───────────── Auth guard ───────────── */
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  /* ───────────── Local state ──────────── */
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents]       = useState<EventRow[]>([]);
  const [busyId, setBusyId]       = useState<string | null>(null); // button disable

  /* ───────────── CRUD helpers ─────────── */

  const loadPendingEvents = useCallback(async () => {
    try {
      const { data } = await eventsAPI.searchEvents({ status: 'pending' });
      setEvents(data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load pending events.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleApprove = async (id: string) => {
    try {
      setBusyId(id);
      await eventsAPI.approveEvent(id);
      toast.success('Event approved.');
      await loadPendingEvents();
    } catch (err) {
      console.error(err);
      toast.error('Approval failed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id: string) => {
    try {
      setBusyId(id);
      await eventsAPI.rejectEvent(id);
      toast.success('Event rejected.');
      await loadPendingEvents();
    } catch (err) {
      console.error(err);
      toast.error('Rejection failed.');
    } finally {
      setBusyId(null);
    }
  };

  /* ───────────── On mount ─────────────── */
  useEffect(() => {
    if (!user) {
      toast.error('You must be logged in to access the admin panel');
      navigate('/login');
      return;
    }
    if (!isAdmin()) {
      toast.error('You do not have permission to access the admin panel');
      navigate('/');
      return;
    }
    loadPendingEvents();
  }, [user, isAdmin, navigate, loadPendingEvents]);

  /* ───────────── Stats for dashboard ──── */
  const stats = useMemo(() => {
    const totalEvents    = events.length;
    const upcomingEvents = events.filter(
        (e) => new Date(e.event_date) > new Date()
    ).length;
    return { totalEvents, upcomingEvents, registeredUsers: 0 };
  }, [events]);

  /* ───────────── Loading state ────────── */
  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
    );
  }

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */
  return (
      <div className="flex h-screen bg-background">
        <AdminSidebar />

        <main className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Headline cards etc. */}
          <AdminDashboard stats={stats} events={[]} />

          {/* Pending-events table */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Pending Events</h2>

            {events.length === 0 ? (
                <p className="text-muted-foreground">No pending events 🎉</p>
            ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                    <tr className="text-left">
                      <th className="py-2 pr-4 font-medium">Title</th>
                      <th className="py-2 pr-4 font-medium">Date</th>
                      <th className="py-2 pr-4 font-medium">Time</th>
                      <th className="py-2 pr-4 font-medium">Location</th>
                      <th className="py-2 pr-4 font-medium">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {events.map((e) => (
                        <tr key={e._id} className="border-b last:border-0">
                          <td className="py-2 pr-4">{e.event_name}</td>
                          <td className="py-2 pr-4">
                            {new Date(e.event_date).toLocaleDateString()}
                          </td>
                          <td className="py-2 pr-4">{e.event_time}</td>
                          <td className="py-2 pr-4">{e.location}</td>
                          <td className="py-2 pr-4 space-x-2">
                            <Button
                                size="sm"
                                variant="default"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                disabled={busyId === e._id}
                                onClick={() => handleApprove(e._id)}
                            >
                              Approve
                            </Button>
                            <Button
                                size="sm"
                                variant="destructive"
                                disabled={busyId === e._id}
                                onClick={() => handleReject(e._id)}
                            >
                              Reject
                            </Button>
                          </td>
                        </tr>
                    ))}
                    </tbody>
                  </table>
                </div>
            )}
          </section>
        </main>
      </div>
  );
};

export default AdminPanel;
