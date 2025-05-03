
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AdminSidebar from '@/components/AdminSidebar';
import AdminDashboard from '@/components/AdminDashboard';
import { toast } from 'sonner';

const AdminPanel = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  
  // Mock data for dashboard based on the uploaded pictures
  const stats = {
    totalEvents: 135,
    upcomingEvents: 12,
    registeredUsers: 2508
  };
  
  const events = [
    {
      id: '1',
      title: 'Science Fair 2024',
      date: 'May 5, 2024',
      location: 'Building A, Room 102',
      attendees: 150,
      status: 'Published'
    },
    {
      id: '2',
      title: 'Annual Music Festival',
      date: 'April 20, 2024',
      location: 'Campus Center Outdoor Stage',
      attendees: 500,
      status: 'Published'
    },
    {
      id: '3',
      title: 'Tech Innovation Conference',
      date: 'April 15, 2024',
      location: 'Engineering Building Convention Center',
      attendees: 325,
      status: 'Published'
    },
    {
      id: '4',
      title: 'Student Art Exhibition',
      date: 'March 30, 2024',
      location: 'Fine Arts Gallery',
      attendees: 210,
      status: 'Canceled'
    },
    {
      id: '5',
      title: 'Spring Career Fair',
      date: 'March 10, 2024',
      location: 'Student Union Grand Hall',
      attendees: 185,
      status: 'Published'
    },
    {
      id: '6',
      title: 'International Food Festival',
      date: 'May 12, 2024',
      location: 'Student Union Plaza',
      attendees: 400,
      status: 'Published'
    },
    {
      id: '7',
      title: 'Research Symposium',
      date: 'April 28, 2024',
      location: 'Science Center Auditorium',
      attendees: 120,
      status: 'Published'
    }
  ];

  useEffect(() => {
    // Check if the user is an admin
    if (!user) {
      navigate('/login');
      toast.error('You must be logged in to access the admin panel');
      return;
    }

    if (!isAdmin()) {
      navigate('/');
      toast.error('You do not have permission to access the admin panel');
      return;
    }

    setIsLoading(false);
  }, [user, isAdmin, navigate]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <AdminDashboard stats={stats} events={events} />
      </main>
    </div>
  );
};

export default AdminPanel;
