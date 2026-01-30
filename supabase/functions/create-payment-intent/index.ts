import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentRequest {
  planName: string
  planPrice: number
  billingCycle: 'daily' | 'monthly'
}

// Plan pricing configuration (amounts in cents)
const PLAN_PRICES = {
  'Essential': { daily: 500, monthly: 500 }, // $5.00/day
  'Performance': { daily: 2000, monthly: 2000 }, // $20.00/month
  'Ultimate': { daily: 5000, monthly: 5000 }, // $50.00/month
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Get Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get current user from JWT token (similar to verify-payment function)
    const authHeader = req.headers.get('Authorization')
    let currentUser = null

    if (authHeader) {
      console.log('🔐 Authorization header found, attempting user verification...')
      const token = authHeader.replace('Bearer ', '')
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: authHeader },
          },
        }
      )

      try {
        const { data: { user }, error: userError } = await userClient.auth.getUser()
        if (userError) {
          console.log('⚠️ Auth verification failed:', userError.message)
          console.log('⚠️ Continuing without user verification')
        } else {
          currentUser = user
          console.log('✅ User verified successfully:', user.email)
        }
      } catch (authException) {
        console.log('⚠️ Auth exception:', authException.message)
        console.log('⚠️ Continuing without user verification')
      }
    }

    // Require authentication - fail if no valid user
    if (!currentUser) {
      console.error('❌ No valid user found, authentication required');
      return new Response(JSON.stringify({
        success: false,
        error: 'Authentication required'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401
      });
    }

    // Parse request body
    const { planName, planPrice, billingCycle }: PaymentRequest = await req.json()

    // Validate plan
    if (!PLAN_PRICES[planName as keyof typeof PLAN_PRICES]) {
      throw new Error('Invalid plan selected')
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    })

    // Calculate amount (Stripe uses cents)
    const amount = PLAN_PRICES[planName as keyof typeof PLAN_PRICES][billingCycle]

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        user_id: currentUser.id,
        plan_name: planName,
        billing_cycle: billingCycle,
        email: currentUser.email || '',
      },
    })

    // Store payment attempt in database
    const { error: dbError } = await supabaseClient
      .from('payment_attempts')
      .insert({
        user_id: currentUser.id,
        stripe_payment_intent_id: paymentIntent.id,
        plan_name: planName,
        amount: amount / 100, // Convert back to dollars for storage
        currency: 'usd',
        status: 'created',
        billing_cycle: billingCycle,
      })

    if (dbError) {
      console.error('Database error:', dbError)
      // Continue anyway, payment intent was created
    }

    return new Response(
      JSON.stringify({
        paymentIntent: paymentIntent.client_secret,
        publishableKey: Deno.env.get('STRIPE_PUBLISHABLE_KEY'),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Payment intent creation error:', error)

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
