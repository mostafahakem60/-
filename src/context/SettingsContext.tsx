import React, { createContext, useContext, useState, useEffect } from 'react';

type FontOption = 'Cairo' | 'Tajawal' | 'Almarai' | 'Amiri';
type VisualizerStyle = 'bars' | 'wave' | 'circle';

interface SettingsContextType {
  appFont: FontOption;
  setAppFont: (font: FontOption) => void;
  visualizerStyle: VisualizerStyle;
  setVisualizerStyle: (style: VisualizerStyle) => void;
  globalScale: number;
  setGlobalScale: React.Dispatch<React.SetStateAction<number>>;
  increaseScale: () => void;
  decreaseScale: () => void;
  resetScale: () => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [appFont, setAppFont] = useState<FontOption>('Cairo');
  const [visualizerStyle, setVisualizerStyle] = useState<VisualizerStyle>('bars');
  const [globalScale, setGlobalScale] = useState(1);

  // Load from local storage
  useEffect(() => {
    const savedFont = localStorage.getItem('appFont') as FontOption;
    const savedStyle = localStorage.getItem('visualizerStyle') as VisualizerStyle;
    const savedScale = localStorage.getItem('globalScale');
    
    if (savedFont) setAppFont(savedFont);
    if (savedStyle) setVisualizerStyle(savedStyle);
    if (savedScale) setGlobalScale(parseFloat(savedScale));
  }, []);

  // Save to local storage and apply font
  useEffect(() => {
    localStorage.setItem('appFont', appFont);
    document.documentElement.setAttribute('data-font', appFont.toLowerCase());
  }, [appFont]);

  useEffect(() => {
    localStorage.setItem('visualizerStyle', visualizerStyle);
  }, [visualizerStyle]);

  useEffect(() => {
    localStorage.setItem('globalScale', globalScale.toString());
    document.documentElement.style.fontSize = `${16 * globalScale}px`;
  }, [globalScale]);

  const increaseScale = () => setGlobalScale(prev => Math.min(prev + 0.1, 1.5));
  const decreaseScale = () => setGlobalScale(prev => Math.max(prev - 0.1, 0.8));
  const resetScale = () => setGlobalScale(1);

  return (
    <SettingsContext.Provider value={{ 
      appFont, setAppFont, 
      visualizerStyle, setVisualizerStyle,
      globalScale, setGlobalScale,
      increaseScale, decreaseScale, resetScale
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
