// Project: echo-event-central/src/contexts/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode
} from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authAPI, decodeToken } from '@/lib/api';

/* ------------------------------------------------------------------ */
/*  Types & Contracts                                                  */
/* ------------------------------------------------------------------ */

type Role = 'student' | 'organizer' | 'admin';

interface User {
  id: string;
  username: string;
  role: Role;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  /** e-mail + password because the backend expects `email` */
  login: (email: string, password: string) => Promise<void>;
  /**
   * Full registration contract required by the Express API:
   *  (full_name, email, password, role)
   */
  register: (
      fullName: string,
      email: string,
      password: string,
      role: Role
  ) => Promise<void>;
  logout: () => void;
  /* Role helpers */
  isAdmin: () => boolean;
  isProfessor: () => boolean;
  isStudent: () => boolean;
}

/* ------------------------------------------------------------------ */
/*  Context setup                                                      */
/* ------------------------------------------------------------------ */

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate             = useNavigate();

  /* -------------------------------------------------------------- */
  /*  1.   Hydrate user from localStorage on first load             */
  /* -------------------------------------------------------------- */
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      /* Hard-coded demo logins ----------------------------------- */
      if (token === 'admin-mock-token') {
        setUser({ id: 'admin-1', username: 'admin', role: 'admin' });
        setLoading(false);
        return;
      }
      if (token === 'student-mock-token') {
        setUser({ id: 'student-1', username: 'student', role: 'student' });
        setLoading(false);
        return;
      }
      if (token === 'faculty-mock-token') {
        /* faculty == organizer in the API vocabulary */
        setUser({ id: 'faculty-1', username: 'faculty', role: 'organizer' });
        setLoading(false);
        return;
      }

      /* Standard JWT path --------------------------------------- */
      const decoded = decodeToken(token);
      if (decoded && decoded.exp * 1000 > Date.now()) {
        setUser({
          id:       decoded.id,
          username: decoded.username,
          role:     decoded.role as Role
        });
      } else {
        /* Expired or bad token */
        localStorage.removeItem('token');
      }
    }
    setLoading(false);
  }, []);

  /* -------------------------------------------------------------- */
  /*  2.   Login                                                    */
  /* -------------------------------------------------------------- */
  const login = async (email: string, password: string) => {
    try {
      setLoading(true);

      /* Demo shortcuts ------------------------------------------ */
      if (email === 'admin' && password === 'admin123') {
        localStorage.setItem('token', 'admin-mock-token');
        setUser({ id: 'admin-1', username: 'admin', role: 'admin' });
        toast.success('Login successful!');
        navigate('/');
        return;
      }
      if (email === 'student' && password === 'student123') {
        localStorage.setItem('token', 'student-mock-token');
        setUser({ id: 'student-1', username: 'student', role: 'student' });
        toast.success('Login successful!');
        navigate('/');
        return;
      }
      if (email === 'faculty' && password === 'faculty123') {
        localStorage.setItem('token', 'faculty-mock-token');
        setUser({ id: 'faculty-1', username: 'faculty', role: 'organizer' });
        toast.success('Login successful!');
        navigate('/');
        return;
      }

      /* Real API call ------------------------------------------- */
      const { data } = await authAPI.login(email, password);
      localStorage.setItem('token', data.token);

      const decoded = decodeToken(data.token);
      setUser({
        id:       decoded.id,
        username: decoded.username,
        role:     decoded.role as Role
      });

      toast.success('Login successful!');
      navigate('/');
    } catch (err) {
      toast.error('Login failed. Please check your credentials.');
      console.error('Login error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------------------------------------------- */
  /*  3.   Register                                                 */
  /* -------------------------------------------------------------- */
  const register = async (
      fullName: string,
      email: string,
      password: string,
      role: Role
  ) => {
    try {
      setLoading(true);
      await authAPI.register(fullName, email, password, role);
      toast.success('Registration successful! Please login.');
      navigate('/login');
    } catch (err) {
      toast.error('Registration failed. Please try again.');
      console.error('Register error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /* -------------------------------------------------------------- */
  /*  4.   Logout                                                   */
  /* -------------------------------------------------------------- */
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    toast.success('Logged out successfully');
    navigate('/login');
  };

  /* -------------------------------------------------------------- */
  /*  5.   Role helpers                                             */
  /* -------------------------------------------------------------- */
  const isAdmin     = () => user?.role === 'admin';
  const isProfessor = () => user?.role === 'organizer';
  const isStudent   = () => user?.role === 'student';

  /* -------------------------------------------------------------- */
  /*  6.   Provider export                                          */
  /* -------------------------------------------------------------- */
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

/* ------------------------------------------------------------------ */
/*  7.   Hook                                                         */
/* ------------------------------------------------------------------ */

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
