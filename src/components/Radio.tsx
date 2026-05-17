import React, { useState, useEffect, useRef } from 'react';
import { Radio as RadioIcon, Play, Pause, Loader2, Volume2, VolumeX, Search, Heart, Plus, Check, Maximize2, RefreshCw } from 'lucide-react';
import { useAudio, RadioStation } from './AudioContext';
import { useFavorites } from './FavoritesContext';
import { fetchWithCache } from '../utils/network';
import { motion, useScroll, useTransform } from "motion/react";
import AudioPlaybackScreen from './AudioPlaybackScreen';

interface RadioProps {
  isRtl: boolean;
  activeTab: string;
}

function RadioCard({ station, isActive, isFavorite, isPlaying, isBuffering, error, handlePlay, toggleFavoriteRadio, isRtl, onOpenVisualizer }: any) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"]
  });

  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.9, 1.05, 0.9]);
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [15, 0, -15]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.5, 0.8, 1], [0.5, 1, 1, 1, 0.5]);

  return (
    <motion.div
      ref={ref}
      style={{ scale, rotateX, opacity, transformPerspective: 1000 }}
      className={`bg-light-card dark:bg-dark-card rounded-3xl overflow-hidden border transition-all group hover:shadow-xl relative ${
        isActive ? 'border-primary dark:border-accent shadow-lg ring-1 ring-primary dark:ring-accent' : 'border-primary/20 dark:border-primary/30 dark:border-dark-border hover:border-primary/30'
      }`}
    >
      <div className="h-48 overflow-hidden relative cursor-pointer" onClick={() => handlePlay(station)}>
        <img
          src={station.img || `https://picsum.photos/seed/radio_${station.id}/400/300?blur=2`}
          alt={station.name}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity"></div>
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenVisualizer(station);
            }}
            className="p-2.5 rounded-2xl bg-black/40 backdrop-blur-md text-white hover:bg-primary transition-all active:scale-90"
            title={isRtl ? 'عرض تفاعلي' : 'Visualizer'}
          >
            <Maximize2 className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavoriteRadio(station.id.toString());
            }}
            className="p-2.5 rounded-2xl bg-black/40 backdrop-blur-md text-white hover:bg-primary transition-all active:scale-90"
          >
            {isFavorite ? <Check className="h-5 w-5 text-accent" /> : <Plus className="h-5 w-5" />}
          </button>
        </div>
      </div>
      
      <div className="p-6 flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          {isActive && (isPlaying || isBuffering) ? (
            <div className="flex overflow-hidden mask-image-linear-gradient mb-1">
              <h3 className={`font-black text-primary dark:text-accent text-lg whitespace-nowrap ${isRtl ? 'animate-marquee-rtl' : 'animate-marquee-ltr'}`}>
                {station.name}
              </h3>
            </div>
          ) : (
            <h3 className="font-black text-primary dark:text-accent text-lg mb-1 line-clamp-1" title={station.name}>
              {station.name}
            </h3>
          )}
          <p className={`text-xs font-bold flex items-center gap-1.5 uppercase tracking-widest ${error ? 'text-red-500' : 'text-primary/40 dark:text-accent/40'}`}>
            <RadioIcon className={`h-3.5 w-3.5 ${isActive && (isPlaying || isBuffering) ? 'animate-glow text-primary dark:text-accent' : ''}`} /> 
            {error ? (isRtl ? 'غير متاح حالياً' : 'Offline') : (isRtl ? 'بث مباشر' : 'Live')}
            {station.id.toString().startsWith('feat_') && !error && (
              <span className="bg-primary/10 text-primary dark:text-accent px-2 py-0.5 rounded-full text-[10px] ml-1">
                {isRtl ? 'مستقر' : 'Stable'}
              </span>
            )}
          </p>
        </div>
        
        <button
          onClick={() => handlePlay(station)}
          disabled={isActive && isBuffering}
          className={`shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-all shadow-lg active:scale-95 ${
            isActive && (isPlaying || isBuffering)
              ? 'bg-primary text-white shadow-primary/20'
              : 'bg-primary/5 text-primary dark:text-accent hover:bg-primary/10'
          }`}
        >
          {isActive && isBuffering ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : isActive && isPlaying ? (
            <Pause className="h-6 w-6" />
          ) : (
            <Play className={`h-6 w-6 ${isRtl ? 'mr-1' : 'ml-1'}`} />
          )}
        </button>
      </div>
    </motion.div>
  );
}

