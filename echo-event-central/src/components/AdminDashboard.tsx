
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

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

const AdminDashboard: React.FC<AdminDashboardProps> = ({ stats, events }) => {
  // Prepare data for the bar chart
  const chartData = events.map(event => ({
    name: event.title.length > 15 ? event.title.substring(0, 15) + '...' : event.title,
    attendees: event.attendees
  }));

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
      
      {/* Event Attendance Chart (from mockup) */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold mb-4">Event Attendance</h2>
        <Card>
          <CardContent className="p-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="attendees" fill="#5b9bd5" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div>
        <h2 className="text-xl font-semibold mb-4">Manage Events</h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead>EVENT</TableHead>
                  <TableHead>DATE</TableHead>
                  <TableHead>LOCATION</TableHead>
                  <TableHead>ATTENDEES</TableHead>
                  <TableHead>STATUS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell className="font-medium">{event.title}</TableCell>
                    <TableCell>{event.date}</TableCell>
                    <TableCell>{event.location}</TableCell>
                    <TableCell>{event.attendees}</TableCell>
                    <TableCell>
                      <Badge variant={event.status === 'Published' ? 'default' : 'destructive'}>
                        {event.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;
