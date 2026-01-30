import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@14.21.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
)

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return new Response('No signature', { status: 400 })
  }

  try {
    const body = await req.text()
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''
    )

    console.log(`Received event: ${event.type}`)

    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent)
        break

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent)
        break

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Webhook error:', error)
    return new Response(`Webhook error: ${error}`, { status: 400 })
  }
})

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent) {
  const { user_id, plan_name, billing_cycle } = paymentIntent.metadata

  if (!user_id || !plan_name) {
    console.error('Missing metadata in payment intent')
    return
  }

  try {
    // Update payment attempt status
    const { error: paymentError } = await supabaseClient
      .from('payment_attempts')
      .update({
        status: 'succeeded',
        processed_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', paymentIntent.id)

    if (paymentError) {
      console.error('Error updating payment attempt:', paymentError)
    }

    // Create successful payment record
    const { error: paymentsError } = await supabaseClient
      .from('payments')
      .insert({
        user_id,
        stripe_payment_intent_id: paymentIntent.id,
        amount: paymentIntent.amount / 100, // Convert from cents
        currency: paymentIntent.currency,
        status: 'succeeded',
        plan_name,
        billing_cycle,
        payment_method: 'stripe',
      })

    if (paymentsError) {
      console.error('Error creating payment record:', paymentsError)
    }

    // Update user's plan
    const { error: profileError } = await supabaseClient
      .from('profiles')
      .update({ plan_type: plan_name })
      .eq('id', user_id)

    if (profileError) {
      console.error('Error updating user plan:', profileError)
    } else {
      // Reset usage counts when plan changes
      console.log('🔄 Resetting usage counts for plan change...')
      try {
        // First, get the current total_used to preserve it
        const { data: currentUsage, error: fetchError } = await supabaseClient
          .from('diagnosis_usage')
          .select('total_used')
          .eq('user_id', user_id)
          .single()

        const totalUsed = currentUsage?.total_used || 0
        console.log('📊 Current total_used value:', totalUsed)

        // Now reset daily/weekly while preserving total_used
        const { error: usageResetError } = await supabaseClient
          .from('diagnosis_usage')
          .upsert({
            user_id,
            daily_used: 0,
            weekly_used: 0,
            total_used: totalUsed,
            last_reset_date: new Date().toISOString().split('T')[0],
            updated_at: new Date().toISOString(),
          })

        if (usageResetError) {
          console.error('⚠️ Warning: Could not reset usage counts:', usageResetError)
          // Don't fail the entire operation if usage reset fails
        } else {
          console.log('✅ Successfully reset usage counts for plan change')
          console.log('📊 Reset daily_used and weekly_used to 0, preserved total_used:', totalUsed)
        }
      } catch (usageError) {
        console.error('⚠️ Warning: Error resetting usage counts:', usageError)
        // Don't fail the entire operation if usage reset fails
      }
    }

    // Create plan change record
    const { error: planChangeError } = await supabaseClient
      .from('plan_changes')
      .insert({
        user_id,
        from_plan: 'Basic', // Assuming upgrade from Basic
        to_plan: plan_name,
        change_type: 'upgrade',
        billing_cycle,
        effective_date: new Date().toISOString(),
      })

    if (planChangeError) {
      console.error('Error creating plan change record:', planChangeError)
    }

    // Update subscription record (create or update)
    const { error: subscriptionError } = await supabaseClient
      .from('subscriptions')
      .upsert({
        user_id,
        plan_type: plan_name,
        status: 'active',
        billing_cycle,
        current_period_start: new Date().toISOString(),
        current_period_end: getNextBillingDate(billing_cycle),
        stripe_payment_intent_id: paymentIntent.id,
      })

    if (subscriptionError) {
      console.error('Error updating subscription:', subscriptionError)
    }

    console.log(`Successfully processed payment for user ${user_id}, plan: ${plan_name}`)
  } catch (error) {
    console.error('Error in handlePaymentSuccess:', error)
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    // Update payment attempt status
    const { error } = await supabaseClient
      .from('payment_attempts')
      .update({
        status: 'failed',
        processed_at: new Date().toISOString(),
      })
      .eq('stripe_payment_intent_id', paymentIntent.id)

    if (error) {
      console.error('Error updating failed payment attempt:', error)
    }

    console.log(`Payment failed for payment intent: ${paymentIntent.id}`)
  } catch (error) {
    console.error('Error in handlePaymentFailed:', error)
  }
}

function getNextBillingDate(billingCycle: string): string {
  const now = new Date()
  if (billingCycle === 'daily') {
    now.setDate(now.getDate() + 1)
  } else if (billingCycle === 'monthly') {
    now.setMonth(now.getMonth() + 1)
  }
  return now.toISOString()
}
