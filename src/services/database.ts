
import { supabase } from '../config/supabase';
import { Subscriber, Task, Invoice, Notification, BotSettings, AdminProfile } from '../types';

export class DatabaseService {
  // خدمات المشتركين
  static async getSubscribers(): Promise<Subscriber[]> {
    try {
      const { data, error } = await supabase
        .from('subscribers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(item => ({
        id: item.id,
        telegramId: item.telegram_id,
        username: item.username,
        firstName: item.first_name,
        lastName: item.last_name,
        phone: item.phone,
        email: item.email,
        subscriptionType: item.subscription_type,
        subscriptionStart: item.subscription_start,
        subscriptionEnd: item.subscription_end,
        isActive: item.is_active,
        totalEarnings: item.total_earnings,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      })) || [];
    } catch (error) {
      console.error('Error fetching subscribers:', error);
      return [];
    }
  }

  static async addSubscriber(subscriber: Omit<Subscriber, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('subscribers')
        .insert({
          telegram_id: subscriber.telegramId,
          username: subscriber.username,
          first_name: subscriber.firstName,
          last_name: subscriber.lastName,
          phone: subscriber.phone,
          email: subscriber.email,
          subscription_type: subscriber.subscriptionType,
          subscription_start: subscriber.subscriptionStart,
          subscription_end: subscriber.subscriptionEnd,
          is_active: subscriber.isActive,
          total_earnings: subscriber.totalEarnings,
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding subscriber:', error);
      return false;
    }
  }

  static async updateSubscriber(id: string, updates: Partial<Subscriber>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('subscribers')
        .update({
          username: updates.username,
          first_name: updates.firstName,
          last_name: updates.lastName,
          phone: updates.phone,
          email: updates.email,
          subscription_type: updates.subscriptionType,
          subscription_start: updates.subscriptionStart,
          subscription_end: updates.subscriptionEnd,
          is_active: updates.isActive,
          total_earnings: updates.totalEarnings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating subscriber:', error);
      return false;
    }
  }

  static async deleteSubscriber(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('subscribers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting subscriber:', error);
      return false;
    }
  }

  // خدمات المهام
  static async getTasks(): Promise<Task[]> {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(item => ({
        id: item.id,
        title: item.title,
        description: item.description,
        status: item.status,
        priority: item.priority,
        assignedTo: item.assigned_to,
        dueDate: item.due_date,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      })) || [];
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }
  }

  static async addTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('tasks')
        .insert({
          title: task.title,
          description: task.description,
          status: task.status,
          priority: task.priority,
          assigned_to: task.assignedTo,
          due_date: task.dueDate,
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding task:', error);
      return false;
    }
  }

  static async updateTask(id: string, updates: Partial<Task>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: updates.title,
          description: updates.description,
          status: updates.status,
          priority: updates.priority,
          assigned_to: updates.assignedTo,
          due_date: updates.dueDate,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating task:', error);
      return false;
    }
  }

  static async deleteTask(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting task:', error);
      return false;
    }
  }

  // خدمات الفواتير
  static async getInvoices(): Promise<Invoice[]> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select(`
          *,
          subscribers(first_name, last_name, username)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(item => ({
        id: item.id,
        subscriberId: item.subscriber_id,
        subscriberName: item.subscribers ? 
          `${item.subscribers.first_name} ${item.subscribers.last_name || ''}`.trim() : 
          'غير محدد',
        amount: item.amount,
        status: item.status,
        dueDate: item.due_date,
        description: item.description,
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      })) || [];
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return [];
    }
  }

  static async addInvoice(invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt' | 'subscriberName'>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('invoices')
        .insert({
          subscriber_id: invoice.subscriberId,
          amount: invoice.amount,
          status: invoice.status,
          due_date: invoice.dueDate,
          description: invoice.description,
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding invoice:', error);
      return false;
    }
  }

  static async updateInvoice(id: string, updates: Partial<Invoice>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          subscriber_id: updates.subscriberId,
          amount: updates.amount,
          status: updates.status,
          due_date: updates.dueDate,
          description: updates.description,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating invoice:', error);
      return false;
    }
  }

  static async deleteInvoice(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting invoice:', error);
      return false;
    }
  }

  // خدمات الإشعارات
  static async getNotifications(): Promise<Notification[]> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(item => ({
        id: item.id,
        title: item.title,
        message: item.message,
        type: item.type,
        isRead: item.is_read,
        createdAt: item.created_at,
      })) || [];
    } catch (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
  }

  static async addNotification(notification: Omit<Notification, 'id' | 'createdAt'>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          title: notification.title,
          message: notification.message,
          type: notification.type,
          is_read: notification.isRead,
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error adding notification:', error);
      return false;
    }
  }

  static async markNotificationAsRead(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }

  // خدمات الإعدادات
  static async getBotSettings(): Promise<BotSettings | null> {
    try {
      const { data, error } = await supabase
        .from('bot_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) {
        // إنشاء إعدادات افتراضية
        const defaultSettings: Omit<BotSettings, 'id'> = {
          botToken: '',
          botUsername: '',
          webhookUrl: '',
          isConnected: false,
          lastSync: '',
          notificationsEnabled: true,
          soundEnabled: false,
          language: 'ar',
        };

        const { data: newData, error: insertError } = await supabase
          .from('bot_settings')
          .insert(defaultSettings)
          .select()
          .single();

        if (insertError) throw insertError;
        
        return {
          botToken: newData.bot_token,
          botUsername: newData.bot_username,
          webhookUrl: newData.webhook_url,
          isConnected: newData.is_connected,
          lastSync: newData.last_sync,
          notificationsEnabled: newData.notifications_enabled,
          soundEnabled: newData.sound_enabled,
          language: newData.language,
        };
      }

      return {
        botToken: data.bot_token,
        botUsername: data.bot_username,
        webhookUrl: data.webhook_url,
        isConnected: data.is_connected,
        lastSync: data.last_sync,
        notificationsEnabled: data.notifications_enabled,
        soundEnabled: data.sound_enabled,
        language: data.language,
      };
    } catch (error) {
      console.error('Error fetching bot settings:', error);
      return null;
    }
  }

  static async updateBotSettings(settings: Partial<BotSettings>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('bot_settings')
        .upsert({
          bot_token: settings.botToken,
          bot_username: settings.botUsername,
          webhook_url: settings.webhookUrl,
          is_connected: settings.isConnected,
          last_sync: settings.lastSync,
          notifications_enabled: settings.notificationsEnabled,
          sound_enabled: settings.soundEnabled,
          language: settings.language,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating bot settings:', error);
      return false;
    }
  }

  // خدمة المشرف
  static async getAdminProfile(): Promise<AdminProfile | null> {
    try {
      const { data, error } = await supabase
        .from('admin_profiles')
        .select('*')
        .eq('username', 'admin')
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (!data) return null;

      return {
        id: data.id,
        username: data.username,
        fullName: data.full_name,
        email: data.email,
        role: data.role,
        lastLogin: data.last_login,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      console.error('Error fetching admin profile:', error);
      return null;
    }
  }

  static async updateAdminProfile(profile: Partial<AdminProfile>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('admin_profiles')
        .update({
          username: profile.username,
          full_name: profile.fullName,
          email: profile.email,
          last_login: profile.lastLogin,
          updated_at: new Date().toISOString(),
        })
        .eq('username', 'admin');

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating admin profile:', error);
      return false;
    }
  }
}
