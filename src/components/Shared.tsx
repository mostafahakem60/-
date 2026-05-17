import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Moon, Sun, Settings, Globe, 
  Play, Pause, X, 
  Clock, BookOpen, Heart, Radio as RadioIcon, ListMusic,
  Menu
} from 'lucide-react';
import { useAudio } from './AudioContext';

interface AppBarProps {
  title: string;
  isRtl: boolean;
  onSettingsClick: () => void;
  onThemeToggle: (theme: 'light' | 'dark' | 'system') => void;
  currentTheme: 'light' | 'dark' | 'system';
  onLanguageToggle: () => void;
  language: 'ar' | 'en';
}

export const AppBar: React.FC<AppBarProps> = ({
  title,
  isRtl,
  onSettingsClick,
  onThemeToggle,
  currentTheme,
  onLanguageToggle,
  language
}) => {
  return (
    <header className="sticky top-0 z-50 w-full bg-light-bg/90 dark:bg-dark-bg/80 backdrop-blur-xl transition-colors duration-300 border-b border-primary/20 dark:border-primary/30 shadow-sm dark:shadow-none dark:border-primary/30 dark:border-primary/40">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <h1 className="text-2xl font-black text-primary dark:text-accent tracking-tight">
          {title}
        </h1>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onThemeToggle(currentTheme === 'dark' ? 'light' : 'dark')}
            className="p-2 rounded-xl text-primary dark:text-accent hover:bg-primary/10 transition-colors"
          >
            {currentTheme === 'dark' ? <Sun className="w-6 h-6" /> : <Moon className="w-6 h-6" />}
          </button>

          <button
            onClick={onSettingsClick}
            className="p-2 rounded-xl text-primary dark:text-accent hover:bg-primary/10 transition-colors"
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>
      </div>
    </header>
  );
};

interface BottomNavProps {
  activeTab: string;
  onTabChange: (id: string) => void;
  isRtl: boolean;
  tabs: Array<{ id: string; name: string; nameEn: string; icon: any }>;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  isRtl,
  tabs
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 sm:p-5 pointer-events-none flex justify-center">
      <nav className="w-full max-w-md bg-light-bg/90 dark:bg-dark-surface/90 backdrop-blur-2xl border border-primary/10 dark:border-white/5 rounded-[2rem] shadow-[0_8px_32px_-8px_rgba(0,0,0,0.15)] dark:shadow-[0_8px_32px_-8px_rgba(0,0,0,0.4)] pointer-events-auto h-[76px] flex items-center justify-between px-2 relative transition-colors duration-300">
        {tabs.slice(0, 5).map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative flex flex-col items-center justify-center flex-1 h-[60px] group rounded-[1.5rem] active:scale-95 transition-transform duration-200"
            >
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-bubble"
                  className="absolute inset-0 bg-primary/10 dark:bg-accent/15 rounded-[1.5rem]"
                  transition={{ type: "spring", stiffness: 350, damping: 30 }}
                />
              )}
              
              <div className="relative z-10 flex flex-col items-center justify-center gap-1 mt-1">
                <motion.div
                  animate={{ y: isActive ? -2 : 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                >
                  <Icon 
                    className={`w-6 h-6 transition-colors duration-300 ${
                      isActive ? 'text-primary dark:text-accent drop-shadow-sm' : 'text-primary/40 dark:text-accent/40 group-hover:text-primary/60'
                    }`} 
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                </motion.div>
                
                <span className={`text-[10px] font-bold transition-colors duration-300 pb-1 ${
                  isActive ? 'text-primary dark:text-accent' : 'text-primary/40 dark:text-accent/40'
                }`}>
                  {isRtl ? tab.name : tab.nameEn}
                </span>

                {isActive && (
                  <motion.div
                    layoutId="active-dot-indicator"
                    className="absolute -bottom-1 w-1.5 h-1.5 bg-primary dark:bg-accent rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
              </div>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export const MiniPlayer: React.FC<{ isRtl: boolean }> = ({ isRtl }) => {
  const { 
    isPlayingQuran, 
    isPlayingRadio, 
    stopQuran, 
    stopRadio, 
    quranAudioRef, 
    radioAudioRef, 
    setIsPlayingQuran, 
    setIsPlayingRadio,
    activeRadioStation
  } = useAudio();
  
  const isPlaying = isPlayingQuran || isPlayingRadio;
  const currentAudio = isPlayingQuran ? quranAudioRef.current : radioAudioRef.current;
  
  if (!isPlaying && !currentAudio?.src) return null;

  const title = isPlayingQuran 
    ? (isRtl ? "تلاوة القرآن الكريم" : "Quran Recitation") 
    : (activeRadioStation?.name || (isRtl ? "إذاعة القرآن الكريم" : "Quran Radio"));
  
  const subtitle = isPlayingQuran 
    ? (isRtl ? "جاري الاستماع..." : "Listening...") 
    : (isRtl ? "بث مباشر" : "Live Stream");

  const togglePlay = () => {
    if (isPlayingQuran) {
      if (quranAudioRef.current?.paused) {
        quranAudioRef.current.play();
        setIsPlayingQuran(true);
      } else {
        quranAudioRef.current?.pause();
        setIsPlayingQuran(false);
      }
    } else if (isPlayingRadio) {
      if (radioAudioRef.current?.paused) {
        radioAudioRef.current.play();
        setIsPlayingRadio(true);
      } else {
        radioAudioRef.current?.pause();
        setIsPlayingRadio(false);
      }
    }
  };

  const stopAll = () => {
    stopQuran();
    stopRadio();
  };

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-24 left-4 right-4 h-16 bg-light-surface/80 dark:bg-dark-surface/80 backdrop-blur-xl border border-primary/30 dark:border-primary/40 dark:border-primary/30 rounded-2xl shadow-xl z-40 overflow-hidden flex items-center px-3 gap-3"
    >
      <div className="w-10 h-10 rounded-xl overflow-hidden bg-primary/10 flex items-center justify-center flex-shrink-0">
        {isPlayingRadio && activeRadioStation?.img ? (
          <img 
            src={activeRadioStation.img} 
            alt={activeRadioStation.name} 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="w-6 h-6 rounded-lg bg-primary animate-pulse flex items-center justify-center">
            <div className="w-1 h-3 bg-white/50 mx-0.5 rounded-full animate-[bounce_1s_infinite_0ms]" />
            <div className="w-1 h-4 bg-white mx-0.5 rounded-full animate-[bounce_1s_infinite_200ms]" />
            <div className="w-1 h-2 bg-white/50 mx-0.5 rounded-full animate-[bounce_1s_infinite_400ms]" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="mask-image-linear-gradient">
          <div className={`whitespace-nowrap font-bold text-sm text-primary dark:text-accent ${isRtl ? 'animate-marquee-rtl' : 'animate-marquee-ltr'}`}>
            {title} • {subtitle}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-transform"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className={`w-5 h-5 ${isRtl ? '' : 'ml-0.5'}`} />}
        </button>
        <button
          onClick={stopAll}
          className="w-8 h-8 rounded-full text-primary/40 hover:text-primary/60 dark:text-accent/40 dark:hover:text-accent/60 flex items-center justify-center"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      
      {/* Progress Bar Placeholder */}
      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary/10">
        <motion.div 
          className="h-full bg-primary"
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        />
      </div>
    </motion.div>
  );
};
