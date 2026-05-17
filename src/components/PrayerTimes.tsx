import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Calendar, Clock, Loader2, Navigation, Settings, ChevronDown, Compass, BookOpen, CalendarDays, Search, Sunrise, Sun, Sunset, Moon, Heart, Share2, ChevronLeft, ChevronRight, ListMusic } from 'lucide-react';
import { fetchWithCache } from '../utils/network';
import { useToast } from './ToastContext';
import { motion } from 'motion/react';

interface PrayerData {
  timings: {
    Fajr: string;
    Sunrise: string;
    Dhuhr: string;
    Asr: string;
    Sunset: string;
    Maghrib: string;
    Isha: string;
    Imsak: string;
    Midnight: string;
  };
  date: {
    readable: string;
    hijri: {
      date: string;
      month: { ar: string; en: string };
      year: string;
      weekday: { ar: string; en: string };
    };
  };
}

interface UmmahPrayerData {
  datetime: Array<{
    times: {
      Fajr: string;
      Sunrise: string;
      Dhuhr: string;
      Asr: string;
      Sunset: string;
      Maghrib: string;
      Isha: string;
      Imsak: string;
      Midnight: string;
    };
    date: {
      gregorian: string;
      hijri: string;
    };
  }>;
  location: {
    city: string;
    country: string;
  };
}

interface PrayerTimesProps {
  isRtl: boolean;
}

const hijriMonths = [
  { ar: 'محرم', en: 'Muharram' },
  { ar: 'صفر', en: 'Safar' },
  { ar: 'ربيع الأول', en: 'Rabi\' al-Awwal' },
  { ar: 'ربيع الآخر', en: 'Rabi\' al-Thani' },
  { ar: 'جمادى الأولى', en: 'Jumada al-Ula' },
  { ar: 'جمادى الآخرة', en: 'Jumada al-Akhirah' },
  { ar: 'رجب', en: 'Rajab' },
  { ar: 'شعبان', en: 'Sha\'ban' },
  { ar: 'رمضان', en: 'Ramadan' },
  { ar: 'شوال', en: 'Shawwal' },
  { ar: 'ذو القعدة', en: 'Dhu al-Qi\'dah' },
  { ar: 'ذو الحجة', en: 'Dhu al-Hijjah' }
];

const gregorianMonthsAr = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

