import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('🔍 Testing database access...')

    // Get Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    console.log('✅ Supabase client created')
    console.log('🔗 SUPABASE_URL:', Deno.env.get('SUPABASE_URL'))
    console.log('🔑 Service role key available:', !!Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'))

    // Test 1: Check if we can query the profiles table
    console.log('🧪 Test 1: Checking profiles table access...')
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('*')
      .limit(5)

    if (profilesError) {
      console.error('❌ Profiles table error:', profilesError)
      return new Response(
        JSON.stringify({
          success: false,
          test: 'profiles_table_access',
          error: profilesError,
          message: 'Could not access profiles table'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    console.log('✅ Profiles table accessible, found', profiles?.length || 0, 'profiles')
    console.log('📊 Sample profiles:', JSON.stringify(profiles, null, 2))

    // Test 2: Try to update a specific user's plan (if userId provided)
    const { userId, planName } = await req.json().catch(() => ({ userId: null, planName: null }))

    if (userId) {
      console.log('🧪 Test 2: Testing profile update for userId:', userId)

      // First check if profile exists
      const { data: existingProfile, error: checkError } = await supabaseClient
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (checkError) {
        console.error('❌ Profile check error:', checkError)
        return new Response(
          JSON.stringify({
            success: false,
            test: 'profile_check',
            userId,
            error: checkError,
            message: 'Profile not found or check failed'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 404,
          }
        )
      }

      console.log('✅ Found existing profile:', JSON.stringify(existingProfile, null, 2))

      if (planName) {
        console.log('🧪 Test 3: Testing profile update to plan:', planName)

        const { data: updateData, error: updateError } = await supabaseClient
          .from('profiles')
          .update({
            plan_type: planName,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .select()

        if (updateError) {
          console.error('❌ Profile update error:', updateError)
          return new Response(
            JSON.stringify({
              success: false,
              test: 'profile_update',
              userId,
              planName,
              error: updateError,
              message: 'Profile update failed'
            }),
            {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 500,
            }
          )
        }

        console.log('✅ Profile update successful:', JSON.stringify(updateData, null, 2))

        return new Response(
          JSON.stringify({
            success: true,
            test: 'complete',
            userId,
            planName,
            existingProfile,
            updateData,
            message: 'All database tests passed'
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        )
      }

      return new Response(
        JSON.stringify({
          success: true,
          test: 'profile_check_only',
          userId,
          existingProfile,
          message: 'Profile found, no update requested'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Return general database access test results
    return new Response(
      JSON.stringify({
        success: true,
        test: 'profiles_table_access_only',
        profilesCount: profiles?.length || 0,
        sampleProfiles: profiles?.slice(0, 2) || [],
        message: 'Database access test passed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('❌ Database access test error:', error)

    return new Response(
      JSON.stringify({
        success: false,
        test: 'general_error',
        error: error instanceof Error ? error.message : 'Unknown error',
        message: 'Database access test failed'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
