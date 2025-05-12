// src/lib/api.ts
import axios from 'axios';

const API_URL = 'http://localhost:3000/api'; // Updated to local dev backend

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

export const authAPI = {
  login: (email: string, password: string) => 
    api.post('/auth/login', { email, password }),

  register: (full_name: string, email: string, password: string, role: string) => 
    api.post('/users', { full_name, email, password, role }),
};

export const eventsAPI = {
  getEvents: () => api.get('/events'),

  searchEvents: (params: {
    keyword?: string,
    location?: string,
    status?: string,
    startDate?: string,
    endDate?: string
  }) => api.get('/events/search', { params }),

  createEvent: (data: {
    event_name: string;
    description: string;
    event_date: string;
    event_time: string;
    venue: string;
  }) => api.post('/events', data),


  approveEvent: (eventId: string) => api.patch(`/events/${eventId}/approve`),
  rejectEvent:  (eventId: string) => api.patch(`/events/${eventId}/reject`),
  rsvpToEvent:  (eventId: string) => api.post(`/events/${eventId}/registrations`),
  cancelRsvp:   (eventId: string) => api.delete(`/events/${eventId}/registrations`),
};

export const registrationsAPI = {
  myRegistrations: () => api.get<string[]>('/registrations/mine'),
  countForEvent:   (eventId: string) =>
      api.get<{ count: number }>(`/events/${eventId}/registrations/count`),
};

export const decodeToken = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c =>
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
};

export default api;