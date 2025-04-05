// API URL for Django backend
export const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000/api';

// User types
export const USER_TYPES = {
  LANDLORD: 'LANDLORD',
  TENANT: 'TENANT',
};