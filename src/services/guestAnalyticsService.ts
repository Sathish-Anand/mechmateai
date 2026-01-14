import { supabase } from '../utils/supabase';

/**
 * Guest Analytics Service
 *
 * Comprehensive tracking for guest diagnosis sessions to analyze:
 * - Conversion rates from guest to signup
 * - Popular vehicle makes/models
 * - Common issue categories
 * - User engagement patterns
 * - Marketing effectiveness
 */

export interface GuestDiagnosisTrackingData {
  sessionId: string;
  guestEmail?: string;
  make: string;
  model: string;
  year: number;
  variant?: string;
  issueDescription: string;
  partsShown: number;
  videosShown: number;
  totalParts: number;
  totalVideos: number;
  aiResponse?: any;
  userAgent?: string;
  ipAddress?: string;
}

export interface GuestInteractionData {
  sessionId: string;
  interactionType: 'part_click' | 'video_click' | 'signup_prompt_view' | 'signup_prompt_click' |
                   'scroll_to_parts' | 'scroll_to_videos' | 'page_exit' | 'return_visit';
  itemClicked?: string;
  itemPosition?: number;
  additionalData?: any;
}

export interface GuestAnalyticsSummary {
  totalGuestDiagnoses: number;
  uniqueSessions: number;
  conversionRate: number;
  avgPartsShown: number;
  avgVideosShown: number;
  signupPromptRate: number;
  partClickRate: number;
  topVehicleMakes: Array<{ make: string; diagnosisCount: number }>;
  topIssueCategories: Array<{ issueCategory: string; diagnosisCount: number }>;
}

class GuestAnalyticsService {

  /**
   * Generate a unique session ID for tracking
   */
  generateSessionId(): string {
    return `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Track a complete guest diagnosis session
   */
  async trackGuestDiagnosis(data: GuestDiagnosisTrackingData): Promise<string | null> {
    try {
      const { data: result, error } = await supabase
        .rpc('track_guest_diagnosis', {
          p_session_id: data.sessionId,
          p_guest_email: data.guestEmail || null,
          p_make: data.make,
          p_model: data.model,
          p_year: data.year,
          p_variant: data.variant || null,
          p_issue_description: data.issueDescription,
          p_parts_shown: data.partsShown,
          p_videos_shown: data.videosShown,
          p_total_parts: data.totalParts,
          p_total_videos: data.totalVideos,
          p_ai_response: data.aiResponse || null
        });

      if (error) {
        console.error('Error tracking guest diagnosis:', error);
        return null;
      }

      return result;
    } catch (error) {
      console.error('Failed to track guest diagnosis:', error);
      return null;
    }
  }

  /**
   * Track specific guest interactions (clicks, scrolls, etc.)
   */
  async trackGuestInteraction(data: GuestInteractionData): Promise<boolean> {
    try {
      const { error } = await supabase
        .rpc('track_guest_interaction', {
          p_session_id: data.sessionId,
          p_interaction_type: data.interactionType,
          p_item_clicked: data.itemClicked || null,
          p_item_position: data.itemPosition || null,
          p_additional_data: data.additionalData || null
        });

      if (error) {
        console.error('Error tracking guest interaction:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to track guest interaction:', error);
      return false;
    }
  }

  /**
   * Track when a guest converts to signup
   */
  async trackGuestConversion(sessionId: string, userId: string, guestEmail?: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .rpc('track_guest_conversion', {
          p_session_id: sessionId,
          p_user_id: userId,
          p_guest_email: guestEmail || null
        });

      if (error) {
        console.error('Error tracking guest conversion:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to track guest conversion:', error);
      return false;
    }
  }

  /**
   * Get comprehensive guest analytics summary
   */
  async getGuestAnalytics(startDate?: Date, endDate?: Date): Promise<GuestAnalyticsSummary | null> {
    try {
      const { data, error } = await supabase
        .rpc('get_guest_analytics', {
          p_start_date: startDate?.toISOString().split('T')[0] || null,
          p_end_date: endDate?.toISOString().split('T')[0] || null
        });

      if (error) {
        console.error('Error fetching guest analytics:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Failed to fetch guest analytics:', error);
      return null;
    }
  }

  /**
   * Get popular vehicle makes from guest diagnoses
   */
  async getPopularVehicleMakes(limit: number = 10): Promise<Array<{make: string, count: number}>> {
    try {
      const { data, error } = await supabase
        .from('guest_diagnosis_sessions')
        .select('make')
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching popular vehicle makes:', error);
        return [];
      }

      // Count occurrences
      const makeCounts = data.reduce((acc: any, item: any) => {
        acc[item.make] = (acc[item.make] || 0) + 1;
        return acc;
      }, {});

      return Object.entries(makeCounts)
        .map(([make, count]) => ({ make, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to fetch popular vehicle makes:', error);
      return [];
    }
  }

  /**
   * Get common issue categories from guest diagnoses
   */
  async getCommonIssueCategories(limit: number = 10): Promise<Array<{category: string, count: number}>> {
    try {
      const { data, error } = await supabase
        .from('guest_diagnosis_sessions')
        .select('issue_category')
        .not('issue_category', 'is', null)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching common issue categories:', error);
        return [];
      }

      // Count occurrences
      const categoryCounts = data.reduce((acc: any, item: any) => {
        if (item.issue_category) {
          acc[item.issue_category] = (acc[item.issue_category] || 0) + 1;
        }
        return acc;
      }, {});

      return Object.entries(categoryCounts)
        .map(([category, count]) => ({ category, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit);
    } catch (error) {
      console.error('Failed to fetch common issue categories:', error);
      return [];
    }
  }

  /**
   * Get conversion rate for a specific time period
   */
  async getConversionRate(days: number = 7): Promise<{
    totalSessions: number,
    conversions: number,
    conversionRate: number
  }> {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const { data, error } = await supabase
        .from('guest_diagnosis_sessions')
        .select('converted_to_signup')
        .gte('created_at', startDate.toISOString());

      if (error) {
        console.error('Error fetching conversion rate:', error);
        return { totalSessions: 0, conversions: 0, conversionRate: 0 };
      }

      const totalSessions = data.length;
      const conversions = data.filter(item => item.converted_to_signup).length;
      const conversionRate = totalSessions > 0 ? (conversions / totalSessions) * 100 : 0;

      return {
        totalSessions,
        conversions,
        conversionRate: Math.round(conversionRate * 100) / 100
      };
    } catch (error) {
      console.error('Failed to fetch conversion rate:', error);
      return { totalSessions: 0, conversions: 0, conversionRate: 0 };
    }
  }

  /**
   * Track time spent viewing results
   */
  async trackTimeSpent(sessionId: string, timeSpentSeconds: number): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('guest_diagnosis_sessions')
        .update({ time_spent_seconds: timeSpentSeconds })
        .eq('session_id', sessionId);

      if (error) {
        console.error('Error tracking time spent:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to track time spent:', error);
      return false;
    }
  }

  /**
   * Store session ID in localStorage for conversion tracking
   */
  storeSessionForConversion(sessionId: string): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('mechmateai_guest_session', sessionId);
        // Set expiration (24 hours)
        localStorage.setItem('mechmateai_guest_session_expires',
          (Date.now() + 24 * 60 * 60 * 1000).toString());
      }
    } catch (error) {
      console.error('Failed to store session for conversion tracking:', error);
    }
  }

  /**
   * Get stored session ID for conversion tracking
   */
  getStoredSessionForConversion(): string | null {
    try {
      if (typeof window !== 'undefined') {
        const sessionId = localStorage.getItem('mechmateai_guest_session');
        const expires = localStorage.getItem('mechmateai_guest_session_expires');

        if (sessionId && expires && Date.now() < parseInt(expires)) {
          return sessionId;
        } else {
          // Clean up expired data
          localStorage.removeItem('mechmateai_guest_session');
          localStorage.removeItem('mechmateai_guest_session_expires');
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to get stored session for conversion tracking:', error);
      return null;
    }
  }

  /**
   * Clear stored session after successful conversion
   */
  clearStoredSession(): void {
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('mechmateai_guest_session');
        localStorage.removeItem('mechmateai_guest_session_expires');
      }
    } catch (error) {
      console.error('Failed to clear stored session:', error);
    }
  }
}

export const guestAnalyticsService = new GuestAnalyticsService();