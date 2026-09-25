// Centralized API base URL configuration for future FastAPI integration
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

// API configuration
export const API_CONFIG = {
  baseUrl: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
} as const;

// Flag to track whether we're using mock data or real API
export const USING_MOCK_DATA = !import.meta.env.VITE_API_BASE_URL;
