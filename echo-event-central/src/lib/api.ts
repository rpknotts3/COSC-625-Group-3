
import axios from 'axios';

// Base API URL - should be replaced with your actual API URL
const API_URL = 'https://api.echoeventcentral.com/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Auth API
export const authAPI = {
  login: (username: string, password: string) => 
    api.post('/auth/login', { username, password }),
  
  register: (username: string, password: string, role: string) => 
    api.post('/users', { username, password, role }),
};

// Events API
export const eventsAPI = {
  getEvents: () => 
    api.get('/events'),
  
  searchEvents: (params: { 
    keyword?: string, 
    location?: string, 
    status?: string,
    startDate?: string,
    endDate?: string
  }) => api.get('/events/search', { params }),
  
  createEvent: (eventData: {
    title: string,
    description: string,
    date: string,
    location: string
  }) => api.post('/events', eventData),
  
  approveEvent: (eventId: string) => 
    api.patch(`/events/${eventId}/approve`),
  
  rejectEvent: (eventId: string) => 
    api.patch(`/events/${eventId}/reject`),
  
  rsvpToEvent: (eventId: string) => 
    api.post(`/events/${eventId}/rsvp`),
  
  cancelRsvp: (eventId: string) => 
    api.delete(`/events/${eventId}/rsvp`),
};

// Helper to extract and decode JWT payload
export const decodeToken = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
};

export default api;
