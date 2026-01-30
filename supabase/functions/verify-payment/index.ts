import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.21.0';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
Deno.serve(async (req)=>{
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    // Get Supabase client with service role key for database operations
    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    // Get current user from JWT token (optional for local development)
    const authHeader = req.headers.get('Authorization');
    let user = null;
    if (authHeader) {
      console.log('🔐 Authorization header found, attempting user verification...');
      const token = authHeader.replace('Bearer ', '');
      const userClient = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
        global: {
          headers: {
            Authorization: authHeader
          }
        }
      });
      try {
        const { data: { user: authUser }, error: userError } = await userClient.auth.getUser();
        if (userError) {
          console.log('⚠️ Auth verification failed (this is expected in local development):', userError.message);
          console.log('⚠️ Continuing without user verification for local development');
        } else {
          user = authUser;
          console.log('✅ User verified successfully:', user.email);
        }
      } catch (authException) {
        console.log('⚠️ Auth exception (this is expected in local development):', authException.message);
        console.log('⚠️ Continuing without user verification for local development');
      }
    } else {
      console.log('⚠️ No authorization header found');
    }
    // Require authentication - fail if no valid user
    if (!user) {
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
    const { paymentIntentClientSecret, planName, userId } = await req.json();
    // Validate that the user making the request matches the userId (only if user is available)
    if (user && user.id !== userId) {
      throw new Error('User ID mismatch');
    }
    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient()
    });
    // Extract payment intent ID from client secret
    const paymentIntentId = paymentIntentClientSecret.split('_secret_')[0];
    console.log('🔍 Verifying payment intent:', paymentIntentId);
    // Retrieve payment intent from Stripe to verify its status
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    console.log('💳 Payment intent status:', paymentIntent.status);
    console.log('💳 Payment intent amount:', paymentIntent.amount);
    console.log('💳 Payment intent metadata:', paymentIntent.metadata);
    // Check if payment was successful
    if (paymentIntent.status !== 'succeeded') {
      console.error('❌ Payment intent not successful:', paymentIntent.status);
      return new Response(JSON.stringify({
        success: false,
        error: `Payment status is ${paymentIntent.status}, not succeeded`
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        },
        status: 400
      });
    }
    // Verify the payment intent metadata matches what we expect
    const { user_id: metadataUserId, plan_name: metadataPlan } = paymentIntent.metadata;
    const userIdMatches = metadataUserId === userId;
    const planMatches = metadataPlan === planName;

    if (!userIdMatches || !planMatches) {
      console.error('❌ Payment intent metadata mismatch');
      console.error('Expected:', { userId, planName });
      console.error('Got:', { metadataUserId, metadataPlan });
      return new Response(JSON.stringify({
        success: false,
        error: 'Payment verification failed: metadata mismatch'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      });
    }

    console.log('✅ Payment intent metadata verification passed');
    console.log('✅ Payment verification successful, updating user plan...');
    console.log('🔄 About to update user plan for userId:', userId, 'to plan:', planName);
    // First, check if the user profile exists
    const { data: existingProfile, error: checkError } = await supabaseClient.from('profiles').select('*').eq('id', userId).single();
    if (checkError) {
      console.error('❌ Error checking existing profile:', checkError);
      console.error('❌ Check error code:', checkError.code);
      console.error('❌ Check error message:', checkError.message);
    } else {
      console.log('✅ Existing profile found:', JSON.stringify(existingProfile, null, 2));
    }
    // Update user's plan in the database
    console.log('🔄 Executing database update...');
    const { data: updateData, error: updateError } = await supabaseClient.from('profiles').update({
      plan_type: planName,
      updated_at: new Date().toISOString()
    }).eq('id', userId).select();
    console.log('📊 Update operation completed');
    console.log('📊 Update data:', JSON.stringify(updateData, null, 2));
    console.log('📊 Update error:', JSON.stringify(updateError, null, 2));
    if (updateError) {
      console.error('❌ Error updating user plan:', updateError);
      console.error('❌ User ID that failed:', userId);
      return new Response(JSON.stringify({
        success: false,
        error: 'Failed to update user plan'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      });
    } else if (updateData && updateData.length === 0) {
      console.error('❌ No user profile found with ID:', userId);
      return new Response(JSON.stringify({
        success: false,
        error: 'User profile not found'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      });
    } else {
      console.log('✅ Successfully updated user plan in database');

      // Reset usage counts when plan changes
      console.log('🔄 Resetting usage counts for plan change...');
      try {
        // First, get the current total_used to preserve it
        const { data: currentUsage, error: fetchError } = await supabaseClient
          .from('diagnosis_usage')
          .select('total_used')
          .eq('user_id', userId)
          .single();

        const totalUsed = currentUsage?.total_used || 0;
        console.log('📊 Current total_used value:', totalUsed);

        // Now reset daily/weekly while preserving total_used
        const { error: usageResetError } = await supabaseClient
          .from('diagnosis_usage')
          .upsert({
            user_id: userId,
            daily_used: 0,
            weekly_used: 0,
            total_used: totalUsed,
            last_reset_date: new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString(),
          });

        if (usageResetError) {
          console.error('⚠️ Warning: Could not reset usage counts:', usageResetError);
          // Don't fail the entire operation if usage reset fails
        } else {
          console.log('✅ Successfully reset usage counts for plan change');
          console.log('📊 Reset daily_used and weekly_used to 0, preserved total_used:', totalUsed);
        }
      } catch (usageError) {
        console.error('⚠️ Warning: Error resetting usage counts:', usageError);
        // Don't fail the entire operation if usage reset fails
      }
    }
    // Create payment record for tracking
    const { error: paymentRecordError } = await supabaseClient.from('payment_attempts').update({
      status: 'succeeded',
      processed_at: new Date().toISOString()
    }).eq('stripe_payment_intent_id', paymentIntentId);
    if (paymentRecordError) {
      console.error('⚠️ Warning: Could not update payment record:', paymentRecordError);
    // Don't fail the entire operation if payment record update fails
    }
    console.log('✅ Successfully updated user plan to:', planName);
    // Verify the update by reading the profile again
    console.log('🔍 Verifying the database update...');
    const { data: verificationProfile, error: verifyError } = await supabaseClient.from('profiles').select('*').eq('id', userId).single();
    if (verifyError) {
      console.error('❌ Error verifying update:', verifyError);
    } else {
      console.log('🔍 Profile after update:', JSON.stringify(verificationProfile, null, 2));
      console.log('🔍 Current plan_type in DB:', verificationProfile.plan_type);
      console.log('🔍 Expected plan_type:', planName);
      console.log('🔍 Update verification:', verificationProfile.plan_type === planName ? '✅ SUCCESS' : '❌ MISMATCH');
    }
    return new Response(JSON.stringify({
      success: true,
      planName,
      paymentIntentId,
      message: 'Payment verified and plan updated successfully'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('❌ Payment verification error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Payment verification failed'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});
