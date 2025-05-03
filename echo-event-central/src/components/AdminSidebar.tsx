
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { User, LayoutDashboard, Calendar, Users, Settings } from 'lucide-react';

const AdminSidebar = () => {
  const location = useLocation();
  
  const isActive = (path: string) => {
    return location.pathname === path ? 'bg-sidebar-accent text-sidebar-accent-foreground' : '';
  };

  return (
    <div className="h-screen bg-[#0e3256] text-white w-60 flex flex-col">
      <div className="p-6 border-b border-[#1a477a] flex items-center justify-center">
        <User className="h-10 w-10" />
      </div>
      
      <nav className="flex flex-col p-2 space-y-1 flex-1">
        <Link 
          to="/admin" 
          className={`p-3 rounded-md flex items-center space-x-3 hover:bg-[#1a477a] transition-colors ${isActive('/admin')}`}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span>Dashboard</span>
        </Link>
        
        <Link 
          to="/admin/events" 
          className={`p-3 rounded-md flex items-center space-x-3 hover:bg-[#1a477a] transition-colors ${isActive('/admin/events')}`}
        >
          <Calendar className="h-5 w-5" />
          <span>Events</span>
        </Link>
        
        <Link 
          to="/admin/users" 
          className={`p-3 rounded-md flex items-center space-x-3 hover:bg-[#1a477a] transition-colors ${isActive('/admin/users')}`}
        >
          <Users className="h-5 w-5" />
          <span>Users</span>
        </Link>
        
        <Link 
          to="/admin/settings" 
          className={`p-3 rounded-md flex items-center space-x-3 hover:bg-[#1a477a] transition-colors ${isActive('/admin/settings')}`}
        >
          <Settings className="h-5 w-5" />
          <span>Settings</span>
        </Link>
      </nav>
    </div>
  );
};

export default AdminSidebar;
