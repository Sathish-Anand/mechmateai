import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY');
}

// Check if local function URL is configured for development
const edgeFunctionUrl = process.env.EXPO_PUBLIC_EDGE_FUNCTION_URL; // Use production functions by default

console.log('Supabase config:', {
  url: supabaseUrl,
  anonKeyPrefix: supabaseAnonKey.slice(0, 8),
  anonKeyLength: supabaseAnonKey.length,
  edgeFunctionUrl: edgeFunctionUrl || 'Using production functions',
});

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  // PRODUCTION MODE: Always use production functions (no local redirection)
});

// Database Types
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          phone: string | null;
          date_of_birth: string | null;
          plan_type: 'Basic' | 'Essential' | 'Performance' | 'Ultimate';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          phone?: string | null;
          date_of_birth?: string | null;
          plan_type?: 'Basic' | 'Essential' | 'Performance' | 'Ultimate';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          phone?: string | null;
          date_of_birth?: string | null;
          plan_type?: 'Basic' | 'Essential' | 'Performance' | 'Ultimate';
          updated_at?: string;
        };
      };
      vehicles: {
        Row: {
          id: string;
          user_id: string;
          make: string;
          model: string;
          year: number;
          variant: string | null;
          vehicle_type: 'Car' | 'SUV' | 'Truck' | 'Motorcycle' | 'Van' | 'Hatchback' | 'Sedan' | 'Coupe' | 'Wagon' | 'Convertible' | 'Minivan' | 'Pickup';
          engine: 'Petrol' | 'Diesel' | 'Electric' | 'Hybrid' | 'Plug-in Hybrid' | 'CNG' | 'LPG' | 'Hydrogen';
          transmission: 'Manual' | 'Automatic' | 'CVT' | 'Semi-Automatic' | 'Dual-Clutch' | null;
          fuel_capacity: number | null;
          engine_size: string | null;
          drivetrain: 'FWD' | 'RWD' | 'AWD' | '4WD' | 'Front-Wheel Drive' | 'Rear-Wheel Drive' | 'All-Wheel Drive' | '4-Wheel Drive' | null;
          registration: string;
          odometer: number;
          last_service_date: string | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          make: string;
          model: string;
          year: number;
          variant?: string | null;
          vehicle_type?: 'Car' | 'SUV' | 'Truck' | 'Motorcycle' | 'Van' | 'Hatchback' | 'Sedan' | 'Coupe' | 'Wagon' | 'Convertible' | 'Minivan' | 'Pickup';
          engine?: 'Petrol' | 'Diesel' | 'Electric' | 'Hybrid' | 'Plug-in Hybrid' | 'CNG' | 'LPG' | 'Hydrogen';
          transmission?: 'Manual' | 'Automatic' | 'CVT' | 'Semi-Automatic' | 'Dual-Clutch' | null;
          fuel_capacity?: number | null;
          engine_size?: string | null;
          drivetrain?: 'FWD' | 'RWD' | 'AWD' | '4WD' | 'Front-Wheel Drive' | 'Rear-Wheel Drive' | 'All-Wheel Drive' | '4-Wheel Drive' | null;
          registration: string;
          odometer: number;
          last_service_date?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          make?: string;
          model?: string;
          year?: number;
          variant?: string | null;
          vehicle_type?: 'Car' | 'SUV' | 'Truck' | 'Motorcycle' | 'Van' | 'Hatchback' | 'Sedan' | 'Coupe' | 'Wagon' | 'Convertible' | 'Minivan' | 'Pickup';
          engine?: 'Petrol' | 'Diesel' | 'Electric' | 'Hybrid' | 'Plug-in Hybrid' | 'CNG' | 'LPG' | 'Hydrogen';
          transmission?: 'Manual' | 'Automatic' | 'CVT' | 'Semi-Automatic' | 'Dual-Clutch' | null;
          fuel_capacity?: number | null;
          engine_size?: string | null;
          drivetrain?: 'FWD' | 'RWD' | 'AWD' | '4WD' | 'Front-Wheel Drive' | 'Rear-Wheel Drive' | 'All-Wheel Drive' | '4-Wheel Drive' | null;
          registration?: string;
          odometer?: number;
          last_service_date?: string | null;
          is_default?: boolean;
          updated_at?: string;
        };
      };
      diagnoses: {
        Row: {
          id: string;
          user_id: string | null;
          vehicle_id: string | null;
          guest_email: string | null;
          make: string;
          model: string;
          year: number;
          variant: string | null;
          registration: string | null;
          odometer: number | null;
          issue_description: string;
          ai_response: any | null;
          youtube_videos: any | null;
          product_links: any | null;
          images: string[] | null;
          videos: string[] | null;
          status: 'PENDING' | 'COMPLETED' | 'FAILED';
          is_guest: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          vehicle_id?: string | null;
          guest_email?: string | null;
          make: string;
          model: string;
          year: number;
          variant?: string | null;
          registration?: string | null;
          odometer?: number | null;
          issue_description: string;
          ai_response?: any | null;
          youtube_videos?: any | null;
          product_links?: any | null;
          images?: string[] | null;
          videos?: string[] | null;
          status?: 'PENDING' | 'COMPLETED' | 'FAILED';
          is_guest?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          vehicle_id?: string | null;
          guest_email?: string | null;
          make?: string;
          model?: string;
          year?: number;
          variant?: string | null;
          registration?: string | null;
          odometer?: number | null;
          issue_description?: string;
          ai_response?: any | null;
          youtube_videos?: any | null;
          product_links?: any | null;
          images?: string[] | null;
          videos?: string[] | null;
          status?: 'PENDING' | 'COMPLETED' | 'FAILED';
          is_guest?: boolean;
          updated_at?: string;
        };
      };
      logbook_entries: {
        Row: {
          id: string;
          user_id: string;
          vehicle_id: string;
          date: string;
          service_type: 'MAINTENANCE' | 'REPAIR' | 'INSPECTION' | 'OTHER';
          work_done: string;
          cost: number | null;
          vendor: string | null;
          odometer: number | null;
          receipt_images: string[] | null;
          warranty_info: any | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          vehicle_id: string;
          date: string;
          service_type: 'MAINTENANCE' | 'REPAIR' | 'INSPECTION' | 'OTHER';
          work_done: string;
          cost?: number | null;
          vendor?: string | null;
          odometer?: number | null;
          receipt_images?: string[] | null;
          warranty_info?: any | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          vehicle_id?: string;
          date?: string;
          service_type?: 'MAINTENANCE' | 'REPAIR' | 'INSPECTION' | 'OTHER';
          work_done?: string;
          cost?: number | null;
          vendor?: string | null;
          odometer?: number | null;
          receipt_images?: string[] | null;
          warranty_info?: any | null;
          updated_at?: string;
        };
      };
      diagnosis_usage: {
        Row: {
          user_id: string;
          daily_used: number;
          weekly_used: number;
          last_reset_date: string;
          total_used: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          daily_used?: number;
          weekly_used?: number;
          last_reset_date?: string;
          total_used?: number;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          daily_used?: number;
          weekly_used?: number;
          last_reset_date?: string;
          total_used?: number;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
