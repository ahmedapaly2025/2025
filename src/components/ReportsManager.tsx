import React, { useState, useMemo } from 'react';
import { useBotContext } from '../context/BotContext';
import { useLanguage } from '../context/LanguageContext';
import { useTranslation } from '../utils/translations';
import { 
  Download, 
  FileText, 
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Calendar,
  Filter,
  CheckSquare,
  XCircle,
  Clock,
  Printer,
  Activity
} from 'lucide-react';
import { format, subDays, subWeeks, subMonths, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ar, de } from 'date-fns/locale';

type TimePeriod = 'daily' | 'weekly' | 'monthly';

const ReportsManager: React.FC = () => {
  const { stats, subscribers, tasks, invoices, exportReports } = useBotContext();
  const { language, direction, textAlign } = useLanguage();
  const { t } = useTranslation(language);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('daily');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const dateLocale = language === 'ar' ? ar : de;

  // حساب الإحصائيات بناءً على الفترة الزمنية المحددة
  const getDateRange = () => {
    const date = selectedDate;
    switch (timePeriod) {
      case 'daily':
        return {
          start: startOfDay(date),
          end: endOfDay(date),
          previous: {
            start: startOfDay(subDays(date, 1)),
            end: endOfDay(subDays(date, 1))
          }
        };
      case 'weekly':
        return {
          start: startOfWeek(date, { weekStartsOn: 1 }),
          end: endOfWeek(date, { weekStartsOn: 1 }),
          previous: {
            start: startOfWeek(subWeeks(date, 1), { weekStartsOn: 1 }),
            end: endOfWeek(subWeeks(date, 1), { weekStartsOn: 1 })
          }
        };
      case 'monthly':
        return {
          start: startOfMonth(date),
          end: endOfMonth(date),
          previous: {
            start: startOfMonth(subMonths(date, 1)),
            end: endOfMonth(subMonths(date, 1))
          }
        };
      default:
        return {
          start: startOfDay(date),
          end: endOfDay(date),
          previous: {
            start: startOfDay(subDays(date, 1)),
            end: endOfDay(subDays(date, 1))
          }
        };
    }
  };

  const reportData = useMemo(() => {
    const dateRange = getDateRange();

    // تصفية البيانات حسب الفترة الزمنية
    const filteredTasks = tasks.filter(task => {
      const taskDate = new Date(task.createdAt);
      return taskDate >= dateRange.start && taskDate <= dateRange.end;
    });

    const filteredInvoices = invoices.filter(invoice => {
      const invoiceDate = new Date(invoice.createdAt);
      return invoiceDate >= dateRange.start && invoiceDate <= dateRange.end;
    });

    const filteredSubscribers = subscribers.filter(subscriber => {
      const subscriberDate = new Date(subscriber.createdAt);
      return subscriberDate >= dateRange.start && subscriberDate <= dateRange.end;
    });

    // حساب البيانات للفترة السابقة للمقارنة
    const previousTasks = tasks.filter(task => {
      const taskDate = new Date(task.createdAt);
      return taskDate >= dateRange.previous.start && taskDate <= dateRange.previous.end;
    });

    const previousInvoices = invoices.filter(invoice => {
      const invoiceDate = new Date(invoice.createdAt);
      return invoiceDate >= dateRange.previous.start && invoiceDate <= dateRange.previous.end;
    });

    const previousSubscribers = subscribers.filter(subscriber => {
      const subscriberDate = new Date(subscriber.createdAt);
      return subscriberDate >= dateRange.previous.start && subscriberDate <= dateRange.previous.end;
    });

    // حساب الإحصائيات
    const completedTasks = filteredTasks.filter(task => task.status === 'completed');
    const incompleteTasks = filteredTasks.filter(task => task.status === 'active');
    const cancelledTasks = filteredTasks.filter(task => task.status === 'expired');

    const paidInvoices = filteredInvoices.filter(invoice => invoice.status === 'paid');
    const totalRevenue = paidInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
    const totalCommissions = paidInvoices.reduce((sum, invoice) => sum + (invoice.commission || 0), 0);

    // حساب الإحصائيات للفترة السابقة
    const previousCompletedTasks = previousTasks.filter(task => task.status === 'completed');
    const previousPaidInvoices = previousInvoices.filter(invoice => invoice.status === 'paid');
    const previousRevenue = previousPaidInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);

    // حساب معدلات النمو
    const calculateGrowthRate = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return ((current - previous) / previous) * 100;
    };

    return {
      // الإحصائيات الحالية
      salesCount: paidInvoices.length,
      techniciansCount: filteredSubscribers.length,
      invoicesCount: filteredInvoices.length,
      totalRevenues: totalRevenue,
      totalCommissions,
      completedTasksCount: completedTasks.length,
      incompleteTasksCount: incompleteTasks.length,
      cancelledTasksCount: cancelledTasks.length,
      totalTasksCount: filteredTasks.length,

      // الإحصائيات للفترة السابقة
      previousSalesCount: previousPaidInvoices.length,
      previousTechniciansCount: previousSubscribers.length,
      previousCompletedTasksCount: previousCompletedTasks.length,
      previousRevenue,

      // معدلات النمو
      salesGrowth: calculateGrowthRate(paidInvoices.length, previousPaidInvoices.length),
      techniciansGrowth: calculateGrowthRate(filteredSubscribers.length, previousSubscribers.length),
      completedTasksGrowth: calculateGrowthRate(completedTasks.length, previousCompletedTasks.length),
      revenueGrowth: calculateGrowthRate(totalRevenue, previousRevenue),

      // معدلات الأداء
      taskCompletionRate: filteredTasks.length > 0 ? (completedTasks.length / filteredTasks.length) * 100 : 0,
      cancellationRate: filteredTasks.length > 0 ? (cancelledTasks.length / filteredTasks.length) * 100 : 0,

      // متوسطات
      averageRevenuePerInvoice: paidInvoices.length > 0 ? totalRevenue / paidInvoices.length : 0,
      averageTasksPerTechnician: filteredSubscribers.length > 0 ? filteredTasks.length / filteredSubscribers.length : 0,

      dateRange
    };
  }, [timePeriod, selectedDate, tasks, invoices, subscribers]);

  const handleExportReport = () => {
    exportReports(`${timePeriod}-report`, '30d');
  };

  const handlePrintReport = () => {
    window.print();
  };

  const formatGrowthRate = (rate: number) => {
    const sign = rate >= 0 ? '+' : '';
    return `${sign}${rate.toFixed(1)}%`;
  };

  const getGrowthColor = (rate: number) => {
    if (rate > 0) return 'text-green-400';
    if (rate < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const timePeriods = [
    { value: 'daily', label: t('dailyReport'), icon: <Calendar size={16} /> },
    { value: 'weekly', label: t('weeklyReport'), icon: <BarChart3 size={16} /> },
    { value: 'monthly', label: t('monthlyReport'), icon: <TrendingUp size={16} /> }
  ];

  const currency = language === 'de' ? t('euro') : t('riyal');

  return (
    <div className="space-y-6" style={{ direction, textAlign }}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{t('detailedReports')}</h2>
          <p className="text-gray-400">{t('comprehensiveReports')}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrintReport}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded-lg text-white transition-colors"
          >
            <Printer size={20} />
            {t('print')}
          </button>
          <button
            onClick={handleExportReport}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-lg text-white transition-colors"
          >
            <Download size={20} />
            {t('exportReport')}
          </button>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        {/* فلاتر التقرير */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-gray-400" />
              <span className="text-gray-300 text-sm">{t('timePeriod')}:</span>
            </div>
            <div className="flex gap-2">
              {timePeriods.map((period) => (
                <button
                  key={period.value}
                  onClick={() => setTimePeriod(period.value as TimePeriod)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    timePeriod === period.value
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {period.icon}
                  {period.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" />
            <input
              type="date"
              value={format(selectedDate, 'yyyy-MM-dd')}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* معلومات الفترة */}
        <div className="mb-6 p-4 bg-gray-700 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-2">{t('statisticsOverview')}</h3>
          <p className="text-gray-300 text-sm">
            {t('dataFrom')}: {format(reportData.dateRange.start, 'dd/MM/yyyy', { locale: dateLocale })} {t('dataTo')} {format(reportData.dateRange.end, 'dd/MM/yyyy', { locale: dateLocale })}
          </p>
        </div>

        {/* الإحصائيات الرئيسية */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-white">{t('salesCount')}</h4>
              <DollarSign className="text-emerald-400" size={24} />
            </div>
            <p className="text-2xl font-bold text-emerald-400">{reportData.salesCount}</p>
            <p className={`text-sm ${getGrowthColor(reportData.salesGrowth)}`}>
              {formatGrowthRate(reportData.salesGrowth)} {t('comparisonToPrevious')}
            </p>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-white">{t('techniciansCount')}</h4>
              <Users className="text-blue-400" size={24} />
            </div>
            <p className="text-2xl font-bold text-blue-400">{reportData.techniciansCount}</p>
            <p className={`text-sm ${getGrowthColor(reportData.techniciansGrowth)}`}>
              {formatGrowthRate(reportData.techniciansGrowth)} {t('comparisonToPrevious')}
            </p>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-white">{t('invoicesCount')}</h4>
              <FileText className="text-purple-400" size={24} />
            </div>
            <p className="text-2xl font-bold text-purple-400">{reportData.invoicesCount}</p>
            <p className="text-sm text-gray-400">
              {reportData.invoicesCount} فاتورة إجمالية
            </p>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-white">{t('totalRevenues')}</h4>
              <TrendingUp className="text-yellow-400" size={24} />
            </div>
            <p className="text-2xl font-bold text-yellow-400">
              {reportData.totalRevenues.toLocaleString()} {currency}
            </p>
            <p className={`text-sm ${getGrowthColor(reportData.revenueGrowth)}`}>
              {formatGrowthRate(reportData.revenueGrowth)} {t('comparisonToPrevious')}
            </p>
          </div>
        </div>

        {/* إحصائيات المهام */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-white">{t('completedTasksCount')}</h4>
              <CheckSquare className="text-green-400" size={24} />
            </div>
            <p className="text-2xl font-bold text-green-400">{reportData.completedTasksCount}</p>
            <p className={`text-sm ${getGrowthColor(reportData.completedTasksGrowth)}`}>
              {formatGrowthRate(reportData.completedTasksGrowth)} {t('comparisonToPrevious')}
            </p>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-white">{t('incompleteTasksCount')}</h4>
              <Clock className="text-orange-400" size={24} />
            </div>
            <p className="text-2xl font-bold text-orange-400">{reportData.incompleteTasksCount}</p>
            <p className="text-sm text-gray-400">
              {reportData.taskCompletionRate.toFixed(1)}% معدل الإنجاز
            </p>
          </div>

          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-medium text-white">{t('cancelledTasksCount')}</h4>
              <XCircle className="text-red-400" size={24} />
            </div>
            <p className="text-2xl font-bold text-red-400">{reportData.cancelledTasksCount}</p>
            <p className="text-sm text-gray-400">
              {reportData.cancellationRate.toFixed(1)}% معدل الإلغاء
            </p>
          </div>
        </div>

        {/* مقاييس الأداء */}
        <div className="bg-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">{t('performanceMetrics')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center">
              <h4 className="text-sm font-medium text-gray-400 mb-1">معدل الإنجاز</h4>
              <p className="text-xl font-bold text-white">{reportData.taskCompletionRate.toFixed(1)}%</p>
            </div>

            <div className="text-center">
              <h4 className="text-sm font-medium text-gray-400 mb-1">معدل الإلغاء</h4>
              <p className="text-xl font-bold text-white">{reportData.cancellationRate.toFixed(1)}%</p>
            </div>

            <div className="text-center">
              <h4 className="text-sm font-medium text-gray-400 mb-1">متوسط الإيراد لكل فاتورة</h4>
              <p className="text-xl font-bold text-white">
                {reportData.averageRevenuePerInvoice.toFixed(0)} {currency}
              </p>
            </div>

            <div className="text-center">
              <h4 className="text-sm font-medium text-gray-400 mb-1">متوسط المهام لكل فني</h4>
              <p className="text-xl font-bold text-white">
                {reportData.averageTasksPerTechnician.toFixed(1)}
              </p>
            </div>
          </div>
        </div>

        {/* معلومات إضافية */}
        <div className="mt-6 p-4 bg-gray-700 rounded-lg">
          <h4 className="font-medium text-white mb-2">ملاحظات التقرير</h4>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• يتم حساب معدلات النمو بالمقارنة مع الفترة الزمنية السابقة المماثلة</li>
            <li>• المبيعات تشمل الفواتير المدفوعة فقط</li>
            <li>• الإيرادات تشمل المبالغ الإجمالية للفواتير المدفوعة</li>
            <li>• معدل الإنجاز = (المهام المكتملة / إجمالي المهام) × 100</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ReportsManager;