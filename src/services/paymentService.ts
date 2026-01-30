import { supabase } from '../utils/supabase';

export interface PaymentRequest {
  planName: string;
  planPrice: number;
  billingCycle: 'daily' | 'monthly';
}

export interface PaymentIntentResponse {
  paymentIntent: string;
  publishableKey: string;
}

class PaymentService {
  async createPaymentIntent(request: PaymentRequest): Promise<PaymentIntentResponse> {
    console.log('🔥 PaymentService: Starting createPaymentIntent with request:', request);

    try {
      // Add authentication debugging
      const session = await supabase.auth.getSession();
      console.log('🔍 PaymentService: Session check:', session.data.session ? 'Has session' : 'No session');
      console.log('🔍 PaymentService: User:', session.data.session?.user?.email);
      console.log('🔍 PaymentService: Token expires:', session.data.session?.expires_at ? new Date(session.data.session.expires_at * 1000) : 'No expiry');
      console.log('🔍 PaymentService: Current time:', new Date());

      console.log('🔥 PaymentService: Calling supabase.functions.invoke with body:', request);

      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: request,
      });

      console.log('🔥 PaymentService: Supabase response - data:', data, 'error:', error);

      if (error) {
        console.error('🔥 PaymentService: Payment intent creation error:', error);
        console.error('🔥 PaymentService: Error details:', JSON.stringify(error, null, 2));
        throw new Error(error.message || 'Failed to create payment intent');
      }

      if (!data || !data.paymentIntent || !data.publishableKey) {
        console.error('🔥 PaymentService: Invalid payment intent response:', data);
        throw new Error('Invalid payment intent response');
      }

      console.log('🔥 PaymentService: Successfully created payment intent');
      return data;
    } catch (error) {
      console.error('🔥 PaymentService: createPaymentIntent catch block error:', error);
      console.error('🔥 PaymentService: Error stack:', (error as Error).stack);
      throw error;
    }
  }

  // Plan pricing mapping
  getPlanBillingCycle(planName: string): 'daily' | 'monthly' {
    switch (planName) {
      case 'Essential':
        return 'daily';
      case 'Performance':
      case 'Ultimate':
        return 'monthly';
      default:
        throw new Error(`Unknown plan: ${planName}`);
    }
  }

  getPlanPrice(planName: string): number {
    switch (planName) {
      case 'Essential':
        return 5; // $5/day
      case 'Performance':
        return 20; // $20/month
      case 'Ultimate':
        return 50; // $50/month
      default:
        throw new Error(`Unknown plan: ${planName}`);
    }
  }
}

export const paymentService = new PaymentService();