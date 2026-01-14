import { supabase } from '../utils/supabase';
import { Database } from '../utils/supabase';

type Diagnosis = Database['public']['Tables']['diagnoses']['Row'];
type DiagnosisInsert = Database['public']['Tables']['diagnoses']['Insert'];
type DiagnosisUpdate = Database['public']['Tables']['diagnoses']['Update'];

export interface DiagnosisRequest {
  vehicleId?: string;
  make: string;
  model: string;
  year: number;
  variant?: string;
  registration?: string;
  odometer?: number;
  issueDescription: string;
  images?: string[];
  videos?: string[];
}

export interface GuestDiagnosisRequest extends DiagnosisRequest {
  email: string;
}

export const diagnosisService = {
  // Create a new diagnosis for authenticated user
  async createDiagnosis(request: DiagnosisRequest): Promise<Diagnosis> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    // Check usage limits first
    await this.checkUsageLimits(user.id);

    const { data, error } = await supabase
      .from('diagnoses')
      .insert({
        user_id: user.id,
        vehicle_id: request.vehicleId,
        make: request.make,
        model: request.model,
        year: request.year,
        variant: request.variant,
        registration: request.registration,
        odometer: request.odometer,
        issue_description: request.issueDescription,
        images: request.images,
        videos: request.videos,
        is_guest: false,
        status: 'PENDING',
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Update usage count (don't throw errors to avoid breaking the diagnosis flow)
    try {
      await this.updateUsageCount(user.id);
    } catch (error) {
      console.warn('Usage count update failed, but diagnosis was successful:', error);
    }

    return data;
  },

  // Create a guest diagnosis
  async createGuestDiagnosis(request: GuestDiagnosisRequest): Promise<Diagnosis> {
    const { data, error } = await supabase
      .from('diagnoses')
      .insert({
        guest_email: request.email,
        make: request.make,
        model: request.model,
        year: request.year,
        variant: request.variant,
        registration: request.registration,
        odometer: request.odometer,
        issue_description: request.issueDescription,
        images: request.images,
        videos: request.videos,
        is_guest: true,
        status: 'PENDING',
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  // Get user's diagnoses
  async getUserDiagnoses(limit = 20, offset = 0): Promise<Diagnosis[]> {
    const { data, error } = await supabase
      .from('diagnoses')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw error;
    }

    return data || [];
  },

  // Get user's total diagnosis count
  async getUserDiagnosisCount(): Promise<number> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const { count, error } = await supabase
      .from('diagnoses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    return count || 0;
  },

  // Get user's completed diagnosis count
  async getUserCompletedDiagnosisCount(): Promise<number> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const { count, error } = await supabase
      .from('diagnoses')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'COMPLETED');

    if (error) {
      throw error;
    }

    return count || 0;
  },

  // Get user's current usage and limits
  async getUserUsageInfo(): Promise<{
    usage: { daily_used: number; weekly_used: number; total_used: number };
    limits: { daily: number; weekly: number };
    planType: string;
  }> {
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('User not authenticated');
    }

    const [userProfile, usage] = await Promise.all([
      supabase.from('profiles').select('plan_type').eq('id', user.id).single(),
      supabase.from('diagnosis_usage').select('*').eq('user_id', user.id).single(),
    ]);

    if (userProfile.error) {
      throw new Error('Failed to fetch user profile');
    }

    const planLimits = {
      Basic: { daily: 1, weekly: 5 },
      Essential: { daily: 10, weekly: 70 },
      Performance: { daily: 999, weekly: 50 },
      Ultimate: { daily: 999, weekly: 200 },
    };

    const userPlan = userProfile.data.plan_type as keyof typeof planLimits;
    const limits = planLimits[userPlan] || planLimits.Basic;

    // If no usage record exists, create default
    const currentUsage = usage.data || {
      daily_used: 0,
      weekly_used: 0,
      total_used: 0,
    };

    return {
      usage: currentUsage,
      limits,
      planType: userPlan,
    };
  },

  // Get a specific diagnosis
  async getDiagnosis(id: string): Promise<Diagnosis | null> {
    const { data, error } = await supabase
      .from('diagnoses')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Diagnosis not found
      }
      throw error;
    }

    return data;
  },

  // Update diagnosis with AI response
  async updateDiagnosisResponse(
    id: string,
    aiResponse: any,
    youtubeVideos: any[],
    productLinks: any[]
  ): Promise<Diagnosis> {
    const { data, error } = await supabase
      .from('diagnoses')
      .update({
        ai_response: aiResponse,
        youtube_videos: youtubeVideos,
        product_links: productLinks,
        status: 'COMPLETED',
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  // Mark diagnosis as failed
  async markDiagnosisFailed(id: string): Promise<Diagnosis> {
    const { data, error } = await supabase
      .from('diagnoses')
      .update({ status: 'FAILED' })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return data;
  },

  // Check if user has reached usage limits
  async checkUsageLimits(userId: string): Promise<void> {
    // Get user's plan and usage
    const [userProfile, usage] = await Promise.all([
      supabase.from('profiles').select('plan_type').eq('id', userId).single(),
      supabase.from('diagnosis_usage').select('*').eq('user_id', userId).single(),
    ]);

    if (userProfile.error || usage.error) {
      throw new Error('Failed to check usage limits');
    }

    const planLimits = {
      Basic: { daily: 1, weekly: 5 },         // Basic users get 1 per day, 5 per week
      Essential: { daily: 10, weekly: 70 },   // Essential plan: 10 per day, 70 per week
      Performance: { daily: 999, weekly: 50 }, // Performance plan: No daily limit, 50 per month
      Ultimate: { daily: 999, weekly: 200 },   // Ultimate plan: No daily limit, 200 per month
    };

    const userPlan = userProfile.data.plan_type as keyof typeof planLimits;
    const limits = planLimits[userPlan];

    // Check if usage needs to be reset (new day/week)
    const today = new Date().toISOString().split('T')[0];
    const lastReset = usage.data.last_reset_date;

    if (lastReset !== today) {
      // Reset daily usage and monthly/weekly usage based on plan
      let resetWeeklyUsage = false;

      if (userPlan === 'Performance' || userPlan === 'Ultimate') {
        // Monthly reset for Performance and Ultimate
        resetWeeklyUsage = this.isNewMonth(lastReset, today);
      } else {
        // Weekly reset for Basic and Essential
        resetWeeklyUsage = this.isNewWeek(lastReset, today);
      }

      await supabase
        .from('diagnosis_usage')
        .update({
          daily_used: 0,
          weekly_used: resetWeeklyUsage ? 0 : usage.data.weekly_used,
          last_reset_date: today,
        })
        .eq('user_id', userId);
    }

    // Check limits
    const currentUsage = lastReset === today ? usage.data : { daily_used: 0, weekly_used: usage.data.weekly_used };

    // For Performance and Ultimate, there's no daily limit
    if (userPlan !== 'Performance' && userPlan !== 'Ultimate') {
      if (currentUsage.daily_used >= limits.daily) {
        throw new Error(`Daily diagnosis limit reached (${limits.daily}). Upgrade your plan for more diagnoses.`);
      }
    }

    // Check monthly/weekly limit based on plan
    const periodType = (userPlan === 'Performance' || userPlan === 'Ultimate') ? 'monthly' : 'weekly';
    if (currentUsage.weekly_used >= limits.weekly) {
      throw new Error(`${periodType.charAt(0).toUpperCase() + periodType.slice(1)} diagnosis limit reached (${limits.weekly}). Upgrade your plan for more diagnoses.`);
    }
  },

  // Update usage count after successful diagnosis
  async updateUsageCount(userId: string): Promise<void> {
    try {
      // First, get current usage data
      const { data: currentUsage, error: fetchError } = await supabase
        .from('diagnosis_usage')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        console.error('Failed to fetch current usage:', fetchError);

        // If the record doesn't exist, create it
        if (fetchError.code === 'PGRST116') {
          await supabase
            .from('diagnosis_usage')
            .insert({
              user_id: userId,
              daily_used: 1,
              weekly_used: 1,
              total_used: 1,
              last_reset_date: new Date().toISOString().split('T')[0],
            });
          return;
        }
        throw fetchError;
      }

      // Update the usage counts
      const { error: updateError } = await supabase
        .from('diagnosis_usage')
        .update({
          daily_used: currentUsage.daily_used + 1,
          weekly_used: currentUsage.weekly_used + 1,
          total_used: currentUsage.total_used + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Failed to update usage count:', updateError);
        throw updateError;
      }
    } catch (error) {
      console.error('Failed to update usage count:', error);
      // Don't throw the error to avoid breaking the diagnosis flow
      // The diagnosis will still work, just the usage count won't be updated
    }
  },

  // Helper function to check if it's a new week
  isNewWeek(lastReset: string, today: string): boolean {
    const lastDate = new Date(lastReset);
    const todayDate = new Date(today);

    // Get the start of the week (Sunday)
    const getWeekStart = (date: Date) => {
      const d = new Date(date);
      const day = d.getDay();
      const diff = d.getDate() - day;
      return new Date(d.setDate(diff));
    };

    const lastWeekStart = getWeekStart(lastDate);
    const thisWeekStart = getWeekStart(todayDate);

    return lastWeekStart.getTime() !== thisWeekStart.getTime();
  },

  // Helper function to check if it's a new month
  isNewMonth(lastReset: string, today: string): boolean {
    const lastDate = new Date(lastReset);
    const todayDate = new Date(today);

    // Check if year or month is different
    return (
      lastDate.getFullYear() !== todayDate.getFullYear() ||
      lastDate.getMonth() !== todayDate.getMonth()
    );
  },
};