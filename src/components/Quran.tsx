import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Play, Pause, Search, ChevronRight, ChevronLeft, Loader2, Heart, ChevronDown, Plus, Check, Download, FileAudio, ListMusic, Mic, List, Maximize, X, Type, Palette, HelpCircle } from 'lucide-react';
import { useAudio } from './AudioContext';
import { useFavorites } from './FavoritesContext';
import { fetchWithCache, fetchWithRetry } from '../utils/network';
import { useToast } from './ToastContext';
import ShareButton from './ShareButton';
import QuranSearch from './QuranSearch';
import AudioPlayer from './AudioPlayer';
import AudioPlaybackScreen from './AudioPlaybackScreen';
import { useOfflineAudio } from '../hooks/useOfflineAudio';
import { QuranText } from './QuranText';
import { motion, AnimatePresence } from 'motion/react';

interface Surah {
  number: number;
  name: string;
  englishName: string;
  numberOfAyahs: number;
  revelationType: string;
}

interface Ayah {
  id: string;
  sura: string;
  aya: string;
  arabic_text: string;
  translation: string;
}

interface Reciter {
  id: string;
  name: string;
  server: string;
  surahList: string;
  isQuranCom?: boolean;
  qdcId?: number;
}

interface QuranProps {
  isRtl: boolean;
}

const getNationalityPriority = (name: string): number => {
  const n = name.toLowerCase();
  
  // 1: Egyptian
  if (n.includes('عبد الباسط') || n.includes('المنشاوي') || n.includes('الحصري') || 
      n.includes('مصطفى إسماعيل') || n.includes('الطبلاوي') || n.includes('البنا') || 
      n.includes('الشعشاعي') || n.includes('شعيشع') || n.includes('محمد رفعت') || 
      n.includes('الفشني') || n.includes('البهتيمي') || n.includes('نعينع') || 
      n.includes('إسلام صبحي') || n.includes('عبد الرحمن مسعد') || n.includes('حسن صالح') || 
      n.includes('محمد جبريل') || n.includes('الشحات') || n.includes('صابر عبد الحكم') || 
      n.includes('محمود خليل') || n.includes('عبدالباسط')) {
    return 1;
  }
  
  // 2: Saudi
  if (n.includes('السديس') || n.includes('الشريم') || n.includes('المعيقلي') || 
      n.includes('الجهني') || n.includes('بليلة') || n.includes('الدوسري') || 
      n.includes('العجمي') || n.includes('القطامي') || n.includes('إدريس أبكر') || 
      n.includes('خالد الجليل') || n.includes('منصور السالمي') || n.includes('محمد أيوب') || 
      n.includes('علي جابر') || n.includes('اللحيدان') || n.includes('القاسم') || 
      n.includes('الثبيتي') || n.includes('البدير') || n.includes('آل الشيخ') || 
      n.includes('خياط') || n.includes('الحذيفي') || n.includes('الشاطري') || 
      n.includes('المطرود') || n.includes('بصفر') || n.includes('توفيق الصايغ') || 
      n.includes('داغستاني') || n.includes('سهل ياسين') || n.includes('عادل ريان') || 
      n.includes('الغامدي') || n.includes('عبدالرحمن السديس') || n.includes('سعود الشريم')) {
    return 2;
  }
  
  // 3: Kuwaiti
  if (n.includes('العفاسي') || n.includes('البراك') || n.includes('الكندري') || 
      n.includes('صلاح الهاشم')) {
    return 3;
  }
  
  // 4: UAE
  if (n.includes('الطنيجي') || n.includes('بو خاطر') || n.includes('بوخاطر')) {
    return 4;
  }
  
  // 5: Sudanese
  if (n.includes('نورين') || n.includes('الزين محمد') || n.includes('محمد عبد الكريم') || 
      n.includes('الفاتح') || n.includes('الزبير')) {
    return 5;
  }
  
  // 6: Yemeni
  if (n.includes('وديع اليمني') || n.includes('فارس عباد')) {
    return 6;
  }
  
  // 7: Omani
  if (n.includes('هزاع البلوشي')) {
    return 7;
  }
  
  // 8: Iraqi
  if (n.includes('رعد محمد الكردي') || n.includes('شيرزاد')) {
    return 8;
  }
  
  // 9: Somali/Qatari
  if (n.includes('عبد الرشيد صوفي') || n.includes('عبدالرشيد صوفي')) {
    return 9;
  }
  
  return 99; // Others
};

const isSafeAudioUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch { return false; }
};

export default function Quran({ isRtl }: QuranProps) {
  const { showToast } = useToast();
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null);
  const [ayahs, setAyahs] = useState<Ayah[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAyahs, setLoadingAyahs] = useState(false);
  
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [selectedReciter, setSelectedReciter] = useState<string>('');
  const [isReciterDropdownOpen, setIsReciterDropdownOpen] = useState(false);
  const [reciterSearchQuery, setReciterSearchQuery] = useState('');
  const [showFavoriteSurahsOnly, setShowFavoriteSurahsOnly] = useState(false);
  const { favoriteSurahs, toggleFavoriteSurah, favoriteReciters, toggleFavoriteReciter } = useFavorites();
  const { quranAudioRef, isPlayingQuran, setIsPlayingQuran, stopRadio, stopQuran } = useAudio();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [isDownloadDropdownOpen, setIsDownloadDropdownOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isColorGuideOpen, setIsColorGuideOpen] = useState(false);
  const [playingAyahId, setPlayingAyahId] = useState<number | null>(null);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(false);
  const [focusMode, setFocusMode] = useState(true);
  const [activeAyahNumber, setActiveAyahNumber] = useState<number | null>(null);
  const [highlightWaqf, setHighlightWaqf] = useState(true);
  const [highlightHarakat, setHighlightHarakat] = useState(false);
  const [verseTimings, setVerseTimings] = useState<any[]>([]);
  const [timingsDuration, setTimingsDuration] = useState<number>(0);
  const [isExactTimings, setIsExactTimings] = useState<boolean>(true);
  const [isVisualizerOpen, setIsVisualizerOpen] = useState(false);
  const ayahAudioRef = useRef<HTMLAudioElement | null>(null);
  const { downloadAudio, removeAudio, isDownloaded, isDownloading: offlineDownloading } = useOfflineAudio();

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const lang = isRtl ? 'ar' : 'eng';
        
        // Fetch Surahs with cache
        const surahsData = await fetchWithCache('https://api.alquran.cloud/v1/surah', 'quran_surahs');
        setSurahs(surahsData.data);

        // Fetch Reciters with cache
        const recitersData = await fetchWithCache(`https://www.mp3quran.net/api/v3/reciters?language=${lang}`, `quran_reciters_${lang}`);
        
        const formattedReciters: Reciter[] = [];
        
        // Add Mishary Rashid from quran.com API (High Quality)
        formattedReciters.push({
          id: 'quran-com-mishary',
          name: isRtl ? 'مشاري راشد العفاسي (جودة عالية)' : 'Mishary Rashid Alafasy (High Quality)',
          server: 'https://download.quranicaudio.com/qdc/mishari_al_afasy/murattal/',
          surahList: Array.from({length: 114}, (_, i) => i + 1).join(','),
          isQuranCom: true,
          qdcId: 7
        });

        // Add Maher Al-Muaiqly from mp3quran.net (High Quality)
        formattedReciters.push({
          id: 'mp3quran-maher',
          name: isRtl ? 'ماهر المعيقلي (جودة عالية)' : 'Maher Al-Muaiqly (High Quality)',
          server: 'https://server12.mp3quran.net/maher/',
          surahList: Array.from({length: 114}, (_, i) => i + 1).join(','),
          isQuranCom: false
        });

        // Add Mohamed Refaat explicitly
        formattedReciters.push({
          id: 'mp3quran-refat',
          name: isRtl ? 'محمد رفعت (تلاوات نادرة)' : 'Mohamed Refaat (Rare Recitations)',
          server: 'https://server14.mp3quran.net/refat/',
          surahList: '1,10,11,12,17,18,19,20,48,54,55,56,69,72,73,75,76,77,78,79,81,82,83,85,86,87,88,89,96,98,100',
          isQuranCom: false
        });

        // Add AbdulBaset AbdulSamad (High Quality)
        formattedReciters.push({
          id: 'quran-com-abdulbaset',
          name: isRtl ? 'عبد الباسط عبد الصمد (جودة عالية)' : 'AbdulBaset AbdulSamad (High Quality)',
          server: 'https://download.quranicaudio.com/qdc/abdul_baset/murattal/',
          surahList: Array.from({length: 114}, (_, i) => i + 1).join(','),
          isQuranCom: true,
          qdcId: 2
        });

        // Add Mahmoud Khalil Al-Husary (High Quality)
        formattedReciters.push({
          id: 'quran-com-husary',
          name: isRtl ? 'محمود خليل الحصري (جودة عالية)' : 'Mahmoud Khalil Al-Husary (High Quality)',
          server: 'https://download.quranicaudio.com/qdc/khalil_al_husary/murattal/',
          surahList: Array.from({length: 114}, (_, i) => i + 1).join(','),
          isQuranCom: true,
          qdcId: 6
        });

        // Add Mohamed Siddiq El-Minshawi (High Quality)
        formattedReciters.push({
          id: 'quran-com-minshawi',
          name: isRtl ? 'محمد صديق المنشاوي (جودة عالية)' : 'Mohamed Siddiq El-Minshawi (High Quality)',
          server: 'https://download.quranicaudio.com/qdc/siddiq_minshawi/murattal/',
          surahList: Array.from({length: 114}, (_, i) => i + 1).join(','),
          isQuranCom: true,
          qdcId: 9
        });

        // Add Abu Bakr Al Shatri (High Quality)
        formattedReciters.push({
          id: 'quran-com-shatri',
          name: isRtl ? 'أبو بكر الشاطري (جودة عالية)' : 'Abu Bakr Al Shatri (High Quality)',
          server: 'https://download.quranicaudio.com/qdc/abu_bakr_shatri/murattal/',
          surahList: Array.from({length: 114}, (_, i) => i + 1).join(','),
          isQuranCom: true,
          qdcId: 4
        });

        recitersData.reciters.forEach((r: any) => {
          if (r.id === 241) return; // Skip Mohamed Refaat as we added him explicitly
          if (r.moshaf && r.moshaf.length > 0) {
            r.moshaf.forEach((m: any) => {
              formattedReciters.push({
                id: `${r.id}-${m.id}`,
                name: `${r.name} (${m.name})`,
                server: m.server,
                surahList: m.surah_list
              });
            });
          }
        });
        
        formattedReciters.sort((a, b) => {
          const priorityA = getNationalityPriority(a.name);
          const priorityB = getNationalityPriority(b.name);
          if (priorityA !== priorityB) {
            return priorityA - priorityB;
          }
          return a.name.localeCompare(b.name, 'ar');
        });
        
        setReciters(formattedReciters);
        if (formattedReciters.length > 0) {
          // Try to find Mishary Alafasy as default, or fallback to first
          const defaultReciter = formattedReciters.find(r => r.id === 'quran-com-mishary') || formattedReciters[0];
          setSelectedReciter(defaultReciter.id);
        }
        
      } catch (error) {
        console.error('Error fetching Quran data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [isRtl]);

  const handleReciterChange = (id: string) => {
    setSelectedReciter(id);
    setIsReciterDropdownOpen(false);
    stopQuran();
  };

  const handleSurahClick = async (surah: Surah) => {
    setSelectedSurah(surah);
    setLoadingAyahs(true);
    stopQuran();
    
    try {
      // Fetch both Uthmani text and Muyassar translation
      const resp = await fetchWithCache(`https://api.alquran.cloud/v1/surah/${surah.number}/editions/quran-uthmani,ar.muyassar`, `ayahs_combined_${surah.number}`);
      
      if (resp && resp.data && resp.data.length >= 2) {
        const arabicAyahs = resp.data[0].ayahs;
        const translationAyahs = resp.data[1].ayahs;
        
        const mappedAyahs: Ayah[] = arabicAyahs.map((a: any, i: number) => {
          let text = a.text;
          
          // Remove Bismillah from the start of the first ayah (except for Surah Al-Fatihah)
          if (surah.number !== 1 && a.numberInSurah === 1) {
            const bismillah1 = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ ';
            const bismillah2 = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ\n';
            const bismillah3 = 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ';
            
            if (text.startsWith(bismillah1)) {
              text = text.substring(bismillah1.length);
            } else if (text.startsWith(bismillah2)) {
              text = text.substring(bismillah2.length);
            } else if (text.startsWith(bismillah3)) {
              text = text.substring(bismillah3.length);
            } else if (text.startsWith('\ufeff' + bismillah1)) {
              text = text.substring(bismillah1.length + 1);
            }
          }

          return {
            id: a.number.toString(),
            sura: surah.number.toString(),
            aya: a.numberInSurah.toString(),
            arabic_text: text,
            translation: translationAyahs[i] ? translationAyahs[i].text : ''
          };
        });
        setAyahs(mappedAyahs);
      } else {
        throw new Error("Invalid response format from Alquran Cloud");
      }
    } catch (error) {
      console.error('Error fetching ayahs:', error);
    } finally {
      setLoadingAyahs(false);
    }
  };

  const handleDownloadSurah = async () => {
    if (!selectedSurah || !currentReciterObj || !currentAudioUrl) return;
    setIsDownloading(true);
    showToast(isRtl ? 'جاري تجهيز الملف للتحميل...' : 'Preparing file for download...', 'info');
    try {
      const response = await fetch(currentAudioUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${selectedSurah.englishName}_${currentReciterObj.name}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      showToast(isRtl ? 'تم بدء التحميل بنجاح' : 'Download started successfully', 'success');
    } catch (e) {
      // Fallback to opening in new tab if CORS blocks blob download
      window.open(currentAudioUrl, '_blank');
      showToast(isRtl ? 'تم فتح الملف في نافذة جديدة للتحميل' : 'File opened in a new tab for download', 'info');
    } finally {
      setIsDownloading(false);
      setIsDownloadDropdownOpen(false);
    }
  };

  const handleDownloadFullQuran = () => {
    if (!currentReciterObj) return;
    
    let m3uContent = "#EXTM3U\n";
    const availableSurahs = currentReciterObj.surahList ? currentReciterObj.surahList.split(',').map(Number) : Array.from({length: 114}, (_, i) => i + 1);
    
    for (const surahNum of availableSurahs) {
      const url = currentReciterObj.isQuranCom 
        ? `${currentReciterObj.server}${surahNum}.mp3`
        : `${currentReciterObj.server}${surahNum.toString().padStart(3, '0')}.mp3`;
      m3uContent += `#EXTINF:-1, Surah ${surahNum} - ${currentReciterObj.name}\n${url}\n`;
    }
    
    const blob = new Blob([m3uContent], { type: 'audio/x-mpegurl' });
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = `Full_Quran_${currentReciterObj.name}.m3u`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
    
    setIsDownloadDropdownOpen(false);
    showToast(isRtl ? 'تم تحميل قائمة التشغيل بنجاح' : 'Playlist downloaded successfully', 'success');
  };

  const toggleAudio = async () => {
    if (!quranAudioRef.current) return;
    
    if (isPlayingQuran) {
      quranAudioRef.current.pause();
      setIsPlayingQuran(false);
    } else {
      stopRadio(); // Stop radio when playing Quran
      if (ayahAudioRef.current) {
        ayahAudioRef.current.pause();
        setPlayingAyahId(null);
      }
      
      if (!currentAudioUrl) {
        console.error("No audio URL available for current selection");
        return;
      }

      try {
        // Always ensure src is correct before playing
        // We use a temporary variable to avoid multiple ref accesses
        const audio = quranAudioRef.current;
        
        // If src is different or invalid, update it
        if (audio.src !== currentAudioUrl) {
          if (!isSafeAudioUrl(currentAudioUrl)) return;
          console.log("Setting Quran audio src:", currentAudioUrl);
          audio.src = currentAudioUrl;
          audio.load();
        }
        
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          await playPromise;
          setIsPlayingQuran(true);
        }
      } catch (e: any) {
        if (e.name !== 'AbortError' && !e.message?.includes('interrupted by a call to pause')) {
          console.error("Error playing Quran audio:", e.message || "Unknown error", { url: currentAudioUrl });
          setIsPlayingQuran(false);
          
          // If it's a source error, try to reload once
          if (e.message?.includes('supported source') || e.name === 'NotSupportedError') {
            console.error("Audio source not supported or failed to load:", currentAudioUrl);
            
            // Try fallback URL if available
            if (selectedSurah && currentReciterObj) {
              console.log("Trying fallback audio source...");
              let fallbackUrl = '';
              
              // Simple fallback mapping for common reciters
              if (currentReciterObj.name.includes('العفاسي')) {
                fallbackUrl = `https://cdn.islamic.network/quran/audio-surah/128/ar.alafasy/${selectedSurah.number}.mp3`;
              } else if (currentReciterObj.name.includes('المعيقلي')) {
                fallbackUrl = `https://server12.mp3quran.net/maher/${selectedSurah.number.toString().padStart(3, '0')}.mp3`;
              } else if (currentReciterObj.name.includes('عبدالباسط')) {
                fallbackUrl = `https://cdn.islamic.network/quran/audio-surah/128/ar.abdulbasitmurattal/${selectedSurah.number}.mp3`;
              } else if (currentReciterObj.name.includes('السديس')) {
                fallbackUrl = `https://cdn.islamic.network/quran/audio-surah/128/ar.abdurrahmaansudais/${selectedSurah.number}.mp3`;
              } else if (currentReciterObj.name.includes('الشريم')) {
                fallbackUrl = `https://cdn.islamic.network/quran/audio-surah/128/ar.saudshuraim/${selectedSurah.number}.mp3`;
              }
              
              if (fallbackUrl && fallbackUrl !== currentAudioUrl) {
                if (!isSafeAudioUrl(fallbackUrl)) return;
                try {
                  quranAudioRef.current.src = fallbackUrl;
                  quranAudioRef.current.load();
                  await quranAudioRef.current.play();
                  setIsPlayingQuran(true);
                  showToast(isRtl ? 'تم استخدام رابط بديل لتشغيل التلاوة' : 'Using fallback link to play recitation', 'info');
                  return;
                } catch (fallbackErr: any) {
                  if (!fallbackErr?.message?.includes('interrupted by a call to pause')) {
                    console.error("Fallback failed:", fallbackErr);
                  }
                }
              }
            }
            
            showToast(isRtl ? 'عذراً، لا يمكن تشغيل هذه التلاوة حالياً. يرجى تجربة قارئ آخر.' : 'Sorry, this recitation cannot be played right now. Please try another reciter.', 'error');
          } else {
            try {
              console.log("Retrying Quran audio playback...");
              quranAudioRef.current.load();
              await quranAudioRef.current.play();
              setIsPlayingQuran(true);
            } catch (retryErr: any) {
              if (!retryErr?.message?.includes('interrupted by a call to pause')) {
                console.error("Retry failed:\n" + (retryErr.message || retryErr));
                showToast(isRtl ? 'حدث خطأ أثناء تشغيل التلاوة. يرجى المحاولة مرة أخرى.' : 'An error occurred while playing the recitation. Please try again.', 'error');
              }
            }
          }
        }
      }
    }
  };

  const toggleAyahAudio = (ayahId: number) => {
    if (playingAyahId === ayahId) {
      if (ayahAudioRef.current) {
        ayahAudioRef.current.pause();
        setPlayingAyahId(null);
      }
    } else {
      stopQuran();
      stopRadio();
      
      if (ayahAudioRef.current) {
        ayahAudioRef.current.pause();
      }
      
      const ayahUrl = `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${ayahId}.mp3`;
      if (!isSafeAudioUrl(ayahUrl)) return;
      const audio = new Audio(ayahUrl);
      ayahAudioRef.current = audio;
      
      audio.onended = () => setPlayingAyahId(null);
      audio.onerror = () => {
        setPlayingAyahId(null);
        showToast(isRtl ? 'فشل تشغيل الآية' : 'Failed to play Ayah', 'error');
      };
      
      audio.play().then(() => {
        setPlayingAyahId(ayahId);
      }).catch(err => {
        const msg = err ? (typeof err === 'string' ? err : (err.message || err.toString() || '')) : '';
        if (msg.includes('interrupted by a call to pause') || msg.includes('aborted')) return;
        console.error('Error playing ayah:', err);
        setPlayingAyahId(null);
        showToast(isRtl ? 'فشل تشغيل الآية' : 'Failed to play Ayah', 'error');
      });
    }
  };

  const filteredSurahs = surahs
    .filter((s) => s.name.includes(searchQuery) || s.englishName.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(s => showFavoriteSurahsOnly ? favoriteSurahs.includes(s.number) : true);

  const filteredReciters = reciters
    .filter(r => r.name.toLowerCase().includes(reciterSearchQuery.toLowerCase()))
    .sort((a, b) => {
      const aFav = favoriteReciters.includes(a.id);
      const bFav = favoriteReciters.includes(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return 0;
    });

  const currentReciterObj = reciters.find(r => r.id === selectedReciter);
  useEffect(() => {
    if (selectedSurah && currentReciterObj && currentReciterObj.server) {
      // Check if the surah is available for this reciter
      const availableSurahs = currentReciterObj.surahList ? currentReciterObj.surahList.split(',').map(Number) : [];
      if (availableSurahs.length > 0 && !availableSurahs.includes(selectedSurah.number)) {
        setCurrentAudioUrl(null);
        if (quranAudioRef.current) {
          quranAudioRef.current.removeAttribute('src');
        }
        return;
      }

      const serverUrl = currentReciterObj.server.endsWith('/') ? currentReciterObj.server : `${currentReciterObj.server}/`;
      let url = '';
      if (currentReciterObj.isQuranCom) {
        url = `${serverUrl}${selectedSurah.number}.mp3`;
      } else {
        url = `${serverUrl}${selectedSurah.number.toString().padStart(3, '0')}.mp3`;
      }
      
      if (url.startsWith('http://')) {
        url = url.replace('http://', 'https://');
      }
      
      // Basic URL validation
      try {
        new URL(url);
        if (!isSafeAudioUrl(url)) return;
        setCurrentAudioUrl(url);
        if (quranAudioRef.current) {
          quranAudioRef.current.src = url;
          quranAudioRef.current.load();
        }
      } catch (e) {
        console.error("Invalid Quran audio URL generated:", url);
        setCurrentAudioUrl(null);
      }
    } else {
      setCurrentAudioUrl(null);
      if (quranAudioRef.current) {
        quranAudioRef.current.removeAttribute('src');
      }
    }
  }, [selectedSurah, currentReciterObj, quranAudioRef]);

  // Fetch verse timings for auto-scroll if supported, else fallback to Mishary
  useEffect(() => {
    const fetchTimings = async () => {
      if (!selectedSurah) {
        setVerseTimings([]);
        return;
      }
      
      try {
        // Try specific reciter first
        if (currentReciterObj?.qdcId) {
          const res = await fetch(`https://api.qurancdn.com/api/qdc/audio/reciters/${currentReciterObj.qdcId}/audio_files?chapter=${selectedSurah.number}&segments=true`);
          const data = await res.json();
          if (data.audio_files && data.audio_files[0] && data.audio_files[0].verse_timings) {
            const timings = data.audio_files[0].verse_timings;
            setVerseTimings(timings);
            const lastTiming = timings[timings.length - 1];
            setTimingsDuration(lastTiming ? lastTiming.timestamp_to : 0);
            setIsExactTimings(true);
            return;
          }
        }
        
        // Fallback to Mishary (qdcId: 7)
        const fallbackRes = await fetch(`https://api.qurancdn.com/api/qdc/audio/reciters/7/audio_files?chapter=${selectedSurah.number}&segments=true`);
        const fallbackData = await fallbackRes.json();
        if (fallbackData.audio_files && fallbackData.audio_files[0] && fallbackData.audio_files[0].verse_timings) {
          const timings = fallbackData.audio_files[0].verse_timings;
          setVerseTimings(timings);
          const lastTiming = timings[timings.length - 1];
          setTimingsDuration(lastTiming ? lastTiming.timestamp_to : 0);
          setIsExactTimings(false);
        } else {
          setVerseTimings([]);
        }
      } catch (err) {
        console.error("Failed to fetch verse timings:", err);
        setVerseTimings([]);
      }
    };
    fetchTimings();
  }, [selectedSurah, currentReciterObj]);

  // Handle auto-scroll logic
  useEffect(() => {
    const audio = quranAudioRef.current;
    if (!audio || !autoScrollEnabled || verseTimings.length === 0) return;

    const handleTimeUpdate = () => {
      const currentTimeMs = audio.currentTime * 1000;
      let searchTimeMs = currentTimeMs;
      
      if (!isExactTimings && timingsDuration > 0 && audio.duration) {
        const audioDurationMs = audio.duration * 1000;
        const scale = timingsDuration / audioDurationMs;
        searchTimeMs = currentTimeMs * scale;
      }

      const activeTiming = verseTimings.find(
        t => searchTimeMs >= t.timestamp_from && searchTimeMs <= t.timestamp_to
      );

      if (activeTiming) {
        const verseNumber = parseInt(activeTiming.verse_key.split(':')[1], 10);
        if (activeAyahNumber !== verseNumber) {
          setActiveAyahNumber(verseNumber);
          
          // Scroll to the active ayah with an offset for the sticky headers
          const ayahElement = document.getElementById(`ayah-${verseNumber}`);
          if (ayahElement) {
            ayahElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, [autoScrollEnabled, focusMode, verseTimings, activeAyahNumber, quranAudioRef, isExactTimings, timingsDuration]);

  useEffect(() => {
    if (scrollContainerRef.current && !selectedSurah) {
      // Trigger a scroll event to initialize the card scales
      requestAnimationFrame(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.dispatchEvent(new Event('scroll'));
        }
      });
    }
  }, [filteredSurahs, selectedSurah]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      {!selectedSurah ? (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 sticky top-16 z-40 bg-light-bg/80 dark:bg-dark-bg/80 backdrop-blur-xl py-4 transition-all">
            <div className="relative flex-1 flex gap-2">
              <div className="relative flex-1 group">
                <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-4' : 'left-0 pl-4'} flex items-center pointer-events-none`}>
                  <Search className="h-5 w-5 text-primary/40 group-focus-within:text-primary transition-colors" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={`block w-full ${isRtl ? 'pr-12 pl-4' : 'pl-12 pr-4'} py-4 border border-primary/30 dark:border-primary/40 dark:border-primary/30 rounded-2xl focus:ring-2 focus:ring-primary/30 focus:border-primary/15 dark:border-primary/200 bg-light-surface dark:bg-dark-surface dark:text-white shadow-sm text-lg transition-all font-bold placeholder:text-primary/30`}
                  placeholder={isRtl ? 'ابحث عن سورة...' : 'Search for a Surah...'}
                />
              </div>
              <button
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center justify-center px-4 rounded-2xl border border-primary/20 dark:border-primary/30 bg-light-surface dark:bg-dark-surface text-primary dark:text-accent hover:border-primary/30 transition-all active:scale-95"
                title={isRtl ? 'بحث متقدم في الآيات' : 'Advanced Verse Search'}
              >
                <Search className="h-6 w-6" />
              </button>
              <button
                onClick={() => setShowFavoriteSurahsOnly(!showFavoriteSurahsOnly)}
                className={`flex items-center justify-center px-4 rounded-2xl border transition-all active:scale-95 ${
                  showFavoriteSurahsOnly 
                    ? 'bg-primary border-transparent text-white shadow-lg shadow-primary/20' 
                    : 'bg-light-surface dark:bg-dark-surface border-primary/20 dark:border-primary/30 text-primary dark:text-accent hover:border-primary/30'
                }`}
                title={isRtl ? 'السور المفضلة' : 'Favorite Surahs'}
              >
                <Heart className={`h-6 w-6 ${showFavoriteSurahsOnly ? 'fill-white' : ''}`} />
              </button>
            </div>
            
            <div className="md:w-80 shrink-0 relative">
              <button
                onClick={() => setIsReciterDropdownOpen(!isReciterDropdownOpen)}
                className="w-full flex items-center justify-between px-4 py-4 border border-primary/30 dark:border-primary/40 dark:border-primary/30 rounded-2xl bg-light-surface dark:bg-dark-surface dark:text-white shadow-sm text-lg transition-all hover:border-primary/40 active:scale-[0.98]"
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Mic className="h-4 w-4 text-primary dark:text-accent" />
                  </div>
                  <span className="truncate font-bold">{currentReciterObj?.name || (isRtl ? 'اختر القارئ' : 'Select Reciter')}</span>
                </div>
                <ChevronDown className={`h-5 w-5 text-primary dark:text-accent transition-transform duration-300 ${isReciterDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {isReciterDropdownOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-light-card dark:bg-dark-card border border-primary/30 dark:border-primary/40 dark:border-primary/30 rounded-3xl shadow-2xl z-50 max-h-[70vh] flex flex-col overflow-hidden backdrop-blur-xl"
                  >
                    <div className="p-4 border-b border-primary/15 dark:border-primary/20">
                      <div className="relative group">
                        <Search className={`absolute inset-y-0 ${isRtl ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 h-4 w-4 text-primary/40 group-focus-within:text-primary transition-colors`} />
                        <input
                          type="text"
                          value={reciterSearchQuery}
                          onChange={(e) => setReciterSearchQuery(e.target.value)}
                          placeholder={isRtl ? 'ابحث عن قارئ...' : 'Search for a reciter...'}
                          className={`w-full bg-primary/5 dark:bg-white/5 border-none rounded-xl py-3 ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'} focus:ring-2 focus:ring-primary/20 dark:text-white text-sm font-bold transition-all`}
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                      {filteredReciters.map((reciter) => {
                        const isFav = favoriteReciters.includes(reciter.id);
                        return (
                          <div key={reciter.id} className="flex items-center gap-2 px-2">
                            <button
                              onClick={() => handleReciterChange(reciter.id)}
                              className={`flex-1 flex items-center gap-3 p-3 rounded-2xl transition-all text-right ${
                                selectedReciter === reciter.id 
                                  ? 'bg-primary text-white font-bold shadow-lg shadow-primary/20' 
                                  : 'hover:bg-primary/5 text-light-on-surface dark:text-dark-on-surface'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${selectedReciter === reciter.id ? 'bg-white/20' : 'bg-primary/10'}`}>
                                <Mic className={`h-4 w-4 ${selectedReciter === reciter.id ? 'text-white' : 'text-primary dark:text-accent'}`} />
                              </div>
                              <span className="truncate font-bold">{reciter.name}</span>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavoriteReciter(reciter.id);
                              }}
                              className={`p-3 rounded-xl transition-all active:scale-90 ${isFav ? 'text-primary dark:text-accent' : 'text-primary/20 dark:text-accent/20 hover:text-primary/40'}`}
                            >
                              <Heart className={`h-5 w-5 ${isFav ? 'fill-current' : ''}`} />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div 
            ref={scrollContainerRef}
            className="h-[65vh] overflow-y-auto snap-y snap-mandatory scroll-smooth hide-scrollbar relative px-4 pb-20"
            onScroll={(e) => {
              const container = e.currentTarget;
              const center = container.scrollTop + container.clientHeight / 2;
              const cards = container.getElementsByClassName('surah-card');
              
              Array.from(cards).forEach((card) => {
                const htmlCard = card as HTMLElement;
                const cardCenter = htmlCard.offsetTop + htmlCard.clientHeight / 2;
                const distance = Math.abs(center - cardCenter);
                const maxDistance = container.clientHeight / 2;
                
                let scale = 1 - (distance / maxDistance) * 0.15;
                scale = Math.max(0.85, Math.min(1, scale));
                
                let opacity = 1 - (distance / maxDistance) * 0.6;
                opacity = Math.max(0.3, Math.min(1, opacity));
                
                htmlCard.style.transform = `scale(${scale})`;
                htmlCard.style.opacity = opacity.toString();
              });
            }}
          >
            <div className="py-8 space-y-6">
              {filteredSurahs.map((surah) => {
                const isFav = favoriteSurahs.includes(surah.number);
                return (
                <motion.div
                  key={surah.number}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  onClick={() => handleSurahClick(surah)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSurahClick(surah);
                    }
                  }}
                  className={`surah-card snap-center w-full max-w-2xl mx-auto flex items-center justify-between p-5 sm:p-7 bg-light-card dark:bg-dark-card rounded-[2.5rem] border border-primary/20 dark:border-primary/30 dark:border-primary/30 dark:border-primary/40 hover:border-primary/30 shadow-md hover:shadow-xl hover:shadow-primary/10 transition-all duration-300 group cursor-pointer ${isRtl ? 'text-right' : 'text-left'}`}
                  style={{ transform: 'scale(0.85)', opacity: 0.3 }}
                >
                  <div className="flex items-center gap-5 sm:gap-8 flex-1">
                    <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-3xl overflow-hidden bg-primary/5 flex items-center justify-center group-hover:bg-primary/10 transition-colors shrink-0 shadow-inner">
                      <div className="absolute inset-0 opacity-10">
                        <svg viewBox="0 0 100 100" className="w-full h-full fill-primary">
                          <path d="M50 0 L100 50 L50 100 L0 50 Z" />
                        </svg>
                      </div>
                      <span className="text-2xl font-black text-primary dark:text-accent z-10">{surah.number}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-2xl font-black text-primary dark:text-accent truncate">{surah.name}</h3>
                        {isFav && <Heart className="h-4 w-4 fill-primary text-primary shrink-0" />}
                      </div>
                      <div className="flex items-center gap-3 text-sm font-bold text-primary/40 dark:text-accent/40">
                        <span className="uppercase tracking-wider">{surah.englishName}</span>
                        <span className="w-1 h-1 rounded-full bg-primary/20"></span>
                        <span>{surah.numberOfAyahs} {isRtl ? 'آية' : 'Ayahs'}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4 sm:gap-6 shrink-0 ml-2 rtl:mr-2 rtl:ml-0">
                    <div className="hidden sm:flex flex-col items-end">
                      <span className="text-xs font-black text-primary/20 dark:text-accent/20 uppercase tracking-widest">{surah.revelationType === 'Meccan' ? (isRtl ? 'مكية' : 'Meccan') : (isRtl ? 'مدنية' : 'Medinan')}</span>
                    </div>
                    <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all duration-300">
                      {isRtl ? (
                        <ChevronLeft className="h-6 w-6 transition-transform group-hover:-translate-x-1" />
                      ) : (
                        <ChevronRight className="h-6 w-6 transition-transform group-hover:translate-x-1" />
                      )}
                    </div>
                  </div>
                </motion.div>
              );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6 pb-24">
          <div className="sticky top-16 z-40 bg-light-bg/80 dark:bg-dark-bg/80 backdrop-blur-xl py-4 transition-all border-b border-primary/20 dark:border-primary/30 dark:border-primary/30 dark:border-primary/40 shadow-sm dark:shadow-none">
            <div className="flex items-center justify-between gap-4">
              <button
                onClick={() => {
                  setSelectedSurah(null);
                  stopQuran();
                }}
                className="p-3 rounded-2xl bg-primary/5 text-primary dark:text-accent hover:bg-primary/10 transition-all active:scale-90"
              >
                {isRtl ? <ChevronRight className="h-6 w-6" /> : <ChevronLeft className="h-6 w-6" />}
              </button>
              
              <div className="flex-1 text-center">
                <h2 className="text-3xl font-black text-primary dark:text-accent">{selectedSurah.name}</h2>
                <p className="text-sm font-bold text-primary/40 dark:text-accent/40 uppercase tracking-widest">{selectedSurah.englishName}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleFavoriteSurah(selectedSurah.number)}
                  className={`p-3 rounded-2xl transition-all active:scale-90 ${
                    favoriteSurahs.includes(selectedSurah.number)
                      ? 'bg-primary text-white shadow-lg shadow-primary/20'
                      : 'bg-primary/5 text-primary dark:text-accent hover:bg-primary/10'
                  }`}
                >
                  <Heart className={`h-6 w-6 ${favoriteSurahs.includes(selectedSurah.number) ? 'fill-white' : ''}`} />
                </button>
                <div className="relative">
                  <button
                    onClick={() => setIsDownloadDropdownOpen(!isDownloadDropdownOpen)}
                    className="p-3 rounded-2xl bg-primary/5 text-primary dark:text-accent hover:bg-primary/10 transition-all active:scale-90"
                  >
                    <Download className="h-6 w-6" />
                  </button>
                  
                  <AnimatePresence>
                    {isDownloadDropdownOpen && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className={`absolute top-full ${isRtl ? 'left-0' : 'right-0'} mt-2 w-64 bg-light-card dark:bg-dark-card border border-primary/30 dark:border-primary/40 dark:border-primary/30 rounded-3xl shadow-2xl z-50 overflow-hidden backdrop-blur-xl`}
                      >
                        <div className="p-2 space-y-1">
                          <button
                            onClick={handleDownloadSurah}
                            disabled={isDownloading || !currentAudioUrl}
                            className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-primary/5 text-primary dark:text-accent transition-all text-right font-bold disabled:opacity-50"
                          >
                            <FileAudio className="h-5 w-5" />
                            <div className="flex flex-col items-start">
                              <span>{isRtl ? 'تحميل السورة (MP3)' : 'Download Surah (MP3)'}</span>
                              <span className="text-[10px] opacity-40">{currentReciterObj?.name}</span>
                            </div>
                          </button>
                          <button
                            onClick={handleDownloadFullQuran}
                            className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-primary/5 text-primary dark:text-accent transition-all text-right font-bold"
                          >
                            <ListMusic className="h-5 w-5" />
                            <div className="flex flex-col items-start">
                              <span>{isRtl ? 'تحميل المصحف كاملاً (M3U)' : 'Download Full Quran (M3U)'}</span>
                              <span className="text-[10px] opacity-40">{isRtl ? 'قائمة تشغيل لجميع السور' : 'Playlist for all surahs'}</span>
                            </div>
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-primary/5 dark:bg-white/5 p-6 rounded-[2rem] border border-primary/30 dark:border-primary/40 dark:border-primary/30 shadow-md">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Mic className="h-6 w-6 text-primary dark:text-accent" />
              </div>
              <div>
                <p className="text-xs font-black text-primary/40 dark:text-accent/40 uppercase tracking-widest">{isRtl ? 'القارئ الحالي' : 'Current Reciter'}</p>
                <p className="text-lg font-black text-primary dark:text-accent">{currentReciterObj?.name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAutoScrollEnabled(!autoScrollEnabled)}
                className={`flex items-center gap-2 px-6 py-3 rounded-2xl transition-all font-bold active:scale-95 ${
                  autoScrollEnabled 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                    : 'bg-primary/5 text-primary dark:text-accent hover:bg-primary/10'
                }`}
              >
                <BookOpen className="h-5 w-5" />
                <span>{isRtl ? 'تتبع الآيات' : 'Auto-scroll'}</span>
              </button>
              
              {autoScrollEnabled && (
                <button
                  onClick={() => setFocusMode(!focusMode)}
                  className="p-3 rounded-2xl bg-primary/5 text-primary dark:text-accent hover:bg-primary/10 transition-all active:scale-95"
                  title={isRtl ? (focusMode ? 'إظهار كل الآيات' : 'التركيز على الآية') : (focusMode ? 'Show all ayahs' : 'Focus single ayah')}
                >
                  {focusMode ? <List className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
                </button>
              )}

              <div className="h-8 w-px bg-primary/10 mx-1"></div>

              <button
                onClick={() => setHighlightWaqf(!highlightWaqf)}
                className={`p-3 rounded-2xl transition-all active:scale-95 ${highlightWaqf ? 'bg-primary/10 text-primary dark:text-accent' : 'text-primary/40 dark:text-accent/40 hover:bg-primary/5'}`}
                title={isRtl ? 'تلوين أحكام الوقف' : 'Highlight Waqf Rules'}
              >
                <Palette className="h-6 w-6" />
              </button>

              <button
                onClick={() => setHighlightHarakat(!highlightHarakat)}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 active:scale-95 ${
                  highlightHarakat 
                    ? 'bg-emerald-500/10 border border-emerald-500/20 shadow-[0_0_15px_rgba(52,211,153,0.15)] text-emerald-400 backdrop-blur-md' 
                    : 'bg-primary/5 text-primary/40 dark:text-accent/40 hover:bg-primary/10 hover:text-primary transition-colors'
                }`}
                title={isRtl ? 'تلوين التشكيل (وضع التعلم)' : 'Highlight Harakat (Learning Mode)'}
              >
                <div className="relative flex items-center justify-center w-full h-full">
                  <span className={`text-[26px] leading-none mb-1 font-amiri font-bold ${highlightHarakat ? 'text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.9)]' : ''}`}>
                    ؏
                  </span>
                  <Palette className={`absolute top-1.5 right-1.5 h-[14px] w-[14px] ${highlightHarakat ? 'text-emerald-300 drop-shadow-[0_0_5px_rgba(110,231,183,0.8)]' : 'opacity-60'}`} strokeWidth={2.5} />
                </div>
              </button>
            </div>
          </div>

          {currentAudioUrl && (
            <div className="bg-light-card dark:bg-dark-card p-6 rounded-[2rem] border border-primary/30 dark:border-primary/40 dark:border-primary/30 shadow-xl">
              <AudioPlayer 
                audioRef={quranAudioRef} 
                isPlaying={isPlayingQuran} 
                onTogglePlay={toggleAudio} 
                isRtl={isRtl} 
                onOpenVisualizer={() => setIsVisualizerOpen(true)}
              />
            </div>
          )}

          {loadingAyahs ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            </div>
          ) : (
            <div className={`space-y-8 ${focusMode && autoScrollEnabled ? 'max-w-3xl mx-auto' : ''}`}>
              {/* Bismillah */}
              {selectedSurah.number !== 1 && selectedSurah.number !== 9 && (
                <div className="text-center py-12">
                  <div className="text-4xl font-quran text-primary dark:text-accent opacity-80">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
                </div>
              )}

              {(autoScrollEnabled && focusMode ? ayahs.filter(ayah => parseInt(ayah.aya, 10) === (activeAyahNumber || 1)) : ayahs).map((ayah) => {
                const ayahNumber = parseInt(ayah.aya, 10);
                const isActive = autoScrollEnabled && activeAyahNumber === ayahNumber;
                const isPlaying = playingAyahId === parseInt(ayah.id, 10);
                
                return (
                  <motion.div
                    key={ayah.id}
                    id={`ayah-${ayahNumber}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    animate={{ 
                      scale: isActive ? 1.02 : 1,
                      x: isActive ? (isRtl ? -5 : 5) : 0
                    }}
                    className={`p-8 rounded-[2.5rem] border transition-all duration-500 relative group scroll-mt-40 ${
                      isActive 
                        ? 'bg-primary/5 border-primary/30 dark:border-primary/40 shadow-xl shadow-primary/5' 
                        : 'bg-light-surface dark:bg-dark-surface border-primary/15 dark:border-primary/20 hover:border-primary/20 dark:border-primary/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-6 mb-8">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black transition-all ${isActive ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-primary/5 text-primary/40 dark:text-accent/40'}`}>
                          {ayahNumber}
                        </div>
                        <button
                          onClick={() => toggleAyahAudio(parseInt(ayah.id, 10))}
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-90 ${isPlaying ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-primary/5 text-primary/40 dark:text-accent/40 hover:bg-primary/10 hover:text-primary'}`}
                        >
                          {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {(highlightHarakat || highlightWaqf) && (
                          <button
                            onClick={() => setIsColorGuideOpen(true)}
                            className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all bg-primary/5 text-primary/40 dark:text-accent/40 hover:bg-primary/10 hover:text-primary active:scale-95 relative"
                            title={isRtl ? 'دليل الألوان' : 'Color Guide'}
                          >
                            <Palette className="h-6 w-6" />
                            <div className="absolute top-[10px] right-[10px] w-3.5 h-3.5 bg-light-surface dark:bg-dark-surface rounded-full flex items-center justify-center border border-primary/20">
                              <span className="text-[9px] font-bold text-primary dark:text-accent">?</span>
                            </div>
                          </button>
                        )}
                        <ShareButton 
                          isRtl={isRtl} 
                          text={`${ayah.arabic_text}\n\n[سورة ${selectedSurah.name} - آية ${ayahNumber}]`} 
                          title={isRtl ? 'مشاركة آية' : 'Share Ayah'} 
                        />
                      </div>
                    </div>

                    <div className="space-y-8 flex flex-col items-end">
                      <div className="relative w-full p-8 sm:p-10 bg-primary/5 dark:bg-white/5 rounded-3xl border border-primary/20 flex flex-col items-center">
                        {/* Decorative Corners */}
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary/30 rounded-tr-2xl" />
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/30 rounded-tl-2xl" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary/30 rounded-br-2xl" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary/30 rounded-bl-2xl" />
                        
                        <div className={`w-full text-3xl sm:text-4xl leading-[2.2] font-quran text-primary dark:text-accent sm:text-center text-right transition-all duration-500 font-bold ${isActive ? 'scale-[1.02]' : ''}`}>
                          <QuranText 
                            text={ayah.arabic_text} 
                            highlightWaqf={highlightWaqf} 
                            highlightHarakat={highlightHarakat} 
                            isRtl={isRtl} 
                          />
                        </div>
                      </div>
                      
                      <div className="h-px w-24 bg-primary/10 self-center"></div>
                      
                      <p className="text-lg font-bold text-primary/60 dark:text-accent/60 leading-relaxed text-right w-full">
                        {ayah.translation}
                      </p>
                    </div>

                    {isActive && (
                      <div className="absolute -inset-px rounded-[2.5rem] border-2 border-primary/30 dark:border-primary/40 pointer-events-none animate-pulse"></div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {isSearchOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-4xl bg-light-bg dark:bg-dark-bg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-primary/20 dark:border-primary/30 flex items-center justify-between bg-primary/5">
                <h2 className="text-2xl font-black text-primary dark:text-accent flex items-center gap-3">
                  <Search className="h-6 w-6" />
                  {isRtl ? 'البحث في القرآن' : 'Quran Search'}
                </h2>
                <button 
                  onClick={() => setIsSearchOpen(false)}
                  className="p-2 rounded-xl hover:bg-primary/10 text-primary dark:text-accent transition-all"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                <QuranSearch
                  isRtl={isRtl}
                  onClose={() => setIsSearchOpen(false)}
                  onSelectAyah={async (surahNumber, ayahNumber) => {
                    const surah = surahs.find(s => s.number === surahNumber);
                    if (surah) {
                      await handleSurahClick(surah);
                      setTimeout(() => {
                        const element = document.getElementById(`ayah-${ayahNumber}`);
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }
                      }, 500);
                    }
                  }}
                />
              </div>
            </motion.div>
          </motion.div>
        )}

        {isColorGuideOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-md bg-light-bg dark:bg-dark-bg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col"
              dir={isRtl ? 'rtl' : 'ltr'}
            >
              <div className="p-6 border-b border-primary/20 dark:border-primary/30 flex items-center justify-between bg-primary/5">
                <h2 className="text-xl font-black text-primary dark:text-accent flex items-center gap-3">
                  <Palette className="h-6 w-6" />
                  {isRtl ? 'دليل الألوان' : 'Color Guide'}
                </h2>
                <button 
                  onClick={() => setIsColorGuideOpen(false)}
                  className="p-2 rounded-xl hover:bg-primary/10 text-primary dark:text-accent transition-all"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
                <div className="p-6 space-y-4">
                {highlightHarakat && (
                  <>
                    <h3 className="text-lg font-bold text-primary/80 dark:text-accent/80 mb-3">{isRtl ? 'التشكيل' : 'Harakat'}</h3>
                    <div className="flex items-center gap-4 p-3 rounded-xl bg-rose-500/10">
                      <div className="w-8 h-8 rounded-full bg-rose-500 flex items-center justify-center text-white font-bold shrink-0">َ</div>
                      <div className="text-rose-500 dark:text-rose-400 font-bold">{isRtl ? 'الفتحة وتنوين الفتح' : 'Fatha & Fathatan'}</div>
                    </div>
                    <div className="flex items-center gap-4 p-3 rounded-xl bg-amber-500/10">
                      <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold shrink-0">ُ</div>
                      <div className="text-amber-500 dark:text-amber-400 font-bold">{isRtl ? 'الضمة وتنوين الضم' : 'Damma & Dammatan'}</div>
                    </div>
                    <div className="flex items-center gap-4 p-3 rounded-xl bg-indigo-500/10">
                      <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold shrink-0">ِ</div>
                      <div className="text-indigo-500 dark:text-indigo-400 font-bold">{isRtl ? 'الكسرة وتنوين الكسر' : 'Kasra & Kasratan'}</div>
                    </div>
                    <div className="flex items-center gap-4 p-3 rounded-xl bg-emerald-500/10">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold shrink-0">ّ</div>
                      <div className="text-emerald-500 dark:text-emerald-400 font-bold">{isRtl ? 'الشدة' : 'Shadda'}</div>
                    </div>
                    <div className="flex items-center gap-4 p-3 rounded-xl bg-sky-500/10">
                      <div className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white font-bold shrink-0">ْ</div>
                      <div className="text-sky-500 dark:text-sky-400 font-bold">{isRtl ? 'السكون' : 'Sukun'}</div>
                    </div>
                  </>
                )}
                {highlightWaqf && (
                  <div className={`${highlightHarakat ? 'mt-4 pt-4 border-t border-primary/10' : ''}`}>
                    <h3 className="text-lg font-bold text-primary/80 dark:text-accent/80 mb-3">{isRtl ? 'علامات الوقف' : 'Waqf Marks'}</h3>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-red-500 font-bold text-xl w-6 text-center">مـ</span>
                        <span className="text-sm text-primary/70 dark:text-accent/70">{isRtl ? 'الوقف اللازم' : 'Mandatory Stop'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-blue-500 font-bold text-xl w-6 text-center">ج</span>
                        <span className="text-sm text-primary/70 dark:text-accent/70">{isRtl ? 'جواز الوقف' : 'Permissible Stop'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-green-500 font-bold text-xl w-6 text-center">صلے</span>
                        <span className="text-sm text-primary/70 dark:text-accent/70">{isRtl ? 'الوصل أولى' : 'Continuation Better'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-orange-500 font-bold text-xl w-6 text-center">قلے</span>
                        <span className="text-sm text-primary/70 dark:text-accent/70">{isRtl ? 'الوقف أولى' : 'Stop Better'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-purple-500 font-bold text-xl w-6 text-center">∴</span>
                        <span className="text-sm text-primary/70 dark:text-accent/70">{isRtl ? 'تعانق (إذا وقفت على أحدهما لا تقف على الآخر)' : 'Interchangeable (stop at one, not both)'}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-teal-500 font-bold text-xl w-6 text-center">س</span>
                        <span className="text-sm text-primary/70 dark:text-accent/70">{isRtl ? 'سكتة لطيفة' : 'Short Pause'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {isVisualizerOpen && currentAudioUrl && selectedSurah && currentReciterObj && (
        <AudioPlaybackScreen
          audioUrl={currentAudioUrl}
          title={`${isRtl ? selectedSurah.name : selectedSurah.englishName} - ${currentReciterObj.name}`}
          image={`https://picsum.photos/seed/surah_${selectedSurah.number}/400/400?blur=2`}
          onClose={() => setIsVisualizerOpen(false)}
          isRtl={isRtl}
          audioElement={quranAudioRef.current}
          verseTimings={verseTimings}
          ayahs={ayahs}
          isHighQuality={!!currentReciterObj.qdcId || currentReciterObj.isQuranCom}
          isExactTimings={isExactTimings}
          timingsDuration={timingsDuration}
        />
      )}
    </div>
  );
}
