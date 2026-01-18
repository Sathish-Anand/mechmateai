import { supabase } from '../utils/supabase';

class EdgeFunctionService {
  // Use environment variable or default to localhost for web, network IP for mobile
  private baseUrl = this.getBaseUrl();

  private logJwtClaims(token: string) {
    try {
      const parts = token.split('.');
      if (parts.length < 2) {
        console.log('JWT decode skipped: invalid token format');
        return;
      }
      let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
      while (payload.length % 4 !== 0) {
        payload += '=';
      }

      const decode = (value: string) => {
        if (typeof globalThis.atob === 'function') {
          return globalThis.atob(value);
        }
        if (typeof Buffer !== 'undefined') {
          return Buffer.from(value, 'base64').toString('utf8');
        }
        throw new Error('No base64 decoder available');
      };

      const payloadJson = decode(payload);
      const claims = JSON.parse(payloadJson);
      console.log('JWT claims:', {
        iss: claims.iss,
        aud: claims.aud,
        exp: claims.exp,
        iat: claims.iat,
        role: claims.role,
        sub: claims.sub,
      });
    } catch (error) {
      console.log('JWT decode failed:', error);
    }
  }

  private getBaseUrl(): string {
    // Check if we have an environment variable for the Edge Functions URL
    const envUrl = process.env.EXPO_PUBLIC_EDGE_FUNCTION_URL;
    if (envUrl) {
      return envUrl;
    }

    // Derive from the Supabase project URL to avoid project mismatches
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
      return `${supabaseUrl.replace(/\/$/, '')}/functions/v1`;
    }

    throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_EDGE_FUNCTION_URL');
  }

  async getDiagnosis(
    vehicle: any,
    issueDescription: string,
    logbookEntries: any[] = [],
    obdiiCodes?: string,
    images?: string[],
    video?: string
  ) {
    try {
      console.log('Edge Function base URL:', this.baseUrl);
      const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      if (!anonKey) {
        throw new Error('Missing EXPO_PUBLIC_SUPABASE_ANON_KEY');
      }
      console.log('Edge Function apikey prefix:', anonKey.slice(0, 8));

      // Get a valid session with automatic refresh
      const session = await this.getValidSession();

      // Call the Edge Function with proper authentication (with retry for JWT issues)
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), 10000); // 10 second timeout for faster testing

      let response;
      try {
        response = await fetch(`${this.baseUrl}/groq-diagnosis`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'apikey': anonKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            vehicle,
            issueDescription,
            logbookEntries,
            obdiiCodes,
            images,
            video
          }),
          signal: abortController.signal
        });
        clearTimeout(timeoutId);
      } catch (error: any) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
          throw new Error('Request timed out. Please check your internet connection and try again.');
        }
        throw error;
      }

      console.log('Edge Function response status:', response.status);

      // Handle JWT errors immediately without retry
      if (response.status === 401) {
        const errorData = await response.json().catch(() => ({}));
        console.log('401 error received, error data:', errorData);
        console.log('JWT authentication failed - no retry attempted');

        throw new Error(`Authentication failed: ${errorData.message || 'Invalid JWT token'}`);
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Edge Function error data:', errorData);

        // Handle JWT-related errors specifically
        if (response.status === 401) {
          if (errorData.message === 'Invalid JWT' || errorData.code === 401) {
            throw new Error('Your session has expired. Please close the app and sign in again.');
          }
          throw new Error(`Authentication failed: ${errorData.error || errorData.message || 'Please sign in again'}`);
        }

        throw new Error(`Edge Function error: ${response.status} - ${errorData.error || errorData.details || errorData.message || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log('Edge Function success');

      // Return in the same format as the original groqService
      return result.diagnosis;
    } catch (error: any) {
      console.error('Edge Function diagnosis error:', error);
      throw new Error(`Failed to get AI diagnosis: ${error.message}`);
    }
  }

  async generateDetailedPartRecommendations(vehicle: any, diagnosis: any, obdiiCodes?: string) {
    try {
      // Extract relevant information for part recommendations
      const vehicleInfo = `${vehicle.year} ${vehicle.make} ${vehicle.model}${vehicle.variant ? ` ${vehicle.variant}` : ''}`;
      const issueTitle = diagnosis.title || 'general maintenance';
      const recommendations = diagnosis.recommendations || [];

      // Generate parts based on the specific diagnosis
      const parts = this.generateRelevantParts(vehicleInfo, issueTitle, recommendations, obdiiCodes);

      return parts;
    } catch (error) {
      console.error('Error generating part recommendations:', error);
      // Fallback to basic recommendations
      return [
        {
          id: '1',
          name: 'Basic Diagnostic Tool',
          category: 'diagnostic',
          priority: 'medium',
          estimatedPrice: { min: 25, max: 75 },
          description: 'OBD-II scanner for vehicle diagnostics',
          partNumber: 'DIAG001',
          brand: 'Universal',
          availability: 'in-stock',
          specifications: [],
        }
      ];
    }
  }

  private generateRelevantParts(vehicleInfo: string, issueTitle: string, recommendations: string[], obdiiCodes?: string) {
    const parts: any[] = [];
    const issue = issueTitle.toLowerCase();

    // Generate parts based on specific issues
    if (issue.includes('wiper') || issue.includes('windshield')) {
      parts.push({
        id: '1',
        name: 'Windshield Wiper Blades',
        category: 'maintenance',
        priority: 'high',
        estimatedPrice: { min: 15, max: 35 },
        description: `Premium wiper blades for ${vehicleInfo}`,
        partNumber: 'WB001',
        brand: 'OEM',
        availability: 'in-stock',
        specifications: [],
      });

      parts.push({
        id: '2',
        name: 'Wiper Blade Lubricant',
        category: 'maintenance',
        priority: 'medium',
        estimatedPrice: { min: 5, max: 12 },
        description: 'Silicone-based lubricant for wiper mechanisms',
        partNumber: 'WL001',
        brand: 'Generic',
        availability: 'in-stock',
        specifications: [],
      });

    } else if (issue.includes('engine') || issue.includes('start')) {
      parts.push({
        id: '1',
        name: 'Starter Motor',
        category: 'engine',
        priority: 'high',
        estimatedPrice: { min: 150, max: 350 },
        description: `Replacement starter motor for ${vehicleInfo}`,
        partNumber: 'SM001',
        brand: 'OEM',
        availability: 'in-stock',
        specifications: [],
      });

    } else if (issue.includes('brake') || issue.includes('stop')) {
      parts.push({
        id: '1',
        name: 'Brake Pads',
        category: 'braking',
        priority: 'high',
        estimatedPrice: { min: 45, max: 120 },
        description: `Brake pads for ${vehicleInfo}`,
        partNumber: 'BP001',
        brand: 'OEM',
        availability: 'in-stock',
        specifications: [],
      });

    } else if (issue.includes('oil') || issue.includes('leak')) {
      parts.push({
        id: '1',
        name: 'Engine Oil',
        category: 'maintenance',
        priority: 'medium',
        estimatedPrice: { min: 25, max: 45 },
        description: `Premium engine oil for ${vehicleInfo}`,
        partNumber: 'EO001',
        brand: 'Synthetic',
        availability: 'in-stock',
        specifications: [],
      });

    } else {
      // Generic diagnostic and maintenance items
      parts.push({
        id: '1',
        name: 'OBD-II Diagnostic Scanner',
        category: 'diagnostic',
        priority: 'medium',
        estimatedPrice: { min: 35, max: 85 },
        description: 'Professional diagnostic scanner for troubleshooting',
        partNumber: 'OBD001',
        brand: 'Universal',
        availability: 'in-stock',
        specifications: [],
      });
    }

    // Add basic maintenance item
    parts.push({
      id: String(parts.length + 1),
      name: 'Multi-Purpose Cleaner',
      category: 'maintenance',
      priority: 'low',
      estimatedPrice: { min: 8, max: 18 },
      description: 'Automotive cleaning solution for general maintenance',
      partNumber: 'CL001',
      brand: 'Generic',
      availability: 'in-stock',
      specifications: [],
    });

    return parts;
  }

  // Helper method to get a valid session with automatic refresh
  private async getValidSession() {
    console.log('Getting user session...');

    // First try to get the current session
    const { data: { session }, error: authError } = await supabase.auth.getSession();

    if (authError) {
      console.error('Auth error getting session:', authError);
      throw new Error(`Authentication error: ${authError.message}`);
    }

    if (!session) {
      console.error('No session found');
      throw new Error('User must be authenticated to get diagnosis - please sign in again');
    }

      console.log('Session found, user ID:', session.user.id);
      console.log('Token length:', session.access_token.length);
      console.log('Token prefix:', session.access_token.slice(0, 12));
      this.logJwtClaims(session.access_token);

    // Check if token is about to expire (within 5 minutes) and refresh proactively
    const expiresAt = session.expires_at || 0;
    const now = Math.floor(Date.now() / 1000);
    const fiveMinutesFromNow = now + (5 * 60);

    if (expiresAt < fiveMinutesFromNow) {
      console.log('Token expires soon, refreshing proactively...');
      try {
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();

        if (!refreshError && refreshData.session) {
          console.log('Proactive refresh successful');
          return refreshData.session;
        } else {
          console.log('Proactive refresh failed, using current session');
        }
      } catch (error) {
        console.log('Proactive refresh error, using current session');
      }
    }

    return session;
  }

  // Method to switch between local and production URLs
  setProductionMode(isProduction: boolean) {
    this.baseUrl = isProduction
      ? 'https://alhvqxbruykfdjvogrca.supabase.co/functions/v1'
      : 'http://192.168.7.197:54321/functions/v1';
  }
}

export const edgeFunctionService = new EdgeFunctionService();
