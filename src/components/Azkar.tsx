import React, { useState, useEffect, useRef } from 'react';
import { Heart, Loader2, RefreshCw, BookOpen, ChevronLeft, ChevronRight, Share2 } from 'lucide-react';
import { motion, useScroll, useTransform, AnimatePresence } from "motion/react";
import { fetchWithCache } from '../utils/network';
import ShareButton from './ShareButton';

interface Zikr {
  category: string;
  count: string;
  description: string;
  reference: string;
  content: string;
}

interface AzkarProps {
  isRtl: boolean;
}

function AzkarCard({ zikr, index, counters, handleCount, resetCount, isRtl }: any) {
  const ref = useRef<HTMLDivElement>(null);
  
  const cleanText = (text: string) => {
    if (!text) return '';
    return text
      .replace(/\\n/g, ' ')
      .replace(/\\'/g, "'")
      .replace(/\\"/g, '"')
      .replace(/n', '/g, ' ')
      .replace(/'n'/g, ' ')
      .replace(/'/g, '')
      .replace(/\\/g, '')
      .replace(/،\s*،(\s*،)*/g, '') // Remove repeated Arabic commas like "، ، ،"
      .replace(/^،\s*/g, '')        // Remove leading Arabic comma
      .replace(/\s*،$/g, '')        // Remove trailing Arabic comma
      .replace(/\s+/g, ' ')
      .trim();
  };

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.9, 1, 0.9]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.5, 0.8, 1], [0.5, 1, 1, 1, 0.5]);

  const targetCount = parseInt(zikr.count) || 1;
  const currentCount = counters[index] || 0;
  const isCompleted = currentCount >= targetCount;

  return (
    <motion.div 
      ref={ref}
      style={{ scale, opacity }}
      className={`bg-light-card dark:bg-dark-card rounded-[2.5rem] p-8 sm:p-10 border transition-all duration-500 flex flex-col relative overflow-hidden group ${
        isCompleted 
          ? 'border-primary/30 bg-primary/5 shadow-inner' 
          : 'border-primary/15 dark:border-primary/20 hover:border-primary/30 dark:border-primary/40 shadow-xl shadow-primary/5'
      }`}
    >
      {isCompleted && (
        <div className="absolute top-0 right-0 p-4">
          <div className="bg-primary text-white p-2 rounded-full shadow-lg animate-bounce">
            <Heart className="h-4 w-4 fill-white" />
          </div>
        </div>
      )}

      <div className="flex-1 mb-8">
        <p className={`text-3xl sm:text-4xl leading-[1.8] font-quran text-primary dark:text-accent ${isRtl ? 'text-right' : 'text-left'} transition-all duration-500 ${isCompleted ? 'opacity-60' : ''}`} dir="rtl">
          {cleanText(zikr.content)}
        </p>
        
        {zikr.description && (
          <div className="mt-8 flex gap-4">
            <div className="w-1 bg-primary/20 rounded-full shrink-0" />
            <p className={`text-primary/60 dark:text-accent/60 text-lg font-bold italic ${isRtl ? 'text-right' : 'text-left'}`} dir="rtl">
              {cleanText(zikr.description)}
            </p>
          </div>
        )}
      </div>
      
      <div className="flex flex-col items-center pt-8 border-t border-primary/20 dark:border-primary/30 dark:border-primary/30 dark:border-primary/40 gap-8">
        <div className={`flex items-center gap-10 w-full ${isRtl ? 'flex-row-reverse' : 'flex-row'} justify-center`}>
          {/* Target Info (Left in RTL, Right in LTR - User wants target on Left and Button on Right) */}
          <div className={`flex flex-col ${isRtl ? 'items-end' : 'items-start'}`}>
            <span className="text-xs font-black text-primary/40 dark:text-accent/40 uppercase tracking-widest">{isRtl ? 'الهدف' : 'Target'}</span>
            <div className="text-primary dark:text-accent font-black text-xl">
              <span className="text-3xl">{targetCount}</span> {isRtl ? 'مرات' : 'times'}
            </div>
          </div>

          {/* Counter Button (Right in RTL, Left in LTR - Based on "Right" request) */}
          <button
            onClick={() => handleCount(index, targetCount)}
            disabled={isCompleted}
            className={`flex items-center justify-center w-24 h-24 rounded-[2rem] text-4xl font-black transition-all shadow-2xl active:scale-90 ${
              isCompleted 
                ? 'bg-primary/10 text-primary/40 cursor-not-allowed' 
                : 'bg-primary text-white hover:shadow-primary/30 hover:-translate-y-1'
            }`}
          >
            {currentCount}
          </button>
        </div>
        
        <div className="flex items-center justify-center gap-6 w-full">
          {currentCount > 0 && (
            <button
              onClick={() => resetCount(index)}
              className="p-4 bg-primary/5 text-primary dark:text-accent hover:bg-primary/10 rounded-2xl transition-all active:rotate-180 duration-500"
              title={isRtl ? 'إعادة التكرار' : 'Reset'}
            >
              <RefreshCw className="h-6 w-6" />
            </button>
          )}
          <ShareButton 
            isRtl={isRtl} 
            text={`${cleanText(zikr.content)}\n\n[${zikr.category}]`} 
            title={isRtl ? 'مشاركة ذكر' : 'Share Zikr'} 
          />
        </div>
      </div>
    </motion.div>
  );
}

export default function Azkar({ isRtl }: AzkarProps) {
  const [azkarData, setAzkarData] = useState<Record<string, Zikr[]>>({});
  const [categories, setCategories] = useState<string[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [counters, setCounters] = useState<Record<number, number>>({});
  const [isCategoriesOpen, setIsCategoriesOpen] = useState(false);

  useEffect(() => {
    const fetchAzkar = async () => {
      try {
        const data = await fetchWithCache('https://raw.githubusercontent.com/nawafalqari/azkar-api/56df51279ab6eb86dc2f6202c7de26c8948331c1/azkar.json', 'azkar_data');
        
        const processedData: Record<string, Zikr[]> = {};
        Object.keys(data).forEach(key => {
          processedData[key] = data[key].flat();
        });

        setAzkarData(processedData);
        const cats = Object.keys(processedData);
        setCategories(cats);
        if (cats.length > 0) {
          setActiveCategory(cats[0]);
        }
      } catch (error) {
        console.error('Error fetching Azkar:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAzkar();
  }, []);

  const handleCount = (index: number, targetCount: number) => {
    setCounters(prev => {
      const current = prev[index] || 0;
      if (current < targetCount) {
        return { ...prev, [index]: current + 1 };
      }
      return prev;
    });
  };

  const resetCount = (index: number) => {
    setCounters(prev => ({ ...prev, [index]: 0 }));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
      </div>
    );
  }

  const currentAzkar = azkarData[activeCategory] || [];

  const categoryTranslations: Record<string, string> = {
    'أذكار الصباح': 'Morning Azkar',
    'أذكار المساء': 'Evening Azkar',
    'أذكار النوم': 'Sleep Azkar',
    'أذكار الاستيقاظ': 'Waking Up Azkar',
    'أذكار الصلاة': 'Prayer Azkar',
    'أذكار بعد الصلاة': 'Post-Prayer Azkar',
    'تسابيح': 'Tasbeeh',
    'أدعية نبوية': 'Prophetic Supplications',
    'أدعية قرآنية': 'Quranic Supplications',
    'أذكار المسلم': 'Muslim Azkar',
    'أذكار متفرقة': 'Miscellaneous Azkar',
  };

  const getCategoryName = (cat: string) => {
    if (isRtl) return cat;
    return categoryTranslations[cat] || cat;
  };

  return (
    <div className="pb-24">
      <div className="flex flex-col gap-8">
        {/* Categories Dropdown */}
        <div className="w-full">
          <div className="bg-light-card/80 dark:bg-dark-card/80 backdrop-blur-xl rounded-[2.5rem] border border-primary/30 dark:border-primary/40 dark:border-primary/30 shadow-2xl shadow-primary/5 transition-all overflow-hidden">
            <button
              onClick={() => setIsCategoriesOpen(!isCategoriesOpen)}
              className="w-full flex items-center justify-between p-8 hover:bg-primary/5 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-primary dark:text-accent" />
                </div>
                <div className="text-right">
                  <h3 className="text-sm font-black text-primary/40 dark:text-accent/40 uppercase tracking-widest leading-none mb-2">
                    {isRtl ? 'الأقسام' : 'Categories'}
                  </h3>
                  <p className="text-2xl font-black text-primary dark:text-accent leading-none">
                    {getCategoryName(activeCategory)}
                  </p>
                </div>
              </div>
              <div className={`w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center transition-transform duration-500 ${isCategoriesOpen ? 'rotate-180' : ''}`}>
                <ChevronRight className={`h-6 w-6 text-primary dark:text-accent ${isRtl ? 'rotate-180' : ''}`} />
              </div>
            </button>
            
            <AnimatePresence>
              {isCategoriesOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="border-t border-primary/20 dark:border-primary/30 dark:border-primary/30 dark:border-primary/40 bg-primary/5 dark:bg-white/5"
                >
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[50vh] overflow-y-auto custom-scrollbar">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => {
                          setActiveCategory(cat);
                          setCounters({});
                          setIsCategoriesOpen(false);
                        }}
                        className={`px-6 py-5 rounded-3xl transition-all text-lg font-black flex items-center justify-between group ${
                          activeCategory === cat
                            ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
                            : 'bg-white/50 dark:bg-dark-surface/50 text-primary/60 dark:text-accent/60 hover:bg-primary/10 hover:text-primary border border-primary/15 dark:border-primary/20'
                        }`}
                      >
                        <span className={isRtl ? 'text-right' : 'text-left'}>{getCategoryName(cat)}</span>
                        <div className={`transition-transform duration-300 ${activeCategory === cat ? 'translate-x-1 opacity-100' : 'opacity-0 -translate-x-2 group-hover:opacity-40 group-hover:translate-x-0'}`}>
                          {isRtl ? <ChevronLeft className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Azkar List */}
        <div className="flex-1 space-y-8">
          <div className="bg-primary/5 dark:bg-white/5 rounded-[2.5rem] p-10 border border-primary/30 dark:border-primary/40 dark:border-primary/30 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
            <h2 className="text-4xl font-black text-primary dark:text-accent relative z-10">{getCategoryName(activeCategory)}</h2>
            <p className="text-primary/40 dark:text-accent/40 font-bold mt-2 relative z-10">
              {currentAzkar.length} {isRtl ? 'ذكراً في هذا القسم' : 'items in this category'}
            </p>
          </div>

          <div className="space-y-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeCategory}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4 }}
                className="space-y-10"
              >
                {currentAzkar.map((zikr, index) => (
                  <AzkarCard 
                    key={`${activeCategory}-${index}`} 
                    zikr={zikr} 
                    index={index} 
                    counters={counters} 
                    handleCount={handleCount} 
                    resetCount={resetCount} 
                    isRtl={isRtl} 
                  />
                ))}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
