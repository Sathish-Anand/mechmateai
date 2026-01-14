import { supabase } from '../utils/supabase';
import { Database } from '../utils/supabase';

type Vehicle = Database['public']['Tables']['vehicles']['Row'];
type VehicleInsert = Database['public']['Tables']['vehicles']['Insert'];
type VehicleUpdate = Database['public']['Tables']['vehicles']['Update'];

export const vehicleService = {
  // Get all vehicles for the current user
  async getUserVehicles(): Promise<Vehicle[]> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('user_id', user.id)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  },

  // Get user's total vehicle count
  async getUserVehicleCount(): Promise<number> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const { count, error } = await supabase
      .from('vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    return count || 0;
  },

  // Get a specific vehicle by ID
  async getVehicle(id: string): Promise<Vehicle | null> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Vehicle not found
      }
      throw error;
    }

    return data;
  },

  // Add a new vehicle
  async addVehicle(vehicleData: Omit<VehicleInsert, 'user_id'>): Promise<Vehicle> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('vehicles')
      .insert({
        ...vehicleData,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  // Update an existing vehicle
  async updateVehicle(id: string, updates: VehicleUpdate): Promise<Vehicle> {
    const { data, error } = await supabase
      .from('vehicles')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  // Delete a vehicle
  async deleteVehicle(id: string): Promise<void> {
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  },

  // Set vehicle as default
  async setDefaultVehicle(id: string): Promise<Vehicle> {
    const { data, error } = await supabase
      .from('vehicles')
      .update({ is_default: true })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  // Get user's default vehicle
  async getDefaultVehicle(): Promise<Vehicle | null> {
    const { data, error } = await supabase
      .from('vehicles')
      .select('*')
      .eq('is_default', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No default vehicle found
      }
      throw error;
    }

    return data;
  },

  // Update vehicle odometer
  async updateOdometer(id: string, odometer: number): Promise<Vehicle> {
    return this.updateVehicle(id, { odometer });
  },

  // Update last service date
  async updateLastServiceDate(id: string, serviceDate: string): Promise<Vehicle> {
    return this.updateVehicle(id, { last_service_date: serviceDate });
  },
};