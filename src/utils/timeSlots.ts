import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import type { SupabaseClient } from '@supabase/supabase-js';

// Time slot management for IST timezone (UTC+5:30)
export const TIME_SLOTS = [
  { session: 1, hour: 8, minute: 0, label: '8:00 AM' },
  { session: 2, hour: 12, minute: 0, label: '12:00 PM' },
  { session: 3, hour: 17, minute: 30, label: '5:30 PM' },
  { session: 4, hour: 23, minute: 45, label: '11:45 PM' },
] as const;

const IST_TIMEZONE = 'Asia/Kolkata';

// Convert any date to IST timezone
export const toIST = (date: Date): Date => {
  return toZonedTime(date, IST_TIMEZONE);
};

// Get current IST time
export const getCurrentIST = (): Date => {
  return toZonedTime(new Date(), IST_TIMEZONE);
};

// Get current session number based on IST time
export const getCurrentSession = (): number | null => {
  const now = getCurrentIST();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  // Check if we're within 30 minutes before or after each time slot
  const WINDOW_MINUTES = 30;

  for (const slot of TIME_SLOTS) {
    const slotTime = slot.hour * 60 + slot.minute;
    const timeDiff = currentTime - slotTime;
    
    // Allow access 30 minutes before and after the time slot
    if (timeDiff >= -WINDOW_MINUTES && timeDiff <= WINDOW_MINUTES) {
      return slot.session;
    }
  }

  return null; // Not in any valid time window
};

// Get the next available time slot
export const getNextTimeSlot = (): { session: number; time: string } | null => {
  const now = getCurrentIST();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTime = currentHour * 60 + currentMinute;

  // Find the next slot after the current time (not within current window)
  for (const slot of TIME_SLOTS) {
    const slotTime = slot.hour * 60 + slot.minute;
    const slotStartTime = slotTime - 30; // Start of the 30-minute window
    
    // If we haven't reached the start of this slot's window, it's the next available
    if (currentTime < slotStartTime) {
      return { session: slot.session, time: slot.label };
    }
  }

  // If we're past all slots today, return the first slot of tomorrow
  return { session: TIME_SLOTS[0].session, time: `${TIME_SLOTS[0].label} (Tomorrow)` };
};

// Format time slot for display
export const formatTimeSlot = (sessionNumber: number): string => {
  const slot = TIME_SLOTS.find(s => s.session === sessionNumber);
  return slot ? slot.label : 'Unknown';
};

// Check if user has already completed a session today
export const hasCompletedSession = async (
  userId: string,
  sessionNumber: number,
  supabase: SupabaseClient
): Promise<boolean> => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from('completed_checklists')
    .select('id')
    .eq('user_id', userId)
    .eq('session_number', sessionNumber)
    .gte('completed_at', todayStart.toISOString())
    .limit(1);

  if (error) {
    console.error('Error checking session completion:', error);
    return false;
  }

  return (data?.length || 0) > 0;
};