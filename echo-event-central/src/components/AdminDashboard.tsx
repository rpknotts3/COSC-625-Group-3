
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';


interface DashboardStatsProps {
  totalEvents: number;
  upcomingEvents: number;
  registeredUsers: number;
}

interface EventRow {
  id: string;
  title: string;
  date: string;
  location: string;
  attendees: number;
  status: string;
}

interface AdminDashboardProps {
  stats: DashboardStatsProps;
  events: EventRow[];
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ stats }) => {


  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="bg-[#5b9bd5] text-white">
          <CardContent className="p-6">
            <div className="text-sm uppercase font-semibold mb-2">Total Events</div>
            <div className="text-4xl font-bold">{stats.totalEvents}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-[#5b9bd5] text-white">
          <CardContent className="p-6">
            <div className="text-sm uppercase font-semibold mb-2">Upcoming Events</div>
            <div className="text-4xl font-bold">{stats.upcomingEvents}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-[#5b9bd5] text-white">
          <CardContent className="p-6">
            <div className="text-sm uppercase font-semibold mb-2">Registered Users</div>
            <div className="text-4xl font-bold">{stats.registeredUsers}</div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
};

export default AdminDashboard;
