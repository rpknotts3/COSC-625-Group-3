
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import EventList from '@/components/EventList';
import EventSearch from '@/components/EventSearch';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';

interface SearchParams {
  keyword?: string;
  location?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
}

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useState<SearchParams>({});

  const handleSearch = (params: SearchParams) => {
    setSearchParams(params);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        {user ? (
          <>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold">CEMS Events</h1>
                <p className="text-muted-foreground">
                  Browse and manage campus events
                </p>
              </div>
            </div>
            
            <EventSearch onSearch={handleSearch} />
            <EventList searchParams={searchParams} />
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-lg shadow-sm p-8 max-w-4xl mx-auto mt-8">
            <div className="h-20 w-20 bg-primary rounded-full flex items-center justify-center mb-6">
              <Calendar className="h-10 w-10 text-primary-foreground" />
            </div>
            
            <h1 className="text-4xl font-bold mb-4 text-[#0e3256]">Welcome to the Campus Event Management System</h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl">
              Plan and manage campus events with ease. Discover upcoming events and stay organized.
            </p>
            
            <div className="flex space-x-4">
              <Button 
                size="lg" 
                className="bg-[#3366cc] hover:bg-[#254e9c]"
                onClick={() => navigate('/login')}
              >
                Sign In
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => navigate('/register')}
              >
                Register
              </Button>
            </div>
          </div>
        )}
      </main>
      
      <footer className="bg-muted py-6">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} CEMS - College Event Management System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
