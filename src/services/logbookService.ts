import { supabase } from '../utils/supabase';
import { Database } from '../utils/supabase';

type LogbookEntry = Database['public']['Tables']['logbook_entries']['Row'];
type LogbookEntryInsert = Database['public']['Tables']['logbook_entries']['Insert'];
type LogbookEntryUpdate = Database['public']['Tables']['logbook_entries']['Update'];

export interface LogbookEntryData {
  vehicleId: string;
  date: string;
  serviceType: 'MAINTENANCE' | 'REPAIR' | 'INSPECTION' | 'OTHER';
  workDone: string;
  cost?: number;
  vendor?: string;
  odometer?: number;
  receiptImages?: string[];
  warrantyInfo?: {
    startDate: string;
    endDate: string;
    coverageDetails: string;
    warrantyProvider: string;
  };
}

export const logbookService = {
  // Get all logbook entries for the user
  async getUserLogbookEntries(vehicleId?: string): Promise<LogbookEntry[]> {
    let query = supabase
      .from('logbook_entries')
      .select(`
        *,
        vehicles:vehicle_id (
          make,
          model,
          year,
          registration
        )
      `)
      .order('date', { ascending: false });

    if (vehicleId) {
      query = query.eq('vehicle_id', vehicleId);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return data || [];
  },

  // Get logbook entries for a specific vehicle
  async getVehicleLogbookEntries(vehicleId: string): Promise<LogbookEntry[]> {
    return this.getUserLogbookEntries(vehicleId);
  },

  // Get a specific logbook entry
  async getLogbookEntry(id: string): Promise<LogbookEntry | null> {
    const { data, error } = await supabase
      .from('logbook_entries')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Entry not found
      }
      throw error;
    }

    return data;
  },

  // Add a new logbook entry
  async addLogbookEntry(entryData: LogbookEntryData): Promise<LogbookEntry> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('logbook_entries')
      .insert({
        user_id: user.id,
        vehicle_id: entryData.vehicleId,
        date: entryData.date,
        service_type: entryData.serviceType,
        work_done: entryData.workDone,
        cost: entryData.cost,
        vendor: entryData.vendor,
        odometer: entryData.odometer,
        receipt_images: entryData.receiptImages,
        warranty_info: entryData.warrantyInfo,
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Update vehicle's last service date and odometer if provided
    if (entryData.serviceType === 'MAINTENANCE' || entryData.serviceType === 'REPAIR') {
      const updateData: any = {
        last_service_date: entryData.date,
      };

      if (entryData.odometer) {
        updateData.odometer = entryData.odometer;
      }

      await supabase
        .from('vehicles')
        .update(updateData)
        .eq('id', entryData.vehicleId);
    }

    return data;
  },

  // Update a logbook entry
  async updateLogbookEntry(id: string, updates: Partial<LogbookEntryData>): Promise<LogbookEntry> {
    const updateData: LogbookEntryUpdate = {};

    if (updates.vehicleId) updateData.vehicle_id = updates.vehicleId;
    if (updates.date) updateData.date = updates.date;
    if (updates.serviceType) updateData.service_type = updates.serviceType;
    if (updates.workDone) updateData.work_done = updates.workDone;
    if (updates.cost !== undefined) updateData.cost = updates.cost;
    if (updates.vendor !== undefined) updateData.vendor = updates.vendor;
    if (updates.odometer !== undefined) updateData.odometer = updates.odometer;
    if (updates.receiptImages) updateData.receipt_images = updates.receiptImages;
    if (updates.warrantyInfo) updateData.warranty_info = updates.warrantyInfo;

    const { data, error } = await supabase
      .from('logbook_entries')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  // Delete a logbook entry
  async deleteLogbookEntry(id: string): Promise<void> {
    const { error } = await supabase
      .from('logbook_entries')
      .delete()
      .eq('id', id);

    if (error) {
      throw error;
    }
  },

  // Get maintenance summary for a vehicle
  async getMaintenanceSummary(vehicleId: string) {
    const { data, error } = await supabase
      .from('logbook_entries')
      .select('service_type, cost, date')
      .eq('vehicle_id', vehicleId)
      .order('date', { ascending: false });

    if (error) {
      throw error;
    }

    const summary = {
      totalEntries: data?.length || 0,
      totalCost: data?.reduce((sum, entry) => sum + (entry.cost || 0), 0) || 0,
      lastService: data?.[0]?.date || null,
      serviceTypes: {
        maintenance: data?.filter(e => e.service_type === 'MAINTENANCE').length || 0,
        repair: data?.filter(e => e.service_type === 'REPAIR').length || 0,
        inspection: data?.filter(e => e.service_type === 'INSPECTION').length || 0,
        other: data?.filter(e => e.service_type === 'OTHER').length || 0,
      },
    };

    return summary;
  },

  // Get upcoming maintenance reminders
  async getMaintenanceReminders(vehicleId: string) {
    // This would typically involve more complex logic based on vehicle type,
    // mileage, and last service dates. For now, return basic reminders.
    const { data: vehicle } = await supabase
      .from('vehicles')
      .select('odometer, last_service_date')
      .eq('id', vehicleId)
      .single();

    if (!vehicle) {
      return [];
    }

    const reminders = [];
    const currentDate = new Date();
    const lastServiceDate = vehicle.last_service_date ? new Date(vehicle.last_service_date) : null;

    // Basic maintenance reminders (this would be more sophisticated in production)
    if (!lastServiceDate || (currentDate.getTime() - lastServiceDate.getTime()) > (6 * 30 * 24 * 60 * 60 * 1000)) {
      reminders.push({
        type: 'Oil Change',
        priority: 'high',
        message: 'Oil change recommended every 6 months or 10,000 km',
      });
    }

    if (vehicle.odometer > 0 && vehicle.odometer % 20000 < 1000) {
      reminders.push({
        type: 'Major Service',
        priority: 'medium',
        message: 'Major service due at 20,000 km intervals',
      });
    }

    return reminders;
  },
};