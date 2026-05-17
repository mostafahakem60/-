import React from 'react';
import { X, Type, Activity, Palette, Minus, Plus } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

interface SettingsProps {
  onClose: () => void;
  isRtl: boolean;
}

export default function Settings({ onClose, isRtl }: SettingsProps) {
  const { appFont, setAppFont, visualizerStyle, setVisualizerStyle, globalScale, increaseScale, decreaseScale, resetScale } = useSettings();

  const fonts = [
    { id: 'Cairo', name: 'القاهرة (Cairo)' },
    { id: 'Tajawal', name: 'تجول (Tajawal)' },
    { id: 'Almarai', name: 'المراعي (Almarai)' },
    { id: 'Amiri', name: 'أميري (Amiri)' },
  ];

  const visualizers = [
    { id: 'bars', name: isRtl ? 'أعمدة متوهجة' : 'Glowing Bars' },
    { id: 'wave', name: isRtl ? 'نبض متصل 1' : 'Smooth Wave 1' },
    { id: 'circle', name: isRtl ? 'نبض متصل 2' : 'Smooth Wave 2' },
  ];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="bg-light-card dark:bg-dark-card w-full max-w-md rounded-[2.5rem] relative z-10 shadow-2xl border border-primary/20 dark:border-primary/30 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh] custom-scrollbar flex flex-col"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        <div className="flex items-center justify-between sticky top-0 bg-light-card dark:bg-dark-card z-20 pb-4 pt-6 sm:pt-8 px-6 sm:px-8">
          <h2 className="text-2xl font-bold text-primary dark:text-accent flex items-center gap-2">
            <Palette className="w-6 h-6" />
            {isRtl ? 'الإعدادات' : 'Settings'}
          </h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-primary/10 text-primary transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-8 px-6 sm:px-8 mt-4">
          {/* Font Size Setup */}
          <div>
            <label className="block text-lg font-bold mb-3 text-light-on-surface dark:text-dark-on-surface flex items-center gap-2">
              <Type className="w-5 h-5 text-primary opacity-70" />
              {isRtl ? 'حجم الخط والأيقونات' : 'Font & Icon Size'}
            </label>
            <div className="flex items-center gap-4 bg-primary/5 dark:bg-white/5 p-3 rounded-2xl">
              <button 
                onClick={decreaseScale}
                className="p-2 bg-white dark:bg-dark-surface rounded-xl shadow-sm hover:scale-105 active:scale-95 transition-all text-primary dark:text-accent"
              >
                <Minus className="h-5 w-5" />
              </button>
              <div className="flex-1 text-center font-bold text-primary dark:text-accent text-lg">
                {Math.round(globalScale * 100)}%
              </div>
              <button 
                onClick={increaseScale}
                className="p-2 bg-white dark:bg-dark-surface rounded-xl shadow-sm hover:scale-105 active:scale-95 transition-all text-primary dark:text-accent"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            <button 
              onClick={resetScale}
              className="mt-3 w-full py-2 text-sm font-bold text-primary dark:text-accent hover:underline opacity-80"
            >
              {isRtl ? 'إعادة الضبط الافتراضي' : 'Reset to Default'}
            </button>
          </div>

          {/* Font Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-light-on-surface dark:text-dark-on-surface flex items-center gap-2">
              <Type className="w-5 h-5 text-primary opacity-70" />
              {isRtl ? 'نوع الخط' : 'Font Style'}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {fonts.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setAppFont(f.id as any)}
                  className={`py-3 px-4 rounded-2xl border-2 transition-all ${
                    appFont === f.id 
                      ? 'border-primary bg-primary/10 text-primary dark:text-accent font-bold' 
                      : 'border-transparent bg-light-bg dark:bg-dark-bg text-light-on-surface/80 dark:text-dark-on-surface/80 hover:bg-primary/5'
                  }`}
                  style={{ fontFamily: f.id }}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          {/* Visualizer Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-light-on-surface dark:text-dark-on-surface flex items-center gap-2">
              <Activity className="w-5 h-5 text-primary opacity-70" />
              {isRtl ? 'شكل تفاعل الصوت' : 'Visualizer Style'}
            </h3>
            <div className="grid grid-cols-1 gap-3">
              {visualizers.map((v) => (
                <button
                  key={v.id}
                  onClick={() => setVisualizerStyle(v.id as any)}
                  className={`py-4 px-5 rounded-2xl border-2 transition-all flex items-center justify-between ${
                    visualizerStyle === v.id 
                      ? 'border-primary bg-primary/10 text-primary dark:text-accent font-bold shadow-sm' 
                      : 'border-transparent bg-light-bg dark:bg-dark-bg text-light-on-surface/80 dark:text-dark-on-surface/80 hover:bg-primary/5'
                  }`}
                >
                  <span>{v.name}</span>
                  <div className={`w-4 h-4 rounded-full border-2 ${visualizerStyle === v.id ? 'border-primary bg-primary' : 'border-gray-400 dark:border-gray-600'}`} />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 sm:px-8 pb-6 sm:pb-8 pt-8 sticky bottom-0 bg-light-card dark:bg-dark-card z-20">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-primary-light transition-colors active:scale-[0.98] shadow-lg"
          >
            {isRtl ? 'تطبيق وإغلاق' : 'Apply & Close'}
          </button>
        </div>
      </div>
    </div>
  );
}
