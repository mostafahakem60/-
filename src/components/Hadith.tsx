import React, { useState, useEffect } from 'react';
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from "motion/react";
import { fetchWithCache } from '../utils/network';
import ShareButton from './ShareButton';

interface HadithData {
  hadithnumber: number;
  arabicnumber: number;
  text: string;
  grades: { name: string; grade: string }[];
  reference: { book: number; hadith: number };
}

interface HadithProps {
  isRtl: boolean;
}

export default function Hadith({ isRtl }: HadithProps) {
  const [hadiths, setHadiths] = useState<HadithData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fontSize, setFontSize] = useState(1.8); // Initial font size in rem

  useEffect(() => {
    const fetchHadith = async () => {
      try {
        const data = await fetchWithCache('https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ara-nawawi.json', 'hadith_nawawi');
        setHadiths(data.hadiths);
      } catch (error) {
        console.error('Error fetching Hadith:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHadith();
  }, []);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % hadiths.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + hadiths.length) % hadiths.length);
  };

  const increaseFontSize = () => setFontSize(prev => Math.min(prev + 0.2, 3.5));
  const decreaseFontSize = () => setFontSize(prev => Math.max(prev - 0.2, 1.2));

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
      </div>
    );
  }

  if (hadiths.length === 0) return null;

  const currentHadith = hadiths[currentIndex];

  return (
    <div className="max-w-3xl mx-auto pb-24 px-2 sm:px-0">
      {/* Top Bar: Font Settings & Progress Indicator */}
      <div className="flex items-center justify-between mb-6 gap-3">
        {/* Font Size Slider */}
        <div className="flex items-center gap-3 bg-light-card/60 dark:bg-dark-card/60 backdrop-blur-md px-4 py-3 rounded-2xl border border-primary/20 dark:border-primary/30 flex-1 max-w-[240px]">
          <span className="text-lg font-bold text-primary/40 leading-none">TT</span>
          <input
            type="range"
            min="1.2"
            max="3.0"
            step="0.1"
            value={fontSize}
            onChange={(e) => setFontSize(parseFloat(e.target.value))}
            className="flex-1 accent-primary h-1.5 bg-primary/10 rounded-lg cursor-pointer appearance-none"
          />
          <span className="text-xl font-bold text-primary/80 leading-none">TT</span>
        </div>

        {/* Improved Progress Badge */}
        <div className="bg-primary/10 backdrop-blur-md px-6 py-3 rounded-2xl border border-primary/20 dark:border-primary/30 flex items-center gap-2">
          <span className="text-lg font-black text-primary dark:text-accent" dir="ltr">
            {currentIndex + 1} / {hadiths.length}
          </span>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-light-card dark:bg-dark-card rounded-[2.5rem] border border-primary/20 dark:border-primary/30 shadow-xl relative overflow-hidden transition-all mb-8 h-[500px] flex flex-col"
      >
        {/* Hadith Number Circle Floating */}
        <div className={`absolute top-6 ${isRtl ? 'left-6' : 'right-6'} w-11 h-11 rounded-full bg-primary flex items-center justify-center text-white text-lg font-black shadow-lg shadow-primary/30 z-20`}>
          {currentHadith.hadithnumber}
        </div>

        {/* Decorative background gradients */}
        <div className={`absolute top-0 ${isRtl ? 'right-0' : 'left-0'} w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 -translate-x-1/4 blur-3xl pointer-events-none opacity-50`} />
        
        <div className="relative z-10 flex flex-col h-full">
          {/* Collection Name Badge */}
          <div className="flex justify-center pt-8 mb-6">
            <div className="bg-primary/10 dark:bg-accent/10 px-6 py-2 rounded-full border border-primary/30 dark:border-primary/40">
              <h2 className="text-base font-black text-primary dark:text-accent">
                {isRtl ? 'الأربعون النووية' : 'An-Nawawi\'s Forty'}
              </h2>
            </div>
          </div>

          {/* Hadith Text Area - Scrollable */}
          <div className="flex-1 overflow-y-auto px-6 sm:px-10 pb-8 custom-scrollbar">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                className="min-h-full flex flex-col justify-center py-4"
              >
                <p 
                  className="leading-[2] font-quran text-primary dark:text-accent text-center transition-all duration-500" 
                  style={{ fontSize: `${fontSize}rem` }} 
                  dir="rtl"
                >
                  {currentHadith.text}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer Info & Unified Share Button */}
          <div className="px-6 sm:px-10 py-6 border-t border-primary/15 dark:border-primary/20 bg-primary/5 flex items-end justify-between gap-4">
            <div className="flex-1">
              <p className="text-primary/60 dark:text-accent/60 font-bold italic text-base leading-relaxed mb-0.5">
                {isRtl ? 'رواه النووي في الأربعون' : 'Narrated by An-Nawawi in Forty'}
              </p>
              <p className="text-primary/30 dark:text-accent/30 text-xs font-medium">
                {isRtl ? 'المتن الصحيح' : 'Authentic Text'}
              </p>
            </div>
            
            <ShareButton 
              isRtl={isRtl} 
              text={`${currentHadith.text}\n\n[الأربعون النووية - حديث رقم ${currentHadith.hadithnumber}]`} 
              title={isRtl ? 'مشاركة حديث' : 'Share Hadith'} 
            />
          </div>
        </div>
      </motion.div>

      {/* Navigation Controls: Side-by-Side Smaller Buttons */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={handlePrev}
          className="flex items-center justify-center gap-3 bg-light-card/80 dark:bg-dark-card/80 backdrop-blur-xl border border-primary/20 dark:border-primary/30 p-5 rounded-3xl shadow-lg transition-all group active:scale-95"
        >
          {isRtl ? <ChevronRight className="h-6 w-6 text-primary/40 group-hover:text-primary transition-transform group-hover:translate-x-1" /> : <ChevronLeft className="h-6 w-6 text-primary/40 group-hover:text-primary transition-transform group-hover:-translate-x-1" />}
          <span className="text-lg font-black text-primary/60 dark:text-accent/60 group-hover:text-primary dark:group-hover:text-accent">
            {isRtl ? 'السابق' : 'Previous'}
          </span>
        </button>

        <button
          onClick={handleNext}
          className="flex items-center justify-center gap-3 bg-light-card/80 dark:bg-dark-card/80 backdrop-blur-xl border border-primary/20 dark:border-primary/30 p-5 rounded-3xl shadow-lg transition-all group active:scale-95"
        >
          <span className="text-lg font-black text-primary/60 dark:text-accent/60 group-hover:text-primary dark:group-hover:text-accent">
            {isRtl ? 'التالي' : 'Next'}
          </span>
          {isRtl ? <ChevronLeft className="h-6 w-6 text-primary/40 group-hover:text-primary transition-transform group-hover:-translate-x-1" /> : <ChevronRight className="h-6 w-6 text-primary/40 group-hover:text-primary transition-transform group-hover:translate-x-1" />}
        </button>
      </div>
    </div>
  );
}
