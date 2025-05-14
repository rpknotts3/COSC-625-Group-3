// src/components/Navbar.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Bell } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';

/* small red dot */
const Dot = () => (
    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500" />
);

const Navbar: React.FC = () => {
  const { user, logout, isAdmin, isProfessor } = useAuth();
  const { unreadCount, list, markAllRead }   = useNotifications();   // ← NEW

  return (
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* logo + brand */}
            <Link to="/" className="flex items-center space-x-2">
              <Calendar className="h-6 w-6 text-[#0e3256]" />
              <span className="text-xl font-bold text-[#0e3256]">
              College Event Management System
            </span>
            </Link>

            {/* right-hand nav */}
            <div className="flex items-center space-x-4">
              <Link to="/" className="font-medium text-[#0e3256]">Events</Link>

              {(isProfessor() || isAdmin()) && (
                  <Link to="/create-event" className="font-medium text-[#0e3256]">
                    Create Event
                  </Link>
              )}

              {isAdmin() && (
                  <Link to="/admin" className="font-medium text-[#0e3256]">
                    Admin Panel
                  </Link>
              )}

              {/* notification bell */}
              <div className="relative group">
                <Button
                    variant="ghost"
                    size="icon"
                    className="text-[#0e3256] hover:bg-transparent"
                    onClick={markAllRead}
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && <Dot />}
                </Button>

                {/* basic dropdown list (hover on desktop, tap on mobile) */}
                <div
                    className="absolute right-0 mt-2 w-72 max-h-64 overflow-y-auto rounded-md
                           bg-white shadow-lg ring-1 ring-black/5 opacity-0 group-hover:opacity-100
                           transition pointer-events-none group-hover:pointer-events-auto"
                >
                  {list.length === 0 ? (
                      <p className="p-4 text-sm text-muted-foreground">No notifications</p>
                  ) : (
                      <ul>
                        {list.map(n => (
                            <li key={n._id} className="border-b last:border-0 p-4 text-sm">
                              {n.message}
                            </li>
                        ))}
                      </ul>
                  )}
                </div>
              </div>

              {/* user / auth buttons */}
              {user ? (
                  <div className="flex items-center space-x-2">
                <span className="text-sm text-[#0e3256]">
                  {user.username} ({user.role})
                </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={logout}
                        className="text-[#0e3256]"
                    >
                      Log out
                    </Button>
                  </div>
              ) : (
                  <div className="flex items-center space-x-2">
                    <Link to="/login">
                      <Button variant="ghost" size="sm" className="text-[#0e3256]">
                        Log in
                      </Button>
                    </Link>
                    <Link to="/register">
                      <Button variant="outline" size="sm" className="text-[#0e3256]">
                        Sign up
                      </Button>
                    </Link>
                  </div>
              )}
            </div>
          </div>
        </div>
      </nav>
  );
};

export default Navbar;
