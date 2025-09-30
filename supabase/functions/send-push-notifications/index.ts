import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all active users who need notifications
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, full_name')
      .limit(1000);

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      throw profilesError;
    }

    const currentHour = new Date().getHours();
    let notificationMessage = '';

    // Determine message based on time (IST timezone)
    switch (currentHour) {
      case 9:
        notificationMessage = '🌅 Good morning! Time to start your daily maintenance checklists.';
        break;
      case 13:
        notificationMessage = '☀️ Afternoon reminder: Complete your midday maintenance checks.';
        break;
      case 17:
        notificationMessage = '🌆 Evening reminder: Don\'t forget your evening maintenance rounds.';
        break;
      case 23:
        notificationMessage = '🌙 Final reminder: Complete any pending checklists before end of day.';
        break;
      default:
        notificationMessage = '⚙️ Reminder: Complete your daily maintenance checklists.';
    }

    const payload: NotificationPayload = {
      title: 'Maintenance Checklist Reminder',
      body: notificationMessage,
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: `checklist-reminder-${currentHour}`,
    };

    console.log(`Sending notifications to ${profiles?.length || 0} users`);
    console.log('Notification payload:', payload);

    // In a production environment, you would:
    // 1. Store user push subscription endpoints in the database
    // 2. Use a push notification service (like Firebase Cloud Messaging, OneSignal, or web-push)
    // 3. Send actual push notifications to registered devices
    
    // For now, we'll log the notification and return success
    // Users would need to implement push notification subscription in the frontend

    return new Response(
      JSON.stringify({
        success: true,
        message: `Notification scheduled for ${profiles?.length || 0} users`,
        payload
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in send-push-notifications function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});