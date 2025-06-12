
-- إنشاء جدول المشتركين
CREATE TABLE IF NOT EXISTS subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  telegram_id VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255),
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255),
  phone VARCHAR(255),
  email VARCHAR(255),
  subscription_type VARCHAR(100) DEFAULT 'free',
  subscription_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subscription_end TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  total_earnings DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول المهام
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  priority VARCHAR(50) DEFAULT 'medium',
  assigned_to VARCHAR(255),
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول الفواتير
CREATE TABLE IF NOT EXISTS invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  subscriber_id UUID REFERENCES subscribers(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول الإشعارات
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'info',
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول إعدادات البوت
CREATE TABLE IF NOT EXISTS bot_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "botToken" VARCHAR(255),
  "botUsername" VARCHAR(255),
  "webhookUrl" VARCHAR(255),
  "isConnected" BOOLEAN DEFAULT false,
  "lastSync" TIMESTAMP WITH TIME ZONE,
  "notificationsEnabled" BOOLEAN DEFAULT true,
  "soundEnabled" BOOLEAN DEFAULT false,
  language VARCHAR(10) DEFAULT 'ar',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إنشاء جدول المشرفين
CREATE TABLE IF NOT EXISTS admin_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) DEFAULT 'admin',
  last_login TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- إدراج بيانات المشرف الافتراضي
INSERT INTO admin_profiles (username, full_name, email, role)
VALUES ('admin', 'مدير النظام', 'admin@taskmanager.com', 'admin')
ON CONFLICT (username) DO NOTHING;

-- إنشاء فهارس للأداء
CREATE INDEX IF NOT EXISTS idx_subscribers_telegram_id ON subscribers(telegram_id);
CREATE INDEX IF NOT EXISTS idx_subscribers_is_active ON subscribers(is_active);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_invoices_subscriber_id ON invoices(subscriber_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
