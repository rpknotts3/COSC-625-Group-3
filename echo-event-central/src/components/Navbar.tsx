
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, PlusCircle, Calendar, UserCog } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Navbar = () => {
  const { user, logout, isAdmin, isProfessor } = useAuth();

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <Calendar className="h-6 w-6 text-[#0e3256]" />
            <span className="text-xl font-bold text-[#0e3256]">Campus Event Management System</span>
          </Link>
          
          <div className="flex items-center space-x-4">
            <Link to="/" className="font-medium text-[#0e3256]">
              Events
            </Link>
            
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
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-[#0e3256]"
                  >
                    Log in
                  </Button>
                </Link>
                <Link to="/register">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="text-[#0e3256]"
                  >
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
