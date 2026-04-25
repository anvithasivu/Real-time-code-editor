import axios from 'axios';
import { io } from 'socket.io-client';

// The VITE_API_URL should be set in Vercel environment variables
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: BASE_URL,
});

// Helper to get auth headers
export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return { headers: { Authorization: `Bearer ${token}` } };
};

// Central Socket factory
export const getSocket = () => {
  const token = localStorage.getItem('token');
  return io(BASE_URL, { auth: { token } });
};

export default BASE_URL;
