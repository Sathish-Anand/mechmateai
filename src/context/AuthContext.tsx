import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

interface UserProfile {
  id: string;
  name: string;
  phone: string | null;
  date_of_birth: string | null;
  plan_type: 'Basic' | 'Essential' | 'Performance' | 'Ultimate';
}

interface User extends UserProfile {
  email: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

interface RegisterData {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  password: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session ? 'User logged in' : 'No session');
      setSession(session);
      if (session) {
        fetchUserProfile(session.user);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session ? 'User logged in' : 'No session');
        setSession(session);
        if (session) {
          await fetchUserProfile(session.user);
        } else {
          setUser(null);
          setIsLoading(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email!,
          name: supabaseUser.user_metadata?.name || '',
          phone: null,
          date_of_birth: null,
          plan_type: 'Basic',
        });
      } else {
        setUser({
          ...profile,
          email: supabaseUser.email!,
        });
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.log('Login error:', error.message);
        // Check if it's invalid login credentials
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials and try again.');
        }
        throw error;
      }

      // User profile will be fetched automatically via onAuthStateChange
    } catch (error) {
      setIsLoading(false);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    setIsLoading(true);
    try {
      // Validate age BEFORE creating auth user (must be 16 or older)
      const birthDate = new Date(userData.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age = age - 1;
      }

      if (age < 16) {
        throw new Error('You must be at least 16 years old to register');
      }

      // Validate required fields
      if (!userData.name?.trim()) {
        throw new Error('Name is required');
      }
      if (!userData.email?.trim()) {
        throw new Error('Email is required');
      }
      if (!userData.phone?.trim()) {
        throw new Error('Phone number is required');
      }
      if (!userData.dateOfBirth?.trim()) {
        throw new Error('Date of birth is required');
      }
      if (!userData.password || userData.password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      // Only create auth user AFTER all validations pass
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email.trim(),
        password: userData.password,
        options: {
          data: {
            name: userData.name.trim(),
            phone: userData.phone.trim(),
            date_of_birth: userData.dateOfBirth,
          },
        },
      });

      if (authError) {
        throw authError;
      }

      console.log('Registration successful:', { user: authData.user?.id, session: !!authData.session });

      // If we got a session immediately (email verification disabled), set it and fetch profile
      if (authData.session && authData.user) {
        console.log('Registration successful, waiting for auto-navigation to home');
        setSession(authData.session);
        await fetchUserProfile(authData.user);
      }

      // Profile and usage records will be created automatically by the trigger
      // onAuthStateChange will also handle this, but we set it directly for immediate response
    } catch (error) {
      setIsLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error signing out:', error);
    }
    // User and session will be cleared automatically via onAuthStateChange
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'mechmateai://reset-password', // Deep link for mobile app
    });
    if (error) {
      throw error;
    }
  };

  const refreshUser = async () => {
    if (session?.user) {
      await fetchUserProfile(session.user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        isAuthenticated: !!session,
        login,
        register,
        logout,
        resetPassword,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};