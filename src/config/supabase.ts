
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://lxjnwggtkwcagmrswwbh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx4am53Z2d0a3djYWdtcnN3d2JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3NDU5NTUsImV4cCI6MjA2NTMyMTk1NX0.Tk0dWW6rgP10RTxjiOG2_n2ZFOWDsPcgNc3JOG5PJX4';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database schema types
export interface DatabaseSubscriber {
  id: string;
  telegram_id: string;
  username: string;
  first_name: string;
  last_name?: string;
  phone?: string;
  email?: string;
  subscription_type: string;
  subscription_start: string;
  subscription_end: string;
  is_active: boolean;
  total_earnings: number;
  created_at: string;
  updated_at: string;
}

export interface DatabaseTask {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  assigned_to?: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseInvoice {
  id: string;
  subscriber_id: string;
  amount: number;
  status: string;
  due_date: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}
