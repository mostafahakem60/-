import React, { useState, useEffect } from 'react';
import { Moon, BookOpen, Clock, Radio as RadioIcon, Heart, Sun, Monitor, Globe, Plus, Minus, X, ListMusic } from 'lucide-react';
import PrayerTimes from './PrayerTimes';
import Quran from './Quran';
import Azkar from './Azkar';
import Hadith from './Hadith';
import Radio from './Radio';
import { AudioProvider } from './AudioContext';
import { FavoritesProvider } from './FavoritesContext';
import { AppBar, BottomNav, MiniPlayer } from './Shared';
import Settings from './Settings';

const tabs = [
  { id: 'prayer', name: 'الصلاة', nameEn: 'Prayer', icon: Clock },
  { id: 'quran', name: 'القرآن', nameEn: 'Quran', icon: BookOpen },
  { id: 'azkar', name: 'الأذكار', nameEn: 'Azkar', icon: Heart },
  { id: 'hadith', name: 'الأحاديث', nameEn: 'Hadith', icon: Moon },
  { id: 'radio', name: 'الراديو', nameEn: 'Radio', icon: RadioIcon },
];

type Theme = 'light' | 'dark' | 'system';
type Language = 'ar' | 'en';

export default function Layout() {
  const [activeTab, setActiveTab] = useState('prayer');
  const [theme, setTheme] = useState<Theme>('system');
  const [language, setLanguage] = useState<Language>('ar');
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const root = window.document.documentElement;
    
    const applyTheme = (t: Theme) => {
      if (t === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        if (systemTheme === 'dark') {
          root.classList.add('dark');
          root.classList.remove('light');
        } else {
          root.classList.add('light');
          root.classList.remove('dark');
        }
      } else if (t === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.add('light');
        root.classList.remove('dark');
      }
    };

    applyTheme(theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.dir = language === 'ar' ? 'rtl' : 'ltr';
    root.lang = language;
  }, [language]);

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'ar' ? 'en' : 'ar');
  };

  const isRtl = language === 'ar';

  return (
    <FavoritesProvider>
      <AudioProvider>
        <div className="min-h-screen bg-light-bg dark:bg-dark-bg text-light-on-surface dark:text-dark-on-surface font-sans pb-24 transition-colors duration-300" dir={isRtl ? 'rtl' : 'ltr'}>
          <AppBar 
            title={isRtl ? 'إسلاميات' : 'Islamiyat'}
            isRtl={isRtl}
            onSettingsClick={() => setShowSettings(true)}
            onThemeToggle={setTheme}
            currentTheme={theme}
            onLanguageToggle={toggleLanguage}
            language={language}
          />

          {/* Settings Modal */}
          {showSettings && (
            <Settings onClose={() => setShowSettings(false)} isRtl={isRtl} />
          )}

          {/* Main Content */}
          <main className="max-w-7xl mx-auto px-4 py-6">
            <div className="min-h-[calc(100vh-12rem)]">
              {activeTab === 'prayer' && <PrayerTimes isRtl={isRtl} />}
              {activeTab === 'quran' && <Quran isRtl={isRtl} />}
              {activeTab === 'azkar' && <Azkar isRtl={isRtl} />}
              {activeTab === 'hadith' && <Hadith isRtl={isRtl} />}
              {activeTab === 'radio' && <Radio isRtl={isRtl} activeTab="radio" />}
            </div>
          </main>

          <MiniPlayer isRtl={isRtl} />
          
          <BottomNav 
            activeTab={activeTab}
            onTabChange={setActiveTab}
            isRtl={isRtl}
            tabs={tabs}
          />
        </div>
      </AudioProvider>
    </FavoritesProvider>
  );
}
