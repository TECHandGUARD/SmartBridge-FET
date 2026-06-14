// supabase/functions/expire-subscriptions/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Create Supabase client with service role key
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Get the authorization header to verify admin role
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the user from the auth token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin (from user_profiles table)
    const { data: profile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('role')
      .eq('email', user.email)
      .single();

    if (profileError || !profile || profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const today = new Date().toISOString().split('T')[0];

    // Get active subscriptions
    const { data: activeSubs, error: subsError } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('status', 'active');

    if (subsError) {
      throw new Error(`Failed to fetch subscriptions: ${subsError.message}`);
    }

    // Find expired subscriptions
    const expired = (activeSubs || []).filter(s => s.end_date && s.end_date < today);

    // Update expired subscriptions to inactive
    let deactivatedCount = 0;
    for (const sub of expired) {
      const { error: updateError } = await supabaseClient
        .from('subscriptions')
        .update({ 
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('id', sub.id);

      if (!updateError) {
        deactivatedCount++;
      }
    }

    // Log this activity
    await supabaseClient
      .from('activity_logs')
      .insert({
        event_type: 'subscription_expiry_cron',
        user_email: user.email,
        description: `Deactivated ${deactivatedCount} expired subscription(s)`,
      });

    return new Response(
      JSON.stringify({ 
        expired: deactivatedCount, 
        message: `Deactivated ${deactivatedCount} expired subscription(s).`,
        total_expired_found: expired.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
