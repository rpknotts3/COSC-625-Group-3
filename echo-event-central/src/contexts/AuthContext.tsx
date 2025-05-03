// Project: echo-event-central/src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authAPI, decodeToken } from '@/lib/api';

// Types
interface User {
  id: string;
  username: string;
  role: 'student' | 'professor' | 'admin';
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string, role: string) => Promise<void>;
  logout: () => void;
  isAdmin: () => boolean;
  isProfessor: () => boolean;
  isStudent: () => boolean;
}

// Create context
const AuthContext = createContext<AuthContextType | null>(null);

// Provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Check for existing token on load
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      // Handle hardcoded admin token
      if (token === 'admin-mock-token') {
        setUser({
          id: 'admin-1',
          username: 'admin',
          role: 'admin'
        });
        setLoading(false);
        return;
      }
      
      // Handle hardcoded student token
      if (token === 'student-mock-token') {
        setUser({
          id: 'student-1',
          username: 'student',
          role: 'student'
        });
        setLoading(false);
        return;
      }
      
      // Handle hardcoded professor token
      if (token === 'faculty-mock-token') {
        setUser({
          id: 'faculty-1',
          username: 'faculty',
          role: 'professor'
        });
        setLoading(false);
        return;
      }

      const decodedToken = decodeToken(token);
      if (decodedToken && decodedToken.exp * 1000 > Date.now()) {
        setUser({
          id: decodedToken.id,
          username: decodedToken.username,
          role: decodedToken.role
        });
      } else {
        // Token expired
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  // Login function
  const login = async (username: string, password: string) => {
    try {
      setLoading(true);
      
      // Mock login for demo users
      if (username === 'admin' && password === 'admin123') {
        localStorage.setItem('token', 'admin-mock-token');
        setUser({
          id: 'admin-1',
          username: 'admin',
          role: 'admin'
        });
        toast.success('Login successful!');
        navigate('/');
        return;
      }
      
      if (username === 'student' && password === 'student123') {
        localStorage.setItem('token', 'student-mock-token');
        setUser({
          id: 'student-1',
          username: 'student',
          role: 'student'
        });
        toast.success('Login successful!');
        navigate('/');
        return;
      }
      
      if (username === 'faculty' && password === 'faculty123') {
        localStorage.setItem('token', 'faculty-mock-token');
        setUser({
          id: 'faculty-1',
          username: 'faculty',
          role: 'professor'
        });
        toast.success('Login successful!');
        navigate('/');
        return;
      }
      
      const response = await authAPI.login(username, password);
      const { token } = response.data;
      
      localStorage.setItem('token', token);
      
      const decodedToken = decodeToken(token);
      setUser({
        id: decodedToken.id,
        username: decodedToken.username,
        role: decodedToken.role
      });
      
      toast.success('Login successful!');
      navigate('/');
    } catch (error) {
      toast.error('Login failed. Please check your credentials.');
      console.error('Login error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (username: string, password: string, role: string) => {
    try {
      setLoading(true);
      await authAPI.register(username, password, role);
      toast.success('Registration successful! Please login.');
      navigate('/login');
    } catch (error) {
      toast.error('Registration failed. Please try again.');
      console.error('Register error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    toast.success('Logged out successfully');
    navigate('/login');
  };

  // Role checking helpers
  const isAdmin = () => user?.role === 'admin';
  const isProfessor = () => user?.role === 'professor';
  const isStudent = () => user?.role === 'student';

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        loading, 
        login, 
        register, 
        logout,
        isAdmin,
        isProfessor,
        isStudent
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
