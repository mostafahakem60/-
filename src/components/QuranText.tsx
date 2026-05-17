import React, { useState } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';

interface WaqfMark {
  char: string;
  name: string;
  type: string;
  desc: string;
  color: string;
}

const WAQF_MARKS: Record<string, WaqfMark> = {
  '\u06D8': { char: 'م', name: 'م', type: 'وقف لازم', desc: 'يلزم الوقف هنا، ولا يجوز الوصل.', color: 'text-red-500' },
  '\u06D9': { char: 'لا', name: 'لا', type: 'لا وقف', desc: 'يمنع الوقف هنا، يجب الوصل.', color: 'text-gray-400 dark:text-gray-500' },
  '\u06DA': { char: 'ج', name: 'ج', type: 'جواز الوقف', desc: 'يجوز الوقف ويجوز الوصل.', color: 'text-blue-500 dark:text-blue-400' },
  '\u06D6': { char: 'صلے', name: 'صلے', type: 'الوصل أولى', desc: 'يجوز الوقف، ولكن الوصل أفضل.', color: 'text-green-500 dark:text-green-400' },
  '\u06D7': { char: 'قلے', name: 'قلے', type: 'الوقف أولى', desc: 'يجوز الوصل، ولكن الوقف أفضل.', color: 'text-orange-500 dark:text-orange-400' },
  '\u06DB': { char: '∴', name: '∴', type: 'تعانق', desc: 'إذا وقفت على أحدهما لا تقف على الآخر.', color: 'text-purple-500 dark:text-purple-400' },
  '\u06DC': { char: 'س', name: 'س', type: 'سكتة', desc: 'السكت: قطع الصوت زمناً يسيراً من غير تنفس.', color: 'text-teal-500 dark:text-teal-400' }
};

interface QuranTextProps {
  text: string;
  highlightWaqf: boolean;
  highlightHarakat: boolean;
  className?: string;
  isRtl: boolean;
}

const THEME_COLORS = {
  fatha: { color: '#f43f5e' }, // rose-500
  damma: { color: '#f59e0b' }, // amber-500
  kasra: { color: '#6366f1' }, // indigo-500
  shadda: { color: '#10b981' }, // emerald-500
  sukun: { color: '#0ea5e9' }, // sky-500
};

const getHarakatStyle = (char: string) => {
  switch (char) {
    case '\u064B': // Fathatan
    case '\u064E': // Fatha
      return THEME_COLORS.fatha;
    case '\u064C': // Dammatan
    case '\u064F': // Damma
      return THEME_COLORS.damma;
    case '\u064D': // Kasratan
    case '\u0650': // Kasra
      return THEME_COLORS.kasra;
    case '\u0651': // Shadda
      return THEME_COLORS.shadda;
    case '\u0652': // Sukun
      return THEME_COLORS.sukun;
    default:
      return {};
  }
};

export const QuranText: React.FC<QuranTextProps> = ({ text, highlightWaqf, highlightHarakat, className = '', isRtl }) => {
  const [activeTooltip, setActiveTooltip] = useState<number | null>(null);

  // 1. Split by Waqf marks first
  const waqfRegex = /([\u06D6-\u06DC])/g;
  const parts = text.split(waqfRegex);

  const GRAPHEME_REGEX = /([^\u064B-\u0652]+)([\u064B-\u0652]*)/g;

  const renderPart = (part: string, index: number) => {
    if (WAQF_MARKS[part]) {
      const mark = WAQF_MARKS[part];
      if (!highlightWaqf) {
        return <span key={`waqf-${index}`}>{part}</span>;
      }
      
      return (
        <span key={`waqf-${index}`} className="relative inline-block cursor-pointer" onClick={(e) => {
            e.stopPropagation();
            setActiveTooltip(activeTooltip === index ? null : index);
        }}>
          <span className={`${mark.color} font-bold hover:scale-125 inline-block transition-transform mx-1`}>
            {part}
          </span>
          {activeTooltip === index && (
             <div className={`absolute top-full mt-2 w-48 bg-light-card dark:bg-dark-card border border-primary/20 shadow-2xl rounded-2xl p-3 z-50 animate-in fade-in zoom-in duration-200 ${isRtl ? 'right-0' : 'left-0'}`}>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className={`${mark.color} font-quran text-2xl`}>{mark.name}</span>
                    <span className="font-bold text-primary dark:text-accent text-sm">{mark.type}</span>
                  </div>
                  <div className="text-xs text-primary/60 dark:text-accent/60 font-bold leading-relaxed">
                    {mark.desc}
                  </div>
                </div>
             </div>
          )}
        </span>
      );
    }

    if (highlightHarakat) {
      const graphemes = Array.from(part.matchAll(GRAPHEME_REGEX));
      
      // If regex failed or string is empty, fallback
      if (graphemes.length === 0) return <span key={`t-${index}`}>{part}</span>;

      return graphemes.map((m, gIdx) => {
        const base = m[1];
        const harakatStr = m[2];

        if (!harakatStr) return <span key={`g-${index}-${gIdx}`}>{base}</span>;

        let node = <span key={`b-${index}-${gIdx}`} style={{ color: 'var(--quran-base-color)' }}>{base}</span>;
        
        for (let i = 0; i < harakatStr.length; i++) {
          const h = harakatStr[i];
          const style = getHarakatStyle(h);
          node = (
            <span key={`h-${index}-${gIdx}-${i}`} style={style}>
              {node}
              {h}
            </span>
          );
        }
        return <React.Fragment key={`f-${index}-${gIdx}`}>{node}</React.Fragment>;
      });
    }

    return <span key={`t-${index}`}>{part}</span>;
  };

  // Close tooltip if clicked outside
  React.useEffect(() => {
    const handleBodyClick = () => setActiveTooltip(null);
    document.addEventListener('click', handleBodyClick);
    return () => document.removeEventListener('click', handleBodyClick);
  }, []);

  return (
    <div 
      className={`${className}`} 
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{ '--quran-base-color': 'currentColor' } as React.CSSProperties}
    >
      {parts.map(renderPart)}
    </div>
  );
};