export default function PrayerTimes({ isRtl }: PrayerTimesProps) {
  const { showToast } = useToast();
  const compassListenerRef = useRef(false);
  const [data, setData] = useState<PrayerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [isUsingLocation, setIsUsingLocation] = useState(false);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);
  const [madhhab, setMadhhab] = useState<'hanafi' | 'shafi'>('shafi'); // Default to Shafi/Maliki/Hanbali
  const [activeTab, setActiveTab] = useState<'prayer' | 'names' | 'calendar' | 'qibla'>('prayer');

  // Asma Al-Husna State
  const [names, setNames] = useState<any[]>([]);
  const [loadingNames, setLoadingNames] = useState(false);
  const [nameSearch, setNameSearch] = useState('');

  // Hijri Calendar State
  const [gregorianDate, setGregorianDate] = useState('');
  const [hijriResult, setHijriResult] = useState<any>(null);
  const [loadingHijri, setLoadingHijri] = useState(false);

  // Qibla State
  const [qiblaDirection, setQiblaDirection] = useState<number | null>(null);
  const [nextPrayer, setNextPrayer] = useState<{ name: string; time: string; remaining: string } | null>(null);

  useEffect(() => {
    if (!data) return;
    const timer = setInterval(() => {
      const now = new Date();
      const timings = data.timings;
      const prayerOrder = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
      
      let next = null;
      for (const p of prayerOrder) {
        const [h, m] = timings[p as keyof typeof timings].split(':').map(Number);
        const pDate = new Date();
        pDate.setHours(h, m, 0);
        
        if (pDate > now) {
          const diff = pDate.getTime() - now.getTime();
          const hours = Math.floor(diff / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          
          next = {
            name: p,
            time: timings[p as keyof typeof timings],
            remaining: isRtl 
              ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`.replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)])
              : `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
          };
          break;
        }
      }
      
      if (!next) {
        // If all prayers passed, next is Fajr tomorrow
        const [h, m] = timings.Fajr.split(':').map(Number);
        const pDate = new Date();
        pDate.setDate(pDate.getDate() + 1);
        pDate.setHours(h, m, 0);
        const diff = pDate.getTime() - now.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        next = {
          name: 'Fajr',
          time: timings.Fajr,
          remaining: isRtl 
            ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`.replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)])
            : `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
        };
      }
      setNextPrayer(next);
    }, 1000);
    return () => clearInterval(timer);
  }, [data]);

  const prayerIcons: Record<string, any> = {
    Fajr: Sunrise,
    Dhuhr: Sun,
    Asr: Sun,
    Maghrib: Sunset,
    Isha: Moon,
    Sunrise: Sun,
    Imsak: Clock,
    Midnight: Moon
  };
  const [loadingQibla, setLoadingQibla] = useState(false);
  const [deviceHeading, setDeviceHeading] = useState<number>(0);
  const [compassActive, setCompassActive] = useState(false);

  const normalizedHeading = ((deviceHeading % 360) + 360) % 360;
  let headingDiff = qiblaDirection !== null ? Math.abs(normalizedHeading - qiblaDirection) : 180;
  if (headingDiff > 180) headingDiff = 360 - headingDiff;
  const isFacingQibla = qiblaDirection !== null && headingDiff < 5;

  const fetchPrayerTimesByCoords = async (lat: number, lng: number, currentMadhhab: string = madhhab) => {
    setLoading(true);
    setError('');
    setCoords({ lat, lng });
    try {
      // Use Ummah API for prayer times
      const schoolParam = currentMadhhab === 'hanafi' ? 1 : 0; // 1 for Hanafi, 0 for Shafi/Maliki/Hanbali
      const result = await fetchWithCache(`https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lng}&method=8&school=${schoolParam}`, `prayer_times_coords_${lat.toFixed(2)}_${lng.toFixed(2)}_${schoolParam}`);
      setData(result.data);
      setIsUsingLocation(true);
    } catch (err: any) {
      setError(err.message || (isRtl ? 'فشل في جلب مواقيت الصلاة' : 'Failed to fetch prayer times'));
      showToast(isRtl ? 'حدث خطأ أثناء جلب مواقيت الصلاة.' : 'An error occurred while fetching prayer times.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPrayerTimes = async (c: string, co: string, currentMadhhab: string = madhhab) => {
    if (!c || !co) return;
    setLoading(true);
    setError('');
    try {
      const schoolParam = currentMadhhab === 'hanafi' ? 1 : 0;
      const result = await fetchWithCache(`https://api.aladhan.com/v1/timingsByCity?city=${c}&country=${co}&method=8&school=${schoolParam}`, `prayer_times_${c}_${co}_${schoolParam}`);
      setData(result.data);
      setIsUsingLocation(false);
    } catch (err: any) {
      setError(err.message || (isRtl ? 'فشل في جلب مواقيت الصلاة' : 'Failed to fetch prayer times'));
      showToast(isRtl ? 'حدث خطأ أثناء جلب مواقيت الصلاة.' : 'An error occurred while fetching prayer times.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (city && country) {
      fetchPrayerTimes(city, country);
    } else {
      showToast(isRtl ? 'يرجى إدخال المدينة والدولة.' : 'Please enter city and country.', 'warning');
    }
  };

  const handleMadhhabChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMadhhab = e.target.value as 'hanafi' | 'shafi';
    setMadhhab(newMadhhab);
    if (isUsingLocation && coords) {
      fetchPrayerTimesByCoords(coords.lat, coords.lng, newMadhhab);
    } else if (city && country) {
      fetchPrayerTimes(city, country, newMadhhab);
    }
  };

  const requestLocation = (currentMadhhab: string = madhhab) => {
    if (!navigator.geolocation) {
      showToast(isRtl ? 'متصفحك لا يدعم تحديد الموقع.' : 'Geolocation is not supported by your browser.', 'error');
      // Fallback to default city
      setCity('cairo');
      setCountry('egypt');
      fetchPrayerTimes('cairo', 'egypt', currentMadhhab);
      return;
    }

    setLoading(true);
    let timeoutId = setTimeout(() => {
      setLoading(false);
      showToast(isRtl ? 'انتهى وقت تحديد الموقع.' : 'Location request timed out.', 'error');
      setCity('cairo');
      setCountry('egypt');
      fetchPrayerTimes('cairo', 'egypt', currentMadhhab);
    }, 10000);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeoutId);
        fetchPrayerTimesByCoords(position.coords.latitude, position.coords.longitude, currentMadhhab);
        if (activeTab === 'qibla') {
          fetchQibla(position.coords.latitude, position.coords.longitude);
        }
        showToast(isRtl ? 'تم تحديد الموقع بنجاح.' : 'Location detected successfully.', 'success');
      },
      (err) => {
        clearTimeout(timeoutId);
        console.error('Geolocation error:', err);
        showToast(isRtl ? 'تم رفض إذن الموقع، يرجى إدخال المدينة يدوياً.' : 'Location permission denied, please enter city manually.', 'warning');
        setCity('cairo');
        setCountry('egypt');
        fetchPrayerTimes('cairo', 'egypt', currentMadhhab);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  const handleOrientation = useCallback((event: any) => {
    let heading = null;
    if (event.webkitCompassHeading !== undefined) {
      heading = event.webkitCompassHeading;
    } else if (event.alpha !== null) {
      heading = 360 - event.alpha;
    }

    if (heading !== null) {
      setDeviceHeading((prev) => {
        let diff = heading - (prev % 360);
        if (diff > 180) diff -= 360;
        if (diff < -180) diff += 360;
        return prev + diff;
      });
    }
  }, []);

  const startCompass = async () => {
    if (compassListenerRef.current) return;
    compassListenerRef.current = true;
    if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
      try {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        if (permission === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation as any, true);
          setCompassActive(true);
        } else {
          showToast(isRtl ? 'تم رفض إذن البوصلة' : 'Compass permission denied', 'error');
        }
      } catch (error) {
        console.error(error);
        showToast(isRtl ? 'خطأ في تفعيل البوصلة' : 'Error activating compass', 'error');
      }
    } else {
      if ('ondeviceorientationabsolute' in window) {
        (window as any).addEventListener('deviceorientationabsolute', handleOrientation as any, true);
      } else {
        (window as any).addEventListener('deviceorientation', handleOrientation as any, true);
      }
      setCompassActive(true);
    }
  };

  useEffect(() => {
    requestLocation();
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation as any, true);
      window.removeEventListener('deviceorientationabsolute', handleOrientation as any, true);
    };
  }, []);

  useEffect(() => {
    if (activeTab === 'names' && names.length === 0) {
      fetchNames();
    }
    if (activeTab === 'calendar' && !hijriResult) {
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      setGregorianDate(`${y}-${m}-${d}`);
      const formatted = `${d}-${m}-${y}`;
      fetchWithCache(`https://api.aladhan.com/v1/gToH?date=${formatted}`, `gToH_${formatted}`).then(res => setHijriResult(res.data));
    }
    if (activeTab === 'qibla' && coords && qiblaDirection === null) {
      fetchQibla(coords.lat, coords.lng);
    }
  }, [activeTab]);

  const fetchNames = async () => {
    setLoadingNames(true);
    try {
      const res = await fetchWithCache('https://api.aladhan.com/v1/asmaAlHusna', 'asma_al_husna');
      setNames(res.data);
    } catch (err) {
      console.error(err);
      showToast(isRtl ? 'فشل في جلب أسماء الله الحسنى' : 'Failed to fetch Asma Al-Husna', 'error');
    } finally {
      setLoadingNames(false);
    }
  };

  const convertDate = async () => {
    if (!gregorianDate) return;
    setLoadingHijri(true);
    try {
      const [year, month, day] = gregorianDate.split('-');
      const formatted = `${day}-${month}-${year}`;
      const res = await fetchWithCache(`https://api.aladhan.com/v1/gToH?date=${formatted}`, `gToH_${formatted}`);
      setHijriResult(res.data);
    } catch (err) {
      console.error(err);
      showToast(isRtl ? 'فشل في تحويل التاريخ' : 'Failed to convert date', 'error');
    } finally {
      setLoadingHijri(false);
    }
  };

  const navigateMonth = (delta: number) => {
    if (!gregorianDate) return;
    const date = new Date(gregorianDate);
    date.setMonth(date.getMonth() + delta);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const newDateStr = `${y}-${m}-${d}`;
    setGregorianDate(newDateStr);
    
    const formatted = `${d}-${m}-${y}`;
    setLoadingHijri(true);
    fetchWithCache(`https://api.aladhan.com/v1/gToH?date=${formatted}`, `gToH_${formatted}`)
      .then(res => setHijriResult(res.data))
      .finally(() => setLoadingHijri(false));
  };

  const fetchQibla = async (lat: number, lng: number) => {
    setLoadingQibla(true);
    try {
      const res = await fetchWithCache(`https://api.aladhan.com/v1/qibla/${lat}/${lng}`, `qibla_${lat.toFixed(2)}_${lng.toFixed(2)}`);
      setQiblaDirection(res.data.direction);
    } catch (err) {
      console.error(err);
      showToast(isRtl ? 'فشل في جلب اتجاه القبلة' : 'Failed to fetch Qibla direction', 'error');
    } finally {
      setLoadingQibla(false);
    }
  };

  const prayerNamesAr: Record<string, string> = {
    Fajr: 'الفجر',
    Sunrise: 'الشروق',
    Dhuhr: 'الظهر',
    Asr: 'العصر',
    Maghrib: 'المغرب',
    Isha: 'العشاء',
    Imsak: 'الإمساك',
    Midnight: 'منتصف الليل',
  };

  const prayerNamesEn: Record<string, string> = {
    Fajr: 'Fajr',
    Sunrise: 'Sunrise',
    Dhuhr: 'Dhuhr',
    Asr: 'Asr',
    Maghrib: 'Maghrib',
    Isha: 'Isha',
    Imsak: 'Imsak',
    Midnight: 'Midnight',
  };

  const prayerNames = isRtl ? prayerNamesAr : prayerNamesEn;

  const formatTime12Hour = (time24: string) => {
    if (!time24) return '';
    const [time] = time24.split(' ');
    const [hoursStr, minutes] = time.split(':');
    let hours = parseInt(hoursStr, 10);
    const ampm = hours >= 12 ? (isRtl ? 'م' : 'PM') : (isRtl ? 'ص' : 'AM');
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const formatted = `${hours}:${minutes} ${ampm}`;
    return isRtl ? formatted.replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]) : formatted;
  };

  const t = (val: string | number) => {
    const str = String(val);
    return isRtl ? str.replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[parseInt(d)]) : str;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Tabs Navigation */}
      <div className="flex items-center justify-around bg-light-accent/50 dark:bg-white/5 backdrop-blur-sm rounded-2xl p-1 border border-primary/15 dark:border-primary/20">
        {[
          { id: 'prayer', icon: Clock, label: isRtl ? 'مواقيت' : 'Timings' },
          { id: 'names', icon: Sun, label: isRtl ? 'أسماء' : 'Names' },
          { id: 'calendar', icon: CalendarDays, label: isRtl ? 'تقويم' : 'Calendar' },
          { id: 'qibla', icon: Compass, label: isRtl ? 'قبلة' : 'Qibla' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all relative ${
              activeTab === tab.id
                ? 'text-primary dark:text-accent'
                : 'text-primary/40 dark:text-accent/40 hover:text-primary/60'
            }`}
          >
            <tab.icon className="h-6 w-6" />
            <span className="text-xs font-bold">{tab.label}</span>
            {activeTab === tab.id && (
              <motion.div 
                layoutId="active-tab-line"
                className="absolute -bottom-1 w-8 h-1 bg-primary dark:bg-accent rounded-full"
              />
            )}
          </button>
        ))}
      </div>

      {activeTab === 'prayer' && (
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => requestLocation()}
              className="p-4 bg-primary/10 dark:bg-white/10 text-primary dark:text-accent rounded-2xl hover:bg-primary/20 transition-all active:scale-95"
            >
              <Navigation className="h-6 w-6 rotate-45" />
            </button>
            <div className="flex-1 relative">
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchPrayerTimes(city, country)}
                className="w-full bg-light-accent dark:bg-white/5 border-none rounded-2xl py-4 px-12 text-sm font-bold placeholder:text-primary/30 text-primary dark:text-accent focus:ring-2 focus:ring-primary/20 transition-all"
                placeholder={isRtl ? 'البحث عن مدينة...' : 'Search for a city...'}
              />
              <Search className={`absolute top-1/2 -translate-y-1/2 ${isRtl ? 'left-4' : 'right-4'} h-5 w-5 text-primary/30`} />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            </div>
          ) : data ? (
            <div className="space-y-6">
              {/* Date Display */}
              <div className="bg-white dark:bg-dark-card rounded-3xl p-6 shadow-sm border border-primary/15 dark:border-primary/20 flex items-center justify-between">
                <div className="flex-1 text-center border-l border-primary/20 dark:border-primary/30">
                  <div className="text-xl font-black text-primary dark:text-accent">{data.date.readable}</div>
                  <div className="text-xs font-bold text-primary/40 dark:text-accent/40 uppercase">Sunday, Gregorian</div>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-xl font-black text-primary dark:text-accent">
                    {t(data.date.hijri.day)} {isRtl ? data.date.hijri.month.ar : data.date.hijri.month.en} {t(data.date.hijri.year)}
                  </div>
                  <div className="text-xs font-bold text-primary/40 dark:text-accent/40">{isRtl ? data.date.hijri.weekday.ar : data.date.hijri.weekday.en}، السنة الهجرية</div>
                </div>
              </div>

              {/* Next Prayer Card */}
              {nextPrayer && (
                <div className="relative bg-primary rounded-[2.5rem] p-8 text-white overflow-hidden shadow-2xl shadow-primary/20">
                  <div className="absolute -bottom-10 -left-10 text-[12rem] font-black opacity-5 select-none pointer-events-none">صلاة</div>
                  <div className="relative z-10">
                    <div className="inline-block bg-white/20 backdrop-blur-md px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                      {isRtl ? 'الصلاة القادمة' : 'Next Prayer'}
                    </div>
                    <div className="flex items-end justify-between">
                      <div>
                        <h3 className="text-4xl font-black mb-2">{prayerNames[nextPrayer.name]}</h3>
                        <div className="flex items-baseline gap-2">
                          <span className="text-6xl font-black">{formatTime12Hour(nextPrayer.time).split(' ')[0]}</span>
                          <span className="text-xl font-bold opacity-60">{formatTime12Hour(nextPrayer.time).split(' ')[1]}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-white/80 font-bold mb-1 justify-end">
                          <Clock className="h-4 w-4" />
                          <span>{isRtl ? 'متبقي' : 'Remaining'} {nextPrayer.remaining}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Main Prayers Grid */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 px-2">
                  <div className="w-1.5 h-6 bg-primary rounded-full" />
                  <h3 className="text-lg font-black text-primary dark:text-accent">{isRtl ? 'الفروض الأساسية' : 'Main Prayers'}</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {['Fajr', 'Dhuhr', 'Asr', 'Maghrib'].map((p) => {
                    const Icon = prayerIcons[p];
                    return (
                      <div key={p} className="bg-white dark:bg-primary rounded-[2rem] p-6 text-primary dark:text-white shadow-lg shadow-primary/5 dark:shadow-primary/10 border border-primary/15 dark:border-primary/20 dark:border-none">
                        <div className="flex items-center justify-between mb-4">
                          <Icon className="h-6 w-6 opacity-60 dark:opacity-80" />
                          <span className="text-xl font-black">{prayerNames[p]}</span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black">{formatTime12Hour(data.timings[p as keyof typeof data.timings]).split(' ')[0]}</span>
                          <span className="text-sm font-bold opacity-40 dark:opacity-60">{formatTime12Hour(data.timings[p as keyof typeof data.timings]).split(' ')[1]}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {/* Isha Large Card */}
                <div className="bg-white dark:bg-primary rounded-[2.5rem] p-6 text-primary dark:text-white shadow-lg shadow-primary/5 dark:shadow-primary/10 border border-primary/15 dark:border-primary/20 dark:border-none flex items-center justify-between">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-4xl font-black">{formatTime12Hour(data.timings.Isha).split(' ')[0]}</span>
                      <span className="text-lg font-bold opacity-40 dark:opacity-60">{formatTime12Hour(data.timings.Isha).split(' ')[1]}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-3 justify-end mb-1">
                      <span className="text-2xl font-black">{prayerNames.Isha}</span>
                      <Moon className="h-6 w-6 fill-primary dark:fill-white" />
                    </div>
                    <div className="text-[10px] font-bold opacity-40 dark:opacity-60">{isRtl ? 'صلاة الجماعة متوفرة' : 'Congregational prayer available'}</div>
                  </div>
                </div>
              </div>

              {/* Additional Times */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-6 bg-primary/30 rounded-full" />
                  <h3 className="text-lg font-black text-primary/60 dark:text-accent/60">{isRtl ? 'مواعيد إضافية' : 'Additional Times'}</h3>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'Sunrise', label: isRtl ? 'الشروق' : 'Sunrise', icon: Sun },
                    { id: 'Imsak', label: isRtl ? 'الإمساك' : 'Imsak', icon: Clock },
                    { id: 'Midnight', label: isRtl ? 'منتصف الليل' : 'Midnight', icon: Moon },
                  ].map((t) => (
                    <div key={t.id} className="bg-light-accent dark:bg-white/5 rounded-2xl p-4 text-center border border-primary/15 dark:border-primary/20">
                      <div className="text-[10px] font-bold text-primary/40 dark:text-accent/40 mb-1">{t.label}</div>
                      <div className="text-lg font-black text-primary dark:text-accent mb-2">
                        {formatTime12Hour(data.timings[t.id as keyof typeof data.timings]).split(' ')[0]}
                      </div>
                      <div className="flex justify-center">
                        <t.icon className="h-4 w-4 text-primary/40" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Verse Card */}
              <div className="bg-white dark:bg-dark-card rounded-[2.5rem] p-8 shadow-sm border border-primary/15 dark:border-primary/20 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <p className="text-2xl font-quran text-primary dark:text-accent leading-relaxed mb-6">
                  "إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا"
                </p>
                <div className="text-xs font-bold text-primary/30 dark:text-accent/30">
                  {isRtl ? 'سورة النساء - آية ١٠٣' : 'Surah An-Nisa - Ayah 103'}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {activeTab === 'names' && (
          <div className="space-y-10">
            {/* Search Bar */}
            <div className="relative group px-2">
              <input
                type="text"
                placeholder={isRtl ? 'البحث في أسماء الله الحسنى...' : 'Search in Asma Al-Husna...'}
                value={nameSearch}
                onChange={(e) => setNameSearch(e.target.value)}
                className="w-full bg-primary/5 dark:bg-white/5 border border-primary/20 dark:border-primary/30 rounded-full py-5 px-8 pr-14 text-primary dark:text-accent placeholder-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-right"
                dir="rtl"
              />
              <Search className={`absolute ${isRtl ? 'right-8' : 'left-8'} top-1/2 -translate-y-1/2 h-6 w-6 text-primary/30`} />
            </div>

            {/* Header */}
            <div className="text-center space-y-4 px-4">
              <h2 className="text-5xl sm:text-6xl font-black text-primary dark:text-accent font-quran drop-shadow-sm">
                {isRtl ? 'أسماء الله الحسنى' : 'Asma Al-Husna'}
              </h2>
              <p className="text-primary/50 dark:text-accent/50 text-base font-medium leading-relaxed max-w-sm mx-auto">
                {isRtl 
                  ? 'لله تسعة وتسعون اسماً، مائة إلا واحداً، من أحصاها دخل الجنة' 
                  : 'Allah has ninety-nine names, one hundred minus one; whoever counts them will enter Paradise.'}
              </p>
            </div>

            {loadingNames ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-14 w-14 text-primary animate-spin" />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-5 px-2">
                {names.filter(n => 
                  n.name.includes(nameSearch) || 
                  n.transliteration.toLowerCase().includes(nameSearch.toLowerCase()) ||
                  n.en.meaning.toLowerCase().includes(nameSearch.toLowerCase())
                ).map((name, index) => (
                  <div key={index} className="relative p-6 sm:p-8 rounded-[2.5rem] bg-light-card dark:bg-dark-card border border-primary/20 dark:border-primary/30 flex flex-col items-center text-center group hover:border-primary/30 transition-all duration-300 shadow-xl shadow-primary/5">
                    {/* Number Badge */}
                    <div className={`absolute top-4 ${isRtl ? 'left-4' : 'right-4'} w-8 h-8 rounded-full bg-primary/5 dark:bg-white/5 flex items-center justify-center text-[10px] font-black text-primary/40 dark:text-accent/40 border border-primary/20 dark:border-primary/30`}>
                      {t(name.number)}
                    </div>
                    
                    {/* Arabic Name */}
                    <div className="text-4xl sm:text-5xl font-black text-primary dark:text-accent mb-2 mt-4 font-quran leading-tight">
                      {name.name}
                    </div>
                    
                    {/* Transliteration */}
                    <div className="text-sm font-bold text-primary/60 dark:text-accent/60 mb-2 tracking-wide">
                      {name.transliteration}
                    </div>
                    
                    {/* Meaning */}
                    <div className="text-xs font-bold text-primary/40 dark:text-accent/40 leading-relaxed max-w-[160px] border-t border-primary/15 dark:border-primary/20 pt-3 mt-1">
                      {name.en.meaning}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom Banner */}
            <div className="relative bg-primary rounded-[3rem] p-10 text-white overflow-hidden shadow-2xl shadow-primary/30 mt-16 mx-2">
              <div className="absolute -bottom-10 -left-10 text-[15rem] font-black opacity-10 select-none pointer-events-none rotate-12">
                <BookOpen className="w-48 h-48" />
              </div>
              <div className="relative z-10 text-right">
                <h3 className="text-3xl font-black mb-5">إحصاء الأسماء</h3>
                <p className="text-base font-medium leading-relaxed opacity-80">
                  من معاني الإحصاء: حفظها، وفهم معانيها، والعمل بمقتضاها، ودعاء الله بها.
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="space-y-10">
            {/* Header */}
            <div className="text-center space-y-4">
              <h2 className="text-5xl font-black text-primary dark:text-accent font-quran">
                {isRtl ? 'التقويم الهجري' : 'Hijri Calendar'}
              </h2>
              <p className="text-primary/60 dark:text-accent/60 text-sm leading-relaxed max-w-xs mx-auto">
                {isRtl 
                  ? 'حوّل التواريخ واكتشف المناسبات الإسلامية القادمة بدقة عالية.' 
                  : 'Convert dates and discover upcoming Islamic occasions with high accuracy.'}
              </p>
            </div>

            {/* Date Selection */}
            <div className="space-y-4">
              <div className="relative">
                <input
                  type="date"
                  value={gregorianDate}
                  onChange={(e) => {
                    setGregorianDate(e.target.value);
                    const [year, month, day] = e.target.value.split('-');
                    const formatted = `${day}-${month}-${year}`;
                    setLoadingHijri(true);
                    fetchWithCache(`https://api.aladhan.com/v1/gToH?date=${formatted}`, `gToH_${formatted}`)
                      .then(res => setHijriResult(res.data))
                      .finally(() => setLoadingHijri(false));
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                />
                <button className="w-full bg-primary text-white py-5 rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 shadow-xl shadow-primary/20 active:scale-95 transition-all">
                  {isRtl ? 'اختر التاريخ' : 'Choose Date'}
                  <span className="text-2xl">📅</span>
                </button>
              </div>
              
              {gregorianDate && (
                <div className="flex justify-center">
                  <div className="bg-primary/5 dark:bg-white/5 px-6 py-2 rounded-full flex items-center gap-2 text-primary/40 dark:text-accent/40 text-sm font-bold border border-primary/20 dark:border-primary/30">
                    <span>📅</span>
                    {isRtl ? 'التاريخ المختار:' : 'Selected Date:'} {t(gregorianDate.split('-').reverse().join(' '))}
                  </div>
                </div>
              )}
            </div>

            {loadingHijri ? (
              <div className="flex justify-center items-center py-20">
                <Loader2 className="h-14 w-14 text-primary animate-spin" />
              </div>
            ) : hijriResult && (
              <div className="space-y-8">
                {/* Main Card */}
                <div className="relative p-10 rounded-[3rem] bg-light-card dark:bg-dark-card border border-primary/20 dark:border-primary/30 flex flex-col items-center text-center shadow-2xl overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 dark:bg-accent/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                  
                  {/* Day Pill */}
                  <div className="relative z-10 bg-primary/5 dark:bg-white/5 px-6 py-2 rounded-full text-primary dark:text-accent font-black text-sm mb-8 border border-primary/20 dark:border-primary/30">
                    {isRtl ? hijriResult.hijri.weekday.ar : hijriResult.hijri.weekday.en}
                  </div>
                  
                  {/* Hijri Date */}
                  <div className="relative z-10 text-7xl font-black text-primary dark:text-accent mb-4 font-quran leading-tight">
                    {t(hijriResult.hijri.day)} {isRtl ? hijriResult.hijri.month.ar : hijriResult.hijri.month.en}
                  </div>
                  
                  {/* Hijri Year */}
                  <div className="relative z-10 text-6xl font-black text-primary dark:text-accent mb-8 font-quran">
                    {t(hijriResult.hijri.year)}
                  </div>
                  
                  {/* Gregorian Date */}
                  <div className="relative z-10 text-2xl font-bold text-primary/80 dark:text-accent/80 mb-10">
                    {t(hijriResult.gregorian.day)} {isRtl ? gregorianMonthsAr[hijriResult.gregorian.month.number - 1] : hijriResult.gregorian.month.en} {t(hijriResult.gregorian.year)} م
                  </div>
                  
                  {/* Separator */}
                  <div className="w-full h-px bg-primary/10 dark:bg-white/5 mb-8" />
                  
                  {/* Occasions */}
                  <div className="relative z-10 space-y-4 w-full">
                    <div className="text-xs font-black text-primary/30 dark:text-accent/30 uppercase tracking-widest mb-4">
                      {isRtl ? 'المناسبات المرتبطة' : 'Related Occasions'}
                    </div>
                    <div className="flex flex-wrap justify-center gap-3">
                      <div className="bg-primary/5 dark:bg-white/5 px-5 py-2.5 rounded-2xl flex items-center gap-2 text-primary dark:text-accent font-bold text-sm border border-primary/20 dark:border-primary/30">
                        <span className="text-xs">✪</span>
                        {isRtl ? `شهر ${hijriResult.hijri.month.ar}` : `Month of ${hijriResult.hijri.month.en}`}
                      </div>
                      {hijriResult.hijri.holidays.map((h: string, i: number) => (
                        <div key={i} className="bg-primary/5 dark:bg-white/5 px-5 py-2.5 rounded-2xl flex items-center gap-2 text-primary/80 dark:text-accent/80 font-bold text-sm border border-primary/20 dark:border-primary/30">
                          <span>📅</span>
                          {h}
                        </div>
                      ))}
                      {hijriResult.hijri.holidays.length === 0 && (
                        <div className="bg-primary/5 dark:bg-white/5 px-5 py-2.5 rounded-2xl flex items-center gap-2 text-primary/40 dark:text-accent/40 font-bold text-sm border border-primary/20 dark:border-primary/30 italic">
                          <span>📅</span>
                          {isRtl ? 'الأيام البيض (قادم)' : 'White Days (Upcoming)'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Navigation Cards */}
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => navigateMonth(-1)}
                    className="bg-light-card dark:bg-dark-card p-8 rounded-[2.5rem] border border-primary/20 dark:border-primary/30 flex flex-col items-center text-center shadow-xl active:scale-95 transition-all hover:border-primary/30"
                  >
                    <div className="w-14 h-14 rounded-full bg-primary/5 dark:bg-white/5 flex items-center justify-center mb-5 border border-primary/20 dark:border-primary/30">
                      <ChevronRight className={`h-7 w-7 text-primary dark:text-accent ${isRtl ? '' : 'rotate-180'}`} />
                    </div>
                    <div className="text-primary dark:text-accent font-black text-xl mb-2">{isRtl ? 'الشهر السابق' : 'Previous Month'}</div>
                    <div className="text-primary/40 dark:text-accent/40 text-sm font-bold">
                      {isRtl ? hijriMonths[(hijriResult.hijri.month.number - 2 + 12) % 12].ar : hijriMonths[(hijriResult.hijri.month.number - 2 + 12) % 12].en} {t(hijriResult.hijri.month.number === 1 ? parseInt(hijriResult.hijri.year) - 1 : hijriResult.hijri.year)}
                    </div>
                  </button>
                  <button 
                    onClick={() => navigateMonth(1)}
                    className="bg-light-card dark:bg-dark-card p-8 rounded-[2.5rem] border border-primary/20 dark:border-primary/30 flex flex-col items-center text-center shadow-xl active:scale-95 transition-all hover:border-primary/30"
                  >
                    <div className="w-14 h-14 rounded-full bg-primary/5 dark:bg-white/5 flex items-center justify-center mb-5 border border-primary/20 dark:border-primary/30">
                      <ChevronLeft className={`h-7 w-7 text-primary dark:text-accent ${isRtl ? '' : 'rotate-180'}`} />
                    </div>
                    <div className="text-primary dark:text-accent font-black text-xl mb-2">{isRtl ? 'الشهر القادم' : 'Next Month'}</div>
                    <div className="text-primary/40 dark:text-accent/40 text-sm font-bold">
                      {isRtl ? hijriMonths[hijriResult.hijri.month.number % 12].ar : hijriMonths[hijriResult.hijri.month.number % 12].en} {t(hijriResult.hijri.month.number === 12 ? parseInt(hijriResult.hijri.year) + 1 : hijriResult.hijri.year)}
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'qibla' && (
          <div className="space-y-8 text-center">
            <h2 className="text-2xl font-bold text-primary dark:text-accent flex items-center justify-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Compass className="h-6 w-6 text-primary dark:text-accent" />
              </div>
              {isRtl ? 'اتجاه القبلة' : 'Qibla Direction'}
            </h2>
            
            {!coords ? (
              <div className="text-center py-16">
                <p className="text-primary/60 dark:text-accent/60 mb-6 font-bold">
                  {isRtl ? 'يرجى السماح بالوصول إلى الموقع لتحديد اتجاه القبلة.' : 'Please allow location access to determine Qibla direction.'}
                </p>
                <button
                  onClick={() => requestLocation()}
                  className="bg-primary text-white px-8 py-3 rounded-2xl hover:shadow-lg hover:shadow-primary/20 transition-all font-bold inline-flex items-center gap-2 active:scale-95"
                >
                  <Navigation className="h-5 w-5" />
                  {isRtl ? 'تحديد الموقع' : 'Detect Location'}
                </button>
              </div>
            ) : loadingQibla ? (
              <div className="flex justify-center items-center py-16">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
              </div>
            ) : qiblaDirection !== null ? (
              <div className="flex flex-col items-center justify-center py-8">
                {!compassActive && (
                  <button 
                    onClick={startCompass}
                    className="mb-10 bg-primary text-white px-8 py-3.5 rounded-2xl hover:shadow-lg hover:shadow-primary/20 transition-all font-bold flex items-center gap-2 active:scale-95"
                  >
                    <Compass className="h-5 w-5" />
                    {isRtl ? 'تفعيل البوصلة' : 'Activate Compass'}
                  </button>
                )}
                
                <div className="relative w-72 h-72 mb-10 mx-auto">
                  {/* Fixed Device Pointer (always points up) */}
                  <div className={`absolute top-[-24px] left-1/2 -translate-x-1/2 w-0 h-0 border-l-[18px] border-r-[18px] border-b-[24px] border-l-transparent border-r-transparent z-40 drop-shadow-xl transition-colors duration-500 ${isFacingQibla ? 'border-b-accent' : 'border-b-red-500'}`}></div>
                  
                  {/* Compass Dial */}
                  <div 
                    className={`absolute inset-0 rounded-full border-[12px] bg-light-surface dark:bg-dark-surface shadow-2xl transition-all duration-150 ease-out ${isFacingQibla ? 'border-accent shadow-[0_0_40px_rgba(104,219,169,0.4)]' : 'border-primary/20 dark:border-primary/30'}`}
                    style={{ transform: `rotate(${-deviceHeading}deg)` }}
                  >
                    {/* Tick marks */}
                    {[...Array(24)].map((_, i) => (
                      <div key={i} className="absolute inset-0 flex justify-center" style={{ transform: `rotate(${i * 15}deg)` }}>
                        <div className={`w-1 ${i % 6 === 0 ? 'h-5 bg-primary/40' : 'h-2.5 bg-primary/10'} rounded-full mt-1.5`}></div>
                      </div>
                    ))}
                    
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 text-xl font-black text-red-500">N</div>
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-xl font-black text-primary/20">S</div>
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-xl font-black text-primary/20">E</div>
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-xl font-black text-primary/20">W</div>
                    
                    {/* Qibla Pointer */}
                    <div 
                      className="absolute inset-0 flex items-center justify-center transition-transform duration-1000 ease-out"
                      style={{ transform: `rotate(${qiblaDirection}deg)` }}
                    >
                      <div className="h-full w-1 flex flex-col items-center py-12">
                        <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-2xl -mt-6 z-20 border-4 border-white dark:border-dark-surface rotate-45">
                          <div className="-rotate-45">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="w-6 h-6 text-white">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2L12 10M12 2L15 5M12 2L9 5" />
                            </svg>
                          </div>
                        </div>
                        <div className="w-2 flex-1 bg-gradient-to-b from-primary to-transparent rounded-full"></div>
                      </div>
                    </div>
                  </div>
                  {/* Center dot */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-primary rounded-full border-4 border-white dark:border-dark-surface z-30 shadow-xl"></div>
                </div>
                
                <div className={`text-center px-8 py-6 rounded-[2rem] border transition-all duration-500 ${isFacingQibla ? 'bg-accent/10 border-accent shadow-lg shadow-accent/10' : 'bg-primary/5 border-primary/20 dark:border-primary/30'}`}>
                  <div className={`text-5xl font-black mb-2 transition-colors duration-500 ${isFacingQibla ? 'text-primary dark:text-accent' : 'text-primary dark:text-accent'}`} dir="ltr">
                    {qiblaDirection.toFixed(1)}°
                  </div>
                  <div className={`text-sm font-black uppercase tracking-widest transition-colors duration-500 ${isFacingQibla ? 'text-primary/60 dark:text-accent/60' : 'text-primary/40 dark:text-accent/40'}`}>
                    {isFacingQibla 
                      ? (isRtl ? 'أنت تواجه القبلة الآن!' : 'You are facing the Qibla!') 
                      : (isRtl ? 'درجة من الشمال الجغرافي' : 'Degrees from true North')}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}

    </div>
  );
}
