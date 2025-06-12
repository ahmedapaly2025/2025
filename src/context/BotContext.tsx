import React, { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { Subscriber, Task, Invoice, BotStats, BotSettings, Notification, Language } from '../types';
import { generateBotMockData } from '../utils/botMockData';
import { useTranslation } from '../utils/translations';
import { DatabaseService } from '../services/database';

interface BotContextType {
  stats: BotStats;
  subscribers: Subscriber[];
  tasks: Task[];
  invoices: Invoice[];
  settings: BotSettings;
  notifications: Notification[];
  revenueData: Array<{ date: string; value: number }>;
  subscriberData: Array<{ date: string; value: number }>;
  commandUsageData: Array<{ name: string; value: number }>;
  taskCompletionData: Array<{ name: string; value: number }>;
  
  // Actions
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'completedBy'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  
  createInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt'>) => void;
  updateInvoice: (id: string, updates: Partial<Invoice>) => void;
  
  updateSettings: (settings: Partial<BotSettings>) => void;
  testBotConnection: () => Promise<boolean>;
  
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearAllNotifications: () => void;
  
  // Export functions
  exportReports: (type: string, timeRange: string) => void;
  exportInvoices: () => void;

  // Real bot integration
  addSubscriberFromTelegram: (telegramUser: any) => void;
  simulateWebhookMessage: (message: any) => void;
  
  // Subscriber management
  updateSubscriber: (id: string, updates: Partial<Subscriber>) => void;
  deleteSubscriber: (id: string) => void;
  addSubscriber: (subscriber: Omit<Subscriber, 'id'>) => void;

  // Task and Invoice notifications
  sendTaskToTechnician: (taskId: string, forceResend?: boolean) => void;
  sendInvoiceToTechnician: (invoiceId: string) => void;
  sendLocationToTechnician: (taskId: string, forceResend?: boolean) => void;

  // 🔥 NEW: إرسال رسائل مباشرة للفنيين
  sendDirectMessageToTechnician: (userId: string, message: string) => Promise<boolean>;
  sendCustomTaskToTechnicians: (technicianIds: string[], taskData: any) => Promise<boolean>;

  // Telegram polling for testing
  startTelegramPolling: () => void;
  stopTelegramPolling: () => void;
  isPolling: boolean;
  clearWebhook: () => Promise<boolean>;
  loading: boolean;
}

const BotContext = createContext<BotContextType | undefined>(undefined);

export const BotProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const mockData = generateBotMockData();
  
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  
  const [tasks, setTasks] = useState<Task[]>([]);
  
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  
  const [settings, setSettings] = useState<BotSettings>({
    botToken: '',
    botUsername: '',
    webhookUrl: '',
    isConnected: false,
    lastSync: '',
    notificationsEnabled: true,
    soundEnabled: false,
    language: 'ar',
  });
  
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const [isPolling, setIsPolling] = useState(false);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const [lastUpdateId, setLastUpdateId] = useState(0);
  
  // 🔥 CRITICAL: نظام منع التكرار المطلق - محسن ومبسط
  const [processedUserIds, setProcessedUserIds] = useState<Set<string>>(new Set());
  const [lastMessageIds, setLastMessageIds] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  // تحميل البيانات من قاعدة البيانات عند التحميل الأول
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [
          subscribersData,
          tasksData,
          invoicesData,
          notificationsData,
          settingsData
        ] = await Promise.all([
          DatabaseService.getSubscribers(),
          DatabaseService.getTasks(),
          DatabaseService.getInvoices(),
          DatabaseService.getNotifications(),
          DatabaseService.getBotSettings()
        ]);

        setSubscribers(subscribersData);
        setTasks(tasksData);
        setInvoices(invoicesData);
        setNotifications(notificationsData);
        if (settingsData) {
          setSettings(settingsData);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // تحديث قائمة المستخدمين المسجلين عند تغيير المشتركين
  useEffect(() => {
    const userIds = new Set(subscribers.map(s => s.userId));
    setProcessedUserIds(userIds);
  }, [subscribers]);

  // إزالة webhook بسيط
  const clearWebhook = async (): Promise<boolean> => {
    if (!settings.botToken) return false;

    try {
      await fetch(`https://api.telegram.org/bot${settings.botToken}/setWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: '', drop_pending_updates: true })
      });
      
      await fetch(`https://api.telegram.org/bot${settings.botToken}/deleteWebhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drop_pending_updates: true })
      });
      
      return true;
    } catch (error) {
      return true;
    }
  };

  const startTelegramPolling = async () => {
    if (isPolling) return;

    if (!settings.botToken || !settings.isConnected) {
      addNotification({
        type: 'system',
        title: '⚠️ لا يمكن بدء الاستقبال',
        message: 'تأكد من الاتصال بالبوت أولاً'
      });
      return;
    }
    
    console.log('🚀 بدء استقبال الرسائل...');
    
    // إزالة webhook
    await clearWebhook();
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    setIsPolling(true);
    
    const pollForUpdates = async () => {
      try {
        const response = await fetch(`https://api.telegram.org/bot${settings.botToken}/getUpdates?offset=${lastUpdateId + 1}&timeout=5&limit=1`);
        
        if (!response.ok) {
          if (response.status === 409) {
            console.log('⚠️ تعارض 409 - سنتجاهله');
            return;
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.ok && data.result.length > 0) {
          for (const update of data.result) {
            setLastUpdateId(update.update_id);
            
            if (update.message) {
              console.log('📨 رسالة جديدة:', update.message.text);
              await handleTelegramMessage(update.message);
            } else if (update.callback_query) {
              console.log('🔄 استقبال ضغط زر:', update.callback_query.data);
              await handleCallbackQuery(update.callback_query);
            }
          }
        }
      } catch (error) {
        console.error('❌ خطأ في استقبال الرسائل:', error);
      }
    };
    
    // استطلاع كل 10 ثوانٍ
    const interval = setInterval(pollForUpdates, 10000);
    setPollingInterval(interval);
    
    addNotification({
      type: 'system',
      title: '🚀 بدء استقبال الرسائل',
      message: 'البوت يستقبل الرسائل من التليجرام الآن!'
    });
    
    console.log('✅ تم بدء الاستقبال بنجاح');
  };

  const stopTelegramPolling = () => {
    if (!isPolling) return;
    
    console.log('⏹️ إيقاف استقبال الرسائل...');
    setIsPolling(false);
    
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    
    addNotification({
      type: 'system',
      title: '⏹️ تم إيقاف استقبال الرسائل',
      message: 'تم إيقاف استقبال الرسائل من التليجرام'
    });
  };

  // 🔥 CRITICAL: فحص إذا تم معالجة هذه الرسالة بالضبط مسبقاً
  const isDuplicateMessage = (userId: string, messageId: number): boolean => {
    const lastMessageId = lastMessageIds.get(userId);
    
    if (lastMessageId && messageId <= lastMessageId) {
      console.log(`🚫 رسالة مكررة من المستخدم ${userId}: messageId ${messageId} <= ${lastMessageId}`);
      return true;
    }
    
    // تحديث آخر message ID لهذا المستخدم
    setLastMessageIds(prev => new Map(prev.set(userId, messageId)));
    return false;
  };

  // 🔥 CRITICAL: فحص إذا كان المستخدم مسجل مسبقاً
  const isUserAlreadyRegistered = (userId: string): boolean => {
    return processedUserIds.has(userId);
  };

  const handleTelegramMessage = async (message: any) => {
    console.log('📨 معالجة رسالة:', message.text);
    
    try {
      const userId = message.from.id.toString();
      const messageText = message.text?.trim();
      const messageId = message.message_id;
      
      // 🔥 CRITICAL: فحص التكرار المطلق
      if (isDuplicateMessage(userId, messageId)) {
        return; // تجاهل الرسالة المكررة تماماً
      }
      
      if (message.text === '/start') {
        // 🔥 CRITICAL: فحص إذا كان المستخدم مسجل مسبقاً
        if (isUserAlreadyRegistered(userId)) {
          console.log('👋 مستخدم موجود - رسالة ترحيب بسيطة');
          
          const { t } = useTranslation(settings.language);
          const welcomeBackText = t('welcomeBackMessage', { name: message.from.first_name });
          
          await sendTelegramMessage(message.chat.id, welcomeBackText);
          
        } else {
          console.log('👤 مستخدم جديد - تسجيل واحد فقط');
          
          // 🔥 CRITICAL: تسجيل المستخدم فوراً في القائمة لمنع التكرار
          setProcessedUserIds(prev => new Set([...prev, userId]));
          
          const newSubscriber = addSubscriberFromTelegram(message.from);
          
          // رسالة ترحيب للمستخدم الجديد
          const { t } = useTranslation(settings.language);
          const welcomeText = t('welcomeMessage', { name: message.from.first_name });
          
          await sendTelegramMessage(message.chat.id, welcomeText);
          
          // إشعار واحد فقط في النظام
          addNotification({
            type: 'new_subscriber',
            title: '🎉 فني جديد انضم!',
            message: `انضم ${newSubscriber.firstName} ${newSubscriber.lastName || ''} (@${newSubscriber.username}) إلى النظام`,
            userId: newSubscriber.id
          });
        }
      } else {
        // 🔥 NEW: معالجة جميع الرسائل الأخرى كرسائل من الفنيين
        const subscriber = subscribers.find(s => s.userId === userId);
        
        if (subscriber) {
          // 🔥 NEW: رسالة عادية من الفني - إشعار للإدارة
          console.log(`💬 رسالة من الفني ${subscriber.firstName}: ${messageText}`);
          
          addNotification({
            type: 'technician_message',
            title: `💬 رسالة من ${subscriber.firstName} ${subscriber.lastName || ''}`,
            message: messageText,
            userId: subscriber.id
          });
        } else {
          // مستخدم غير مسجل
          console.log(`⚠️ المستخدم ${userId} غير مسجل في النظام`);
          await sendTelegramMessage(message.chat.id, '⚠️ يجب تسجيل الدخول أولاً بإرسال /start');
        }
      }
    } catch (error) {
      console.error('❌ خطأ في معالجة الرسالة:', error);
    }
  };

  // معالجة ضغط الأزرار
  const handleCallbackQuery = async (callbackQuery: any) => {
    try {
      const userId = callbackQuery.from.id.toString();
      const data = callbackQuery.data;
      const message = callbackQuery.message;
      const chatId = message.chat.id;
      
      // إجابة فورية لإزالة حالة التحميل على الزر
      await answerCallbackQuery(callbackQuery.id);
      
      const subscriber = subscribers.find(s => s.userId === userId);
      if (!subscriber) {
        console.log(`❌ فني غير موجود: ${userId}`);
        return;
      }
      
      if (data === 'ACCEPT_TASK') {
        // معالجة قبول المهمة
        await handleTaskAcceptance(subscriber);
        
        // إشعار للإدارة
        addNotification({
          type: 'task_accepted', // تم التعديل هنا
          title: '✅ تم قبول المهمة',
          message: `قبل ${subscriber.firstName} ${subscriber.lastName || ''} المهمة`,
          userId: subscriber.id
        });
        
        // تحديث الرسالة الأصلية لإزالة الأزرار
        await sendTelegramMessage(chatId, '✅ تم قبول المهمة بنجاح', { remove_keyboard: true });
        
      } else if (data === 'REJECT_TASK') {
        // معالجة رفض المهمة
        await handleTaskRejection(subscriber);
        
        // إشعار للإدارة
        addNotification({
          type: 'task_rejected', // تم التعديل هنا
          title: '❌ تم رفض المهمة',
          message: `رفض ${subscriber.firstName} ${subscriber.lastName || ''} المهمة`,
          userId: subscriber.id
        });
        
        // تحديث الرسالة الأصلية لإزالة الأزرار
        await sendTelegramMessage(chatId, '❌ تم رفض المهمة', { remove_keyboard: true });
      }
    } catch (error) {
      console.error('❌ خطأ في معالجة ضغط الزر:', error);
      addNotification({
        type: 'system',
        title: '❌ خطأ في معالجة الزر',
        message: `حدث خطأ أثناء معالجة ضغط الزر: ${error.message}`
      });
    }
  };

  // إجابة فورية على ضغط الزر
  const answerCallbackQuery = async (callbackQueryId: string) => {
    try {
      await fetch(`https://api.telegram.org/bot${settings.botToken}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackQueryId })
      });
    } catch (error) {
      console.error('❌ خطأ في إرسال إجابة ضغط الزر:', error);
    }
  };

  // 🔥 CRITICAL: معالجة قبول المهمة - محسنة ومبسطة
  const handleTaskAcceptance = async (subscriber: Subscriber) => {
    // البحث عن آخر مهمة نشطة تم إرسالها لهذا الفني
    const availableTask = tasks.find(t => 
      t.status === 'active' && 
      !t.acceptedBy && 
      (t.type === 'group' || t.targetUsers.includes(subscriber.id))
    );
    
    if (availableTask) {
      // تحديث حالة المهمة - إضافة acceptedBy
      setTasks(prev => prev.map(t => 
        t.id === availableTask.id 
          ? { ...t, acceptedBy: subscriber.id, status: 'in_progress' } // تم التعديل هنا
          : t
      ));
      
      // رد للفني
      const { t } = useTranslation(settings.language);
      const acceptText = t('taskAcceptedMessage', {
        title: availableTask.title,
        cost: availableTask.expectedCost.toString()
      });
      
      await sendTelegramMessage(parseInt(subscriber.userId), acceptText);
      
      console.log(`✅ تم قبول المهمة ${availableTask.title} من قبل ${subscriber.firstName}`);
      
    } else {
      await sendTelegramMessage(parseInt(subscriber.userId), 'لا توجد مهام متاحة حالياً.');
    }
  };

  // 🔥 CRITICAL: معالجة رفض المهمة - محسنة ومبسطة
  const handleTaskRejection = async (subscriber: Subscriber) => {
    const availableTask = tasks.find(t => 
      t.status === 'active' && 
      !t.acceptedBy && 
      (t.type === 'group' || t.targetUsers.includes(subscriber.id))
    );
    
    if (availableTask) {
      // رد للفني
      const { t } = useTranslation(settings.language);
      const rejectText = t('taskRejectedMessage', { title: availableTask.title });
      
      await sendTelegramMessage(parseInt(subscriber.userId), rejectText);
      
      console.log(`❌ تم رفض المهمة ${availableTask.title} من قبل ${subscriber.firstName}`);
    } else {
      await sendTelegramMessage(parseInt(subscriber.userId), 'لا توجد مهام متاحة حالياً.');
    }
  };

  const sendTelegramMessage = async (chatId: number, text: string, replyMarkup?: any) => {
    try {
      const response = await fetch(`https://api.telegram.org/bot${settings.botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: text,
          parse_mode: 'HTML',
          reply_markup: replyMarkup
        })
      });
      
      const data = await response.json();
      if (data.ok) {
        console.log('✅ تم إرسال الرسالة بنجاح');
        return data.result;
      } else {
        if (data.description === 'Forbidden: bot was blocked by the user') {
          const subscriber = subscribers.find(s => s.userId === chatId.toString());
          if (subscriber) {
            setSubscribers(prev => prev.map(s => 
              s.id === subscriber.id 
                ? { ...s, isActive: false }
                : s
            ));
          }
          console.log(`⚠️ المستخدم ${chatId} حظر البوت`);
        } else {
          console.error('❌ فشل إرسال الرسالة:', data.description);
        }
      }
    } catch (error) {
      console.error('❌ خطأ في إرسال الرسالة:', error);
    }
  };

  // 🔥 NEW: إرسال رسالة مباشرة لفني محدد
  const sendDirectMessageToTechnician = async (userId: string, message: string): Promise<boolean> => {
    if (!settings.isConnected || !settings.botToken) {
      addNotification({
        type: 'system',
        title: '⚠️ البوت غير متصل',
        message: 'يجب الاتصال بالبوت أولاً'
      });
      return false;
    }

    const technician = subscribers.find(s => s.userId === userId);
    if (!technician) {
      addNotification({
        type: 'system',
        title: '⚠️ فني غير موجود',
        message: 'لا يمكن العثور على الفني'
      });
      return false;
    }

    try {
      await sendTelegramMessage(parseInt(userId), message);
      
      addNotification({
        type: 'system',
        title: '📤 تم إرسال الرسالة',
        message: `تم إرسال رسالة إلى ${technician.firstName} ${technician.lastName || ''}`,
        userId: technician.id
      });
      
      return true;
    } catch (error) {
      console.error('❌ خطأ في إرسال الرسالة المباشرة:', error);
      return false;
    }
  };

  // 🔥 NEW: إرسال مهمة مخصصة لفنيين محددين
  const sendCustomTaskToTechnicians = async (technicianIds: string[], taskData: any): Promise<boolean> => {
    if (!settings.isConnected || !settings.botToken) {
      addNotification({
        type: 'system',
        title: '⚠️ البوت غير متصل',
        message: 'يجب الاتصال بالبوت أولاً'
      });
      return false;
    }

    const targetTechnicians = subscribers.filter(s => technicianIds.includes(s.id) && s.isActive);
    
    if (targetTechnicians.length === 0) {
      addNotification({
        type: 'system',
        title: '⚠️ لا يوجد فنيين',
        message: 'لا يوجد فنيين نشطين محددين'
      });
      return false;
    }

    let sentCount = 0;
    
    for (const technician of targetTechnicians) {
      try {
        // 🔥 NEW: استخدام الأزرار بدلاً من النص
        const replyMarkup = {
          inline_keyboard: [
            [
              { text: '✅ OK', callback_data: 'ACCEPT_TASK' },
              { text: '❌ NO / NOT / NAW', callback_data: 'REJECT_TASK' }
            ]
          ]
        };
        
        const message = `📌 مهمة مخصصة:\n\n🔧 ${taskData.title}\n📝 ${taskData.description}\n\n💰 التكلفة: ${taskData.cost} ريال`;
        
        await sendTelegramMessage(parseInt(technician.userId), message, replyMarkup);
        sentCount++;
        
        // تأخير بين الرسائل
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`❌ خطأ في إرسال المهمة للفني ${technician.firstName}:`, error);
      }
    }
    
    addNotification({
      type: 'system',
      title: '📤 تم إرسال المهمة المخصصة',
      message: `تم إرسال المهمة "${taskData.title}" إلى ${sentCount} فني`,
    });
    
    return sentCount > 0;
  };

  const sendTaskToTechnician = async (taskId: string, forceResend: boolean = false) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || !settings.isConnected || !settings.botToken) {
      return;
    }

    const targetTechnicians = task.type === 'group' 
      ? subscribers.filter(s => s.isActive)
      : task.targetUsers.map(id => subscribers.find(s => s.id === id)).filter(Boolean);

    if (targetTechnicians.length === 0) {
      addNotification({
        type: 'system',
        title: '⚠️ لا يوجد فنيين',
        message: 'لا يوجد فنيين نشطين لإرسال المهمة إليهم'
      });
      return;
    }

    let sentCount = 0;
    
    for (const technician of targetTechnicians) {
      if (technician) {
        // 🔥 NEW: إرسال المهمة مع الأزرار
        const replyMarkup = {
          inline_keyboard: [
            [
              { text: '✅ OK', callback_data: 'ACCEPT_TASK' },
              { text: '❌ NO / NOT / NAW', callback_data: 'REJECT_TASK' }
            ]
          ]
        };
        
        const { t } = useTranslation(settings.language);
        const message = t('taskAvailable', {
          title: task.title,
          description: task.description,
          cost: task.expectedCost.toString(),
          startDate: new Date(task.startDate).toLocaleDateString(settings.language === 'ar' ? 'ar' : 'de'),
          endDate: new Date(task.endDate).toLocaleDateString(settings.language === 'ar' ? 'ar' : 'de')
        });

        await sendTelegramMessage(parseInt(technician.userId), message, replyMarkup);
        sentCount++;
        
        // تأخير بين الرسائل لتجنب spam
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    // إشعار واحد فقط
    addNotification({
      type: 'system',
      title: forceResend ? '🔄 تم إعادة إرسال المهمة' : '📤 تم إرسال المهمة',
      message: `تم ${forceResend ? 'إعادة ' : ''}إرسال المهمة "${task.title}" إلى ${sentCount} فني`,
    });
  };

  const sendInvoiceToTechnician = async (invoiceId: string) => {
    const invoice = invoices.find(i => i.id === invoiceId);
    if (!invoice || !settings.isConnected || !settings.botToken) {
      return;
    }

    const technician = subscribers.find(s => s.id === invoice.subscriberId);
    if (!technician) {
      addNotification({
        type: 'system',
        title: '⚠️ فني غير موجود',
        message: 'لا يمكن العثور على الفني المرتبط بالفاتورة'
      });
      return;
    }

    const message = `💰 فاتورة جديدة!\n\n📋 ${invoice.description}\n💵 المبلغ: ${invoice.amount} ريال\n📅 تاريخ الاستحقاق: ${new Date(invoice.dueDate).toLocaleDateString('ar')}\n\n${invoice.taskTitle ? `🔧 المهمة: ${invoice.taskTitle}\n` : ''}${invoice.actualCost ? `💸 التكلفة الفعلية: ${invoice.actualCost} ريال\n` : ''}${invoice.commission ? `🎯 العمولة: ${invoice.commission} ريال\n` : ''}\n📊 حالة الدفع: ${invoice.status === 'pending' ? 'معلقة ⏳' : invoice.status === 'paid' ? 'مدفوعة ✅' : 'ملغية ❌'}\n\n💡 سيتم التواصل معك لترتيب الدفع.`;

    await sendTelegramMessage(parseInt(technician.userId), message);
    
    addNotification({
      type: 'system',
      title: '💰 تم إرسال الفاتورة',
      message: `تم إرسال فاتورة بمبلغ ${invoice.amount} ريال إلى ${technician.firstName} ${technician.lastName || ''}`,
      userId: technician.id
    });
  };

  const sendLocationToTechnician = async (taskId: string, forceResend: boolean = false) => {
    const task = tasks.find(t => t.id === taskId);
    
    if (!task || !task.locationUrl || !settings.isConnected || !settings.botToken) {
      console.log('⚠️ شروط إرسال الموقع غير مكتملة');
      
      addNotification({
        type: 'system',
        title: '⚠️ لا يمكن إرسال الموقع',
        message: !task ? 'المهمة غير موجودة' : 
                !task.locationUrl ? 'لا يوجد موقع محدد للمهمة' :
                'البوت غير متصل'
      });
      return;
    }

    // 🔥 CRITICAL: التحقق من وجود فني قبل المهمة
    if (!task.acceptedBy) {
      addNotification({
        type: 'system',
        title: '⚠️ لا يوجد فني قبل المهمة',
        message: 'يجب أن يقبل فني المهمة أولاً قبل إرسال الموقع'
      });
      return;
    }

    // تحديد الفني الذي قبل المهمة فقط
    const targetTechnician = subscribers.find(s => s.id === task.acceptedBy);

    if (!targetTechnician) {
      addNotification({
        type: 'system',
        title: '⚠️ الفني غير موجود',
        message: 'لا يمكن العثور على الفني الذي قبل المهمة'
      });
      return;
    }

    console.log(`📍 إرسال الموقع للفني ${targetTechnician.firstName} ${targetTechnician.lastName || ''}`);

    // رسالة الموقع
    const { t } = useTranslation(settings.language);
    const message = t('locationMessage', {
      title: task.title,
      location: task.locationUrl
    });

    await sendTelegramMessage(parseInt(targetTechnician.userId), message);
    
    // إشعار واحد فقط
    addNotification({
      type: 'system',
      title: forceResend ? '🔄 تم إعادة إرسال الموقع' : '📍 تم إرسال الموقع',
      message: `تم ${forceResend ? 'إعادة ' : ''}إرسال موقع المهمة "${task.title}" إلى ${targetTechnician.firstName} ${targetTechnician.lastName || ''}`,
      userId: targetTechnician.id
    });
    
    console.log('📍 تم إرسال الموقع بنجاح');
  };

  const addSubscriberFromTelegram = (telegramUser: any) => {
    const userId = telegramUser.id.toString();
    
    // 🔥 CRITICAL: فحص دقيق للمكررات - لا يجب أن يصل هنا إذا كان موجود
    const existingSubscriber = subscribers.find(s => s.userId === userId);
    
    if (!existingSubscriber) {
      const newSubscriber: Subscriber = {
        id: `telegram_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: userId,
        username: telegramUser.username || `user_${telegramUser.id}`,
        firstName: telegramUser.first_name || 'مستخدم',
        lastName: telegramUser.last_name || '',
        joinedAt: new Date().toISOString(),
        isActive: true,
        tasksCompleted: 0,
        totalEarnings: 0,
        profession: 'فني'
      };

      setSubscribers(prev => [...prev, newSubscriber]);
      console.log('✅ تم إضافة فني جديد:', newSubscriber);
      return newSubscriber;
    }

    console.log('⚠️ المستخدم موجود بالفعل');
    return existingSubscriber;
  };

  const simulateWebhookMessage = (message: any) => {
    if (message.text === '/start') {
      const subscriber = addSubscriberFromTelegram(message.from);
      
      addNotification({
        type: 'system',
        title: 'تم إرسال رسالة ترحيبية',
        message: `تم إرسال رسالة ترحيبية إلى ${subscriber.firstName}`,
        userId: subscriber.id
      });
    }
  };

  const addSubscriber = async (subscriber: Omit<Subscriber, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> => {
    try {
      const success = await DatabaseService.addSubscriber(subscriber);
      if (success) {
        const updatedSubscribers = await DatabaseService.getSubscribers();
        setSubscribers(updatedSubscribers);
      }
      return success;
    } catch (error) {
      console.error('Error adding subscriber:', error);
      return false;
    }
  };

  const updateSubscriber = async (id: string, updates: Partial<Subscriber>): Promise<boolean> => {
    try {
      const success = await DatabaseService.updateSubscriber(id, updates);
      if (success) {
        const updatedSubscribers = await DatabaseService.getSubscribers();
        setSubscribers(updatedSubscribers);
      }
      return success;
    } catch (error) {
      console.error('Error updating subscriber:', error);
      return false;
    }
  };

  const deleteSubscriber = async (id: string): Promise<boolean> => {
    try {
      const success = await DatabaseService.deleteSubscriber(id);
      if (success) {
        const updatedSubscribers = await DatabaseService.getSubscribers();
        setSubscribers(updatedSubscribers);
      }
      return success;
    } catch (error) {
      console.error('Error deleting subscriber:', error);
      return false;
    }
  };

  const addTask = async (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<boolean> => {
    try {
      const success = await DatabaseService.addTask(task);
      if (success) {
        const updatedTasks = await DatabaseService.getTasks();
        setTasks(updatedTasks);
      }
      return success;
    } catch (error) {
      console.error('Error adding task:', error);
      return false;
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>): Promise<boolean> => {
    try {
      const success = await DatabaseService.updateTask(id, updates);
      if (success) {
        const updatedTasks = await DatabaseService.getTasks();
        setTasks(updatedTasks);
      }
      return success;
    } catch (error) {
      console.error('Error updating task:', error);
      return false;
    }
  };

  const deleteTask = async (id: string): Promise<boolean> => {
    try {
      const success = await DatabaseService.deleteTask(id);
      if (success) {
        const updatedTasks = await DatabaseService.getTasks();
        setTasks(updatedTasks);
      }
      return success;
    } catch (error) {
      console.error('Error deleting task:', error);
      return false;
    }
  };

  const createInvoice = async (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt' | 'subscriberName'>): Promise<boolean> => {
    try {