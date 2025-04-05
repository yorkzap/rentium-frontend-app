'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type User = {
  email: string;
  id?: string;
  name?: string;
  user_type?: string;
};

type AuthContextType = {
  token: string | null;
  user: User | null;
  login: (token: string, email: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Add loading state
  
  // Get the Django API URL from environment variables, with fallback
  const DJANGO_API_URL = process.env.NEXT_PUBLIC_DJANGO_API_URL || 'http://localhost:8000/api';
  
  // Initialize on mount - client side only
  useEffect(() => {
    console.log("AuthProvider initializing...");
    // Check for token in localStorage
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken) {
      console.log("Found stored token, setting it");
      setToken(storedToken);
      
      // Set a basic user object even if API fails
      const storedEmail = localStorage.getItem('auth_email');
      if (storedEmail) {
        setUser({ email: storedEmail });
      }
      
      // Fetch user info if we have a token
      fetchUserInfo(storedToken);
    } else {
      console.log("No stored token found");
      setLoading(false); // No token, so we're not loading
    }
  }, []);
  
  // Fetch user info when we have a token
  const fetchUserInfo = async (currentToken: string) => {
    try {
      console.log("Fetching user info...");
      // Try the /api/user/me/ endpoint first (corrected from /api/users/me/)
      let response = await fetch(`${DJANGO_API_URL}/user/me/`, {
        headers: {
          'Authorization': `Token ${currentToken}`,
        },
      });
      
      // If 404, try a fallback endpoint
      if (response.status === 404) {
        console.log("User info endpoint not found, trying fallback...");
        response = await fetch(`${DJANGO_API_URL}/user/profile/`, {
          headers: {
            'Authorization': `Token ${currentToken}`,
          },
        });
      }
      
      if (response.ok) {
        const userData = await response.json();
        console.log("User data fetched successfully:", userData);
        setUser(userData);
      } else if (response.status === 404) {
        // If both endpoints 404, just keep the basic user info
        console.log("Both user endpoints failed, keeping basic user info");
        // We don't logout here - just keep the token-based authentication
      } else if (response.status === 401) {
        // Unauthorized - token is invalid
        console.error('Token is invalid, logging out');
        logout();
      } else {
        console.warn('User info fetch returned non-404 error:', response.status);
        // Don't logout on other errors, just keep the token
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Don't logout on network errors, just keep the token
    } finally {
      setLoading(false);
    }
  };
  
  // Login function
  const login = async (newToken: string, email: string) => {
    console.log("Login function called with token and email:", newToken, email);
    
    // Set token in state and localStorage
    setToken(newToken);
    localStorage.setItem('auth_token', newToken);
    
    // Save email to localStorage as fallback
    localStorage.setItem('auth_email', email);
    
    // Set basic user info until we fetch the full profile
    setUser({ email });
    
    try {
      // Fetch user details
      await fetchUserInfo(newToken);
      console.log("Fetch user info complete after login");
      return true;
    } catch (error) {
      console.error("Error during login user fetch:", error);
      // Don't fail the login if user fetch fails
      setLoading(false);
      return true;
    }
  };
  
  // Logout function
  const logout = () => {
    console.log("Logging out, clearing auth state");
    // Clear token from state and localStorage
    setToken(null);
    setUser(null);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_email');
    
    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login';
    }
  };
  
  const isAuthenticated = !!token;
  
  const value = {
    token,
    user,
    login,
    logout,
    isAuthenticated,
    loading
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}