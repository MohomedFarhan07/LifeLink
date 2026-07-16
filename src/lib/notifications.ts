import { supabase } from '../lib/supabase';

export async function sendNotification(
  userId: string,
  type: string,
  title: string,
  body: string,
  link = ''
) {
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      type,
      title,
      body,
      link,
    });
  } catch (e) {
    console.error('Notification send failed:', e);
  }
}