export default function Radio({ isRtl, activeTab }: RadioProps) {
  const [stations, setStations] = useState<RadioStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [radioTab, setRadioTab] = useState<'reciter' | 'channel' | 'misc'>('channel');
  const [miscTab, setMiscTab] = useState<'translated' | 'azkar' | 'stories' | 'tafsir' | 'others'>('translated');
  
  const { 
    radioAudioRef: audioRef, 
    isPlayingRadio: isPlaying, 
    isBufferingRadio: isBuffering,
    activeRadioStation: activeStation,
    handleRadioPlay: handlePlay,
    isRadioMuted: isMuted,
    setIsRadioMuted: setIsMuted,
    radioError,
    stopQuran
  } = useAudio();

  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [visualizerStation, setVisualizerStation] = useState<RadioStation | null>(null);
  const { favoriteRadios, toggleFavoriteRadio } = useFavorites();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRadios = async (force = false) => {
    try {
      if (force) setIsRefreshing(true);
      const lang = isRtl ? 'ar' : 'eng';
      
      if (force) {
        localStorage.removeItem(`radios_new_${lang}`);
        localStorage.removeItem('radios_old');
      }
      
      // Fetch new API
      const dataNew = await fetchWithCache(`https://www.mp3quran.net/api/v3/radios?language=${lang}`, `radios_new_${lang}`);
        const newRadios = dataNew.radios || [];

        // Fetch old API
        let processedOldRadios: any[] = [];
        try {
          const dataOld = await fetchWithCache('https://data-rosy.vercel.app/radio.json', 'radios_old');
          const oldRadios = dataOld.radios || [];
          processedOldRadios = oldRadios.map((radio: any) => {
            let category = 'reciter';
            if (radio.id >= 19) {
              if (radio.id === 19 || radio.id === 20) category = 'channel';
              else if (radio.id === 24) category = 'tafsir';
              else if (radio.id === 22) category = 'azkar';
              else category = 'others';
            }
            
            let url = radio.url;
            if (url && url.startsWith('http://')) {
              url = url.replace('http://', 'https://');
            }
            let name = radio.name;
            let img = radio.img;
            if (radio.id === 19) {
              url = 'https://stream.radiojar.com/8s5u5tpdtwzuv';
              img = 'https://k.top4top.io/p_3738fgsvo0.png';
            }
            if (radio.id === 20) {
              name = 'إذاعة القرآن الكريم (السعودية)';
              url = 'https://stream.radiojar.com/0tpy1h0kxtzuv';
            }

            return {
              id: `old_${radio.id}`,
              name,
              url,
              img,
              category
            };
          });
        } catch (err) {
          console.warn('Old radio API failed:', err);
        }

        // Process new radios
        const processedNewRadios = newRadios.map((radio: any) => {
          const name = radio.name || '';
          const nameLower = name.toLowerCase();
          const id = radio.id;
          
          let category = 'reciter';
          
          const channels = [109082];
          const translated = [109039, 109040, 109041, 109042, 109043, 109044, 109045, 109046, 109047, 109048, 109049, 109050, 109051, 109052, 109053, 109054, 109055, 109056, 109057, 109058, 109059, 109062];
          const tafsir = [113, 116, 10904, 21116, 21117, 109076];
          const azkar = [114, 10906, 10907];
          const stories = [10903, 21114, 21115, 109066, 109067, 109069, 109073];
          const others = [108, 109, 110, 115, 123, 10902, 109060, 109061];

          if (channels.includes(id)) category = 'channel';
          else if (translated.includes(id)) category = 'translated';
          else if (tafsir.includes(id)) category = 'tafsir';
          else if (azkar.includes(id)) category = 'azkar';
          else if (stories.includes(id)) category = 'stories';
          else if (others.includes(id)) category = 'others';
          else {
            if (name.includes('ترجمة') || nameLower.includes('translation') || nameLower.includes('translated')) category = 'translated';
            else if (name.includes('تفسير') || name.includes('فتاوى') || name.includes('المختصر') || nameLower.includes('tafsir') || nameLower.includes('fatwa') || nameLower.includes('explanation') || nameLower.includes('jurisprudential')) category = 'tafsir';
            else if (name.includes('أذكار') || name.includes('رقية') || nameLower.includes('azkar') || nameLower.includes('adhkar') || nameLower.includes('roqya') || nameLower.includes('ruqyah') || nameLower.includes('remembrance')) category = 'azkar';
            else if (name.includes('قصص') || name.includes('سيرة') || name.includes('صور من حياة') || name.includes('رياض الصالحين') || name.includes('صحيح') || nameLower.includes('stories') || nameLower.includes('seerah') || nameLower.includes('biography') || nameLower.includes('hadith') || nameLower.includes('sahih')) category = 'stories';
            else if (name.includes('إذاعة القرآن الكريم - السعودية') || nameLower.includes('saudi') || nameLower.includes('quran station')) category = 'channel';
            else if (name.includes('تكبيرات') || name.includes('تلاوات خاشعة') || name.includes('آيات السكينة') || name.includes('سورة الملك') || name.includes('فضل شهر رمضان') || name.includes('الإذاعة العامة') || nameLower.includes('recitations') || nameLower.includes('general') || nameLower.includes('ramadan') || nameLower.includes('takbeer') || nameLower.includes('verses of serenity') || nameLower.includes('surah')) category = 'others';
          }
          
          let img = `https://picsum.photos/seed/radio_new_${radio.id}/400/300?blur=2`;
          if (category === 'reciter') {
            img = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=059669&color=fff&size=400&bold=true`;
          }
          if (name.includes('إذاعة القرآن الكريم من القاهرة') || name.includes('إذاعة القرآن الكريم - القاهرة') || name === 'إذاعة القرآن الكريم') {
            img = 'https://k.top4top.io/p_3738fgsvo0.png';
          }

          let url = radio.url;
          if (url && url.startsWith('http://')) {
            url = url.replace('http://', 'https://');
          }
          
          return {
            id: `new_${radio.id}`,
            name: radio.name,
            url: url,
            img,
            category
          };
        });

        const allRadios = [...processedOldRadios, ...processedNewRadios];
        
        // Add some guaranteed stable featured reciters if missing or to prioritize
        const featuredReciters = [
          { id: 'feat_afasy', name: 'مشاري العفاسي', url: 'https://stream.radiojar.com/8s5u5tpdtwzuv', img: 'https://ui-avatars.com/api/?name=مشاري+العفاسي&background=059669&color=fff&size=400&bold=true', category: 'reciter' },
          { id: 'feat_sudais', name: 'عبدالرحمن السديس', url: 'https://backup.qurango.net/radio/abdulrahman_alsudaes', img: 'https://ui-avatars.com/api/?name=عبدالرحمن+السديس&background=059669&color=fff&size=400&bold=true', category: 'reciter' },
          { id: 'feat_shuraim', name: 'سعود الشريم', url: 'https://backup.qurango.net/radio/saud_alshuraim', img: 'https://ui-avatars.com/api/?name=سعود+الشريم&background=059669&color=fff&size=400&bold=true', category: 'reciter' },
          { id: 'feat_muaiqly', name: 'ماهر المعيقلي', url: 'https://backup.qurango.net/radio/maher', img: 'https://ui-avatars.com/api/?name=ماهر+المعيقلي&background=059669&color=fff&size=400&bold=true', category: 'reciter' },
          { id: 'feat_dosari', name: 'ياسر الدوسري', url: 'https://backup.qurango.net/radio/yasser_aldosari', img: 'https://ui-avatars.com/api/?name=ياسر+الدوسري&background=059669&color=fff&size=400&bold=true', category: 'reciter' },
          { id: 'feat_ajmi', name: 'أحمد العجمي', url: 'https://backup.qurango.net/radio/ahmad_alajmy', img: 'https://ui-avatars.com/api/?name=أحمد+العجمي&background=059669&color=fff&size=400&bold=true', category: 'reciter' },
          { id: 'feat_qatami', name: 'ناصر القطامي', url: 'https://backup.qurango.net/radio/nasser_alqatami', img: 'https://ui-avatars.com/api/?name=ناصر+القطامي&background=059669&color=fff&size=400&bold=true', category: 'reciter' },
          { id: 'feat_abkar', name: 'إدريس أبكر', url: 'https://backup.qurango.net/radio/idrees_abkr', img: 'https://ui-avatars.com/api/?name=إدريس+أبكر&background=059669&color=fff&size=400&bold=true', category: 'reciter' },
          { id: 'feat_shatri', name: 'أبو بكر الشاطري', url: 'https://backup.qurango.net/radio/shaik_abu_bakr_al_shatri', img: 'https://ui-avatars.com/api/?name=أبو+بكر+الشاطري&background=059669&color=fff&size=400&bold=true', category: 'reciter' },
          { id: 'feat_abbad', name: 'فارس عباد', url: 'https://backup.qurango.net/radio/fares_abbad', img: 'https://ui-avatars.com/api/?name=فارس+عباد&background=059669&color=fff&size=400&bold=true', category: 'reciter' },
        ];

        const combinedRadios = [...featuredReciters, ...allRadios];

        // Filter out stations with invalid or missing URLs
        const validRadios = combinedRadios.filter(r => {
          if (!r.url) return false;
          try {
            new URL(r.url);
            return true;
          } catch (e) {
            return false;
          }
        });
        
        // Ensure uniqueness by URL, but keep the first occurrence (which would be our featured ones)
        const uniqueRadios = Array.from(new Map(validRadios.map(item => [item.url, item])).values());
        
        setStations(uniqueRadios);
      } catch (error) {
        console.error('Error fetching Radio:', error);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    };

  useEffect(() => {
    fetchRadios();
  }, [isRtl]);

  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const isVisible = activeTab === 'radio';

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-12 w-12 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className={isVisible ? "animate-in fade-in duration-500 pb-24" : "hidden"}>
      {isVisible && (
        <div className="mb-12 bg-primary dark:bg-dark-card rounded-[3rem] p-10 sm:p-16 text-white flex flex-col lg:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden transition-all border border-primary/20 dark:border-primary/30">
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-white rounded-full blur-3xl" />
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-white rounded-full blur-3xl" />
          </div>

          <div className="relative z-10 flex items-center gap-6">
            <div className="bg-white/10 p-6 rounded-[2rem] backdrop-blur-xl border border-white/20 shadow-inner">
              <RadioIcon className={`h-12 w-12 text-white ${isPlaying ? 'animate-glow' : ''}`} />
            </div>
            <div>
              <h2 className="text-4xl font-black mb-2">
                {radioTab === 'reciter' 
                  ? (isRtl ? 'إذاعات القراء' : 'Reciters Radios')
                  : radioTab === 'channel'
                    ? (isRtl ? 'قنوات الراديو' : 'Radio Channels')
                    : (isRtl ? 'إذاعات متنوعة' : 'Diverse Radios')}
              </h2>
              <p className="text-white/60 font-bold text-lg">
                {radioTab === 'reciter'
                  ? (isRtl ? 'تلاوات عطرة بأصوات أشهر القراء' : 'Fragrant recitations by famous reciters')
                  : radioTab === 'channel'
                    ? (isRtl ? 'بث مباشر لأشهر القنوات الإذاعية' : 'Live broadcast of famous radio channels')
                    : (isRtl ? 'محتوى إسلامي متنوع على مدار الساعة' : 'Various Islamic content around the clock')}
              </p>
            </div>
          </div>

          {activeStation && (
            <div className="relative z-10 bg-black/20 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-6 flex items-center gap-8 shadow-2xl w-full lg:w-auto transition-all">
              <div className="flex items-center gap-5 flex-1 overflow-hidden">
                <div className="relative shrink-0">
                  <img 
                    src={activeStation.img || `https://picsum.photos/seed/radio_${activeStation.id}/100/100?blur=2`} 
                    alt={activeStation.name} 
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 rounded-3xl object-cover border-4 border-white/20 shadow-lg"
                  />
                  {isPlaying && (
                    <div className="absolute -bottom-2 -right-2 bg-white text-primary p-1.5 rounded-full shadow-lg">
                      <div className="flex gap-0.5 items-end h-4 px-1">
                        <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-1 bg-primary rounded-full" />
                        <motion.div animate={{ height: [8, 16, 8] }} transition={{ repeat: Infinity, duration: 0.6 }} className="w-1 bg-primary rounded-full" />
                        <motion.div animate={{ height: [6, 14, 6] }} transition={{ repeat: Infinity, duration: 0.4 }} className="w-1 bg-primary rounded-full" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 overflow-hidden">
                  <div className="text-xs font-black text-white/40 mb-2 flex items-center gap-2 uppercase tracking-widest">
                    <RadioIcon className={`h-4 w-4 ${isPlaying || isBuffering ? 'animate-glow text-white' : ''}`} />
                    {isRtl ? 'يتم التشغيل الآن' : 'Now Playing'}
                  </div>
                  <div className="relative h-8 w-full overflow-hidden mask-image-linear-gradient flex">
                    <div className={`whitespace-nowrap font-black text-xl shrink-0 min-w-full ${isRtl ? 'animate-marquee-rtl' : 'animate-marquee-ltr'}`}>
                      {activeStation.name}
                    </div>
                  </div>
                </div>
              </div>

              <div className={`flex items-center gap-5 shrink-0 ${isRtl ? 'mr-auto' : 'ml-auto'}`}>
                <button 
                  onClick={toggleMute} 
                  className="p-3 text-white/60 hover:text-white hover:bg-white/10 rounded-2xl transition-all active:scale-90"
                >
                  {isMuted ? <VolumeX className="w-7 h-7" /> : <Volume2 className="w-7 h-7" />}
                </button>
                
                {isBuffering ? (
                  <div className="bg-white text-primary p-5 rounded-full shadow-xl flex items-center justify-center w-20 h-20">
                    <Loader2 className="h-10 w-10 animate-spin" />
                  </div>
                ) : (
                  <button
                    onClick={() => handlePlay(activeStation)}
                    className="flex items-center justify-center w-20 h-20 bg-white text-primary rounded-full hover:scale-105 active:scale-95 transition-all shadow-2xl"
                  >
                    {isPlaying ? <Pause className="h-10 w-10" /> : <Play className="h-10 w-10 ml-1" />}
                  </button>
                )}
              </div>
            </div>
          )}
          
        </div>
      )}

      {isVisible && (
        <div className="space-y-12">
          {activeTab === 'radio' && (
            <div className="relative z-10 flex bg-primary/5 dark:bg-white/5 rounded-[2rem] p-1.5 mb-12 border border-primary/20 dark:border-primary/30">
              <button
                onClick={() => setRadioTab('reciter')}
                className={`flex-1 py-4 rounded-[1.5rem] font-black transition-all ${radioTab === 'reciter' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-primary/60 dark:text-accent/60 hover:text-primary'}`}
              >
                {isRtl ? 'إذاعات القراء' : 'Reciters Radios'}
              </button>
              <button
                onClick={() => setRadioTab('channel')}
                className={`flex-1 py-4 rounded-[1.5rem] font-black transition-all ${radioTab === 'channel' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-primary/60 dark:text-accent/60 hover:text-primary'}`}
              >
                {isRtl ? 'قنوات الراديو' : 'Radio Channels'}
              </button>
              <button
                onClick={() => setRadioTab('misc')}
                className={`flex-1 py-4 rounded-[1.5rem] font-black transition-all ${radioTab === 'misc' ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-primary/60 dark:text-accent/60 hover:text-primary'}`}
              >
                {isRtl ? 'إذاعات متنوعة' : 'Diverse Radios'}
              </button>
            </div>
          )}

          {radioTab === 'misc' && (
            <div className="relative z-10 flex flex-wrap bg-primary/5 dark:bg-white/5 rounded-[2.5rem] p-1.5 mb-12 gap-1.5 border border-primary/20 dark:border-primary/30">
              {[
                { id: 'translated', labelAr: 'القرآن المترجم', labelEn: 'Translated Quran' },
                { id: 'azkar', labelAr: 'الأذكار والرقية', labelEn: 'Azkar & Roqya' },
                { id: 'stories', labelAr: 'قصص وبرامج', labelEn: 'Stories & Programs' },
                { id: 'tafsir', labelAr: 'التفاسير والفتاوى', labelEn: 'Tafsir & Fatawa' },
                { id: 'others', labelAr: 'أخرى', labelEn: 'Others' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setMiscTab(tab.id as any)}
                  className={`flex-1 min-w-[120px] py-4 px-4 rounded-[2rem] font-black text-sm transition-all ${miscTab === tab.id ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-primary/60 dark:text-accent/60 hover:text-primary'}`}
                >
                  {isRtl ? tab.labelAr : tab.labelEn}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-6 mb-12">
            <div className="relative flex-1 group">
              <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-5' : 'left-0 pl-5'} flex items-center pointer-events-none`}>
                <Search className="h-6 w-6 text-primary/40 group-focus-within:text-primary transition-colors" />
              </div>
              <input
                type="text"
                placeholder={isRtl ? 'ابحث عن إذاعة...' : 'Search for a radio...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full bg-light-card dark:bg-dark-card border border-primary/20 dark:border-primary/30 rounded-[2rem] py-4 ${isRtl ? 'pr-14 pl-6' : 'pl-14 pr-6'} focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-primary dark:text-accent font-bold placeholder-primary/20 shadow-sm`}
              />
            </div>
            
            <div className="flex gap-4">
              <button
                onClick={() => fetchRadios(true)}
                disabled={isRefreshing}
                className="flex items-center justify-center p-4 rounded-[2rem] bg-light-card dark:bg-dark-card border border-primary/20 dark:border-primary/30 text-primary dark:text-accent hover:bg-primary/5 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
                title={isRtl ? 'تحديث الإذاعات' : 'Refresh Radios'}
              >
                <RefreshCw className={`h-6 w-6 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
              
              <button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`flex items-center justify-center gap-3 px-8 py-4 rounded-[2rem] font-black transition-all border shadow-sm ${
                  showFavoritesOnly 
                    ? 'bg-primary border-transparent text-white shadow-xl shadow-primary/20' 
                    : 'bg-light-card dark:bg-dark-card border-primary/20 dark:border-primary/30 text-primary dark:text-accent hover:border-primary/30'
                }`}
              >
                <Heart className={`h-6 w-6 ${showFavoritesOnly ? 'fill-white' : ''}`} />
                {isRtl ? 'المفضلة' : 'Favorites'}
              </button>
            </div>
          </div>

          <section>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {stations
                .filter(s => {
                  if (radioTab === 'misc') return s.category === miscTab;
                  return s.category === radioTab;
                })
                .filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .filter(s => showFavoritesOnly ? favoriteRadios.includes(s.id.toString()) : true)
                .map((station) => {
                const isActive = activeStation?.id === station.id;
                const isFavorite = favoriteRadios.includes(station.id.toString());
                
                  return (
                    <RadioCard
                      key={station.id}
                      station={station}
                      isActive={isActive}
                      isFavorite={isFavorite}
                      isPlaying={isPlaying}
                      isBuffering={isBuffering}
                      error={radioError === station.id.toString()}
                      handlePlay={handlePlay}
                      toggleFavoriteRadio={toggleFavoriteRadio}
                      isRtl={isRtl}
                      onOpenVisualizer={setVisualizerStation}
                    />
                  );
              })}
            </div>
          </section>
        </div>
      )}
      {visualizerStation && (
        <AudioPlaybackScreen
          audioUrl={visualizerStation.url}
          title={visualizerStation.name}
          image={visualizerStation.img || `https://picsum.photos/seed/radio_${visualizerStation.id}/400/300?blur=2`}
          onClose={() => setVisualizerStation(null)}
          isRtl={isRtl}
          audioElement={audioRef.current}
        />
      )}
    </div>
  );
}
