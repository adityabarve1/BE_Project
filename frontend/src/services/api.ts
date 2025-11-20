import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || '';
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Key. Make sure to set environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// API Base URL
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8004/api/v1';

// ============================================================================
// Authentication functions using backend API
// ============================================================================

export const signIn = async (email: string, password: string) => {
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }
    
    const data = await response.json();
    
    // Store session in localStorage
    localStorage.setItem('accessToken', data.session.access_token);
    if (data.session.refresh_token) {
      localStorage.setItem('refreshToken', data.session.refresh_token);
    }
    
    return data;
  } catch (error: any) {
    throw new Error(error.message || 'Login failed');
  }
};

export const register = async (email: string, password: string, fullName: string, role: string = 'teacher') => {
  try {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email, 
        password, 
        full_name: fullName,
        role 
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }
    
    const data = await response.json();
    
    // Store session in localStorage
    if (data.session?.access_token) {
      localStorage.setItem('accessToken', data.session.access_token);
      if (data.session.refresh_token) {
        localStorage.setItem('refreshToken', data.session.refresh_token);
      }
    }
    
    return data;
  } catch (error: any) {
    throw new Error(error.message || 'Registration failed');
  }
};

export const signOut = async () => {
  try {
    const token = localStorage.getItem('accessToken');
    
    if (token) {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    }
    
    // Clear local storage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  } catch (error) {
    // Always clear local storage even if API call fails
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
};

export const getCurrentUser = async () => {
  try {
    const token = localStorage.getItem('accessToken');
    
    if (!token) {
      return null;
    }
    
    const response = await fetch(`${API_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      return null;
    }
    
    const user = await response.json();
    return user;
  } catch (error) {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    return null;
  }
};

// ============================================================================
// API functions for data fetching
// ============================================================================

// Generic API call with authorization
export const apiCall = async (
  endpoint: string, 
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
  body?: any,
  isFormData: boolean = false
) => {
  // Get token from localStorage
  const token = localStorage.getItem('accessToken');
  
  if (!token) {
    throw new Error('Not authenticated');
  }
  
  // Headers
  const headers: HeadersInit = {
    'Authorization': `Bearer ${token}`,
  };
  
  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  
  // Request options
  const options: RequestInit = {
    method,
    headers,
  };
  
  if (body) {
    if (isFormData) {
      options.body = body;
    } else {
      options.body = JSON.stringify(body);
    }
  }
  
  // Make the request
  const response = await fetch(`${API_URL}${endpoint}`, options);
  
  if (!response.ok) {
    const errorText = await response.text();
    try {
      const errorJson = JSON.parse(errorText);
      throw new Error(errorJson.detail || 'API request failed');
    } catch {
      throw new Error(errorText || `HTTP Error ${response.status}`);
    }
  }
  
  // Return JSON response or empty object if no content
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return await response.json();
  }
  
  return {};
};

// Specific API endpoints
export const getDashboardStats = async () => {
  return apiCall('/dashboard/stats');
};

export const getRecentPredictions = async () => {
  return apiCall('/dashboard/recent-predictions');
};

export const getHighRiskStudents = async () => {
  return apiCall('/dashboard/high-risk-students');
};

export const uploadDocument = async (formData: FormData, options?: any) => {
  return apiCall('/uploads', 'POST', formData, true);
};

export const getAllStudents = async () => {
  return apiCall('/students');
};

export const getStudentById = async (id: string) => {
  return apiCall(`/students/${id}`);
};

export const getStudentPredictions = async (id: string) => {
  return apiCall(`/predictions/student/${id}`);
};

export const getStudentAttendance = async (id: string) => {
  return apiCall(`/students/${id}/attendance`);
};

export const getStudentAcademic = async (id: string) => {
  return apiCall(`/students/${id}/academic`);
};

export const getStudentActivities = async (id: string) => {
  return apiCall(`/students/${id}/activities`);
};

export const createStudent = async (studentData: any) => {
  return apiCall('/students', 'POST', studentData);
};

// Export API service object with all the functions
export const apiService = {
  getDashboardStats,
  getRecentPredictions,
  getHighRiskStudents,
  uploadDocument,
  getAllStudents,
  getStudentById,
  getStudentPredictions,
  getStudentAttendance,
  getStudentAcademic,
  getStudentActivities,
  createStudent
};