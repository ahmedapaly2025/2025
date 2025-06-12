
import React from 'react';
import { useLanguage } from '../context/LanguageContext';

interface LoadingSpinnerProps {
  message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message }) => {
  const { language } = useLanguage();
  
  const loadingMessage = message || (language === 'ar' ? 'جاري التحميل...' : 'Loading...');

  return (
    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-8 flex flex-col items-center space-y-4 min-w-[200px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="text-gray-300 text-center">{loadingMessage}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
