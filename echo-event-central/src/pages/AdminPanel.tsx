import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useAuth } from '@/contexts/AuthContext';
import { eventsAPI } from '@/lib/api';

import AdminSidebar from '@/components/AdminSidebar';
import AdminDashboard from '@/components/AdminDashboard';
import { Button } from '@/components/ui/button';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
interface EventRow {
  _id: string;
  event_name: string;
  event_date: string;
  event_time: string;
  venue: string;
  priority?: 'normal' | 'low' | 'high' | 'mandatory';
  status: 'pending' | 'approved' | 'rejected';
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
const AdminPanel: React.FC = () => {
  /* ───────────── Auth guard ───────────── */
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  /* ───────────── Local state ──────────── */
  const [isLoading, setIsLoading]   = useState(true);
  const [pending, setPending]       = useState<EventRow[]>([]);
  const [allEvents, setAllEvents]   = useState<EventRow[]>([]);
  const [busyId, setBusyId]         = useState<string | null>(null); // button disable

  /* ───────────── Data loader ──────────── */
  const loadData = useCallback(async () => {
    try {
      /* 1. pending only (table) */
      const { data: pend } = await eventsAPI.searchEvents({ status: 'pending' });
      setPending(pend);

      /* 2. every event (dashboard stats) */
      const { data: all } = await eventsAPI.searchEvents({});
      setAllEvents(all);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load admin data.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /* ───────────── Approve / Reject ─────── */
  const handleApprove = async (id: string) => {
    try {
      setBusyId(id);
      await eventsAPI.approveEvent(id);
      toast.success('Event approved.');
      await loadData();
    } catch {
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
      await loadData();
    } catch {
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
    loadData();
  }, [user, isAdmin, navigate, loadData]);

  /* ───────────── Stats for dashboard ──── */
  const stats = useMemo(() => {
    const totalEvents    = allEvents.length;
    const upcomingEvents = allEvents.filter(
        e => new Date(e.event_date) > new Date()
    ).length;

    /* registeredUsers = 0  (placeholder, until a user-count endpoint exists) */
    return { totalEvents, upcomingEvents, registeredUsers: 0 };
  }, [allEvents]);

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
          {/* Dashboard headline cards */}
          <AdminDashboard stats={stats} events={[]} />

          {/* Pending-events table */}
          <section>
            <h2 className="text-xl font-semibold mb-4">Pending Events</h2>

            {pending.length === 0 ? (
                <p className="text-muted-foreground">No pending events 🎉</p>
            ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="border-b">
                    <tr className="text-left">
                      <th className="py-2 pr-4 font-medium">Title</th>
                      <th className="py-2 pr-4 font-medium">Date</th>
                      <th className="py-2 pr-4 font-medium">Time</th>
                      <th className="py-2 pr-4 font-medium">Venue</th>
                      <th className="py-2 pr-4 font-medium">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {pending.map(e => (
                        <tr key={e._id} className="border-b last:border-0">
                          <td className="py-2 pr-4">{e.event_name}</td>
                          <td className="py-2 pr-4">
                            {new Date(e.event_date).toLocaleDateString()}
                          </td>
                          <td className="py-2 pr-4">{e.event_time}</td>
                          <td className="py-2 pr-4">{e.venue}</td>
                          <td className="py-2 pr-4 space-x-2">
                            <Button
                                size="sm"
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
