import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, X, Volume2, VolumeX, SkipBack, SkipForward, Cast, MonitorSmartphone } from 'lucide-react';
import { useAudio } from './AudioContext';
import AudioVisualizer from './AudioVisualizer';
import { QuranText } from './QuranText';

interface AudioPlaybackScreenProps {
  audioUrl: string;
  title: string;
  image?: string;
  onClose: () => void;
  isRtl: boolean;
  audioElement?: HTMLAudioElement | null;
  verseTimings?: any[];
  ayahs?: any[];
  isHighQuality?: boolean;
  isExactTimings?: boolean;
  timingsDuration?: number;
}

export default function AudioPlaybackScreen({ 
  audioUrl, 
  title, 
  image, 
  onClose, 
  isRtl, 
  audioElement,
  verseTimings,
  ayahs,
  isHighQuality,
  isExactTimings,
  timingsDuration
}: AudioPlaybackScreenProps) {
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isReady, setIsReady] = useState(false);
  const [showCastModal, setShowCastModal] = useState(false);
  const { stopQuran, stopRadio } = useAudio();

  useEffect(() => {
    let audio = audioElement;
    let createdLocal = false;
    
    if (!audio) {
      audio = new Audio(audioUrl);
      audio.crossOrigin = "anonymous";
      createdLocal = true;
    }
    
    activeAudioRef.current = audio;

    setIsReady(audio.readyState >= 2);
    setDuration(audio.duration || 0);
    setIsPlaying(!audio.paused);
    setCurrentTime(audio.currentTime);
    setVolume(audio.volume);
    setIsMuted(audio.muted);

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleDurationChange = () => setDuration(audio.duration || 0);
    const handleCanPlay = () => setIsReady(true);
    const handleVolumeSync = () => {
      setVolume(audio.volume);
      setIsMuted(audio.muted);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('volumechange', handleVolumeSync);

    if (createdLocal) {
      audio.play().catch(e => console.error(e));
    }

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('volumechange', handleVolumeSync);
      if (createdLocal) {
        audio.pause();
        audio.src = '';
      }
    };
  }, [audioUrl, audioElement]);

  const togglePlayPause = () => {
    const audio = activeAudioRef.current;
    if (audio) {
      if (audio.paused) {
        audio.play().catch((err: any) => {
          const msg = err ? (typeof err === 'string' ? err : (err.message || err.toString() || '')) : '';
          if (msg.includes('interrupted by a call to pause')) return;
          console.error(err);
        });
      } else {
        audio.pause();
      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (activeAudioRef.current) {
      activeAudioRef.current.volume = newVolume;
    }
    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    if (activeAudioRef.current) {
      activeAudioRef.current.muted = newMutedState;
    }
  };

  const skipForward = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.currentTime += 10;
    }
  };

  const skipBackward = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.currentTime -= 10;
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (activeAudioRef.current) {
      activeAudioRef.current.currentTime = time;
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCastClick = () => {
    setShowCastModal(true);
  };

  const startCasting = async () => {
    setShowCastModal(false);
    const audio = activeAudioRef.current;
    if (!audio) {
      alert(isRtl ? 'لا يوجد مقطع صوتي للبث.' : 'No audio to cast.');
      return;
    }

    try {
      if ('remote' in audio && (audio as any).remote) {
        await (audio as any).remote.prompt();
      } else if ('webkitShowPlaybackTargetPicker' in audio) {
        (audio as any).webkitShowPlaybackTargetPicker();
      } else {
        alert(isRtl ? 'ميزة البث غير مدعومة في هذا المتصفح أو الجهاز.' : 'Casting is not supported in this browser or device.');
      }
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        alert(isRtl ? 'لم يتم العثور على أجهزة بث قريبة. تأكد من تشغيل الجهاز المستقبل واتصاله بنفس الشبكة.' : 'No cast devices found nearby. Make sure the receiving device is on and connected to the same network.');
      } else if (error.name !== 'NotAllowedError' && error.name !== 'AbortError') {
        console.error('Cast error:', error);
        alert(isRtl ? 'حدث خطأ أثناء محاولة البث.' : 'An error occurred while trying to cast.');
      }
    }
  };

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);

  // Calculate active ayah
  let activeAyahText = '';
  if (isHighQuality && verseTimings && verseTimings.length > 0 && ayahs && ayahs.length > 0) {
    let searchTimeMs = currentTime * 1000;
    if (!isExactTimings && timingsDuration && duration > 0) {
      const audioDurationMs = duration * 1000;
      const scale = timingsDuration / audioDurationMs;
      searchTimeMs = searchTimeMs * scale;
    }

    const activeTiming = verseTimings.find(t => searchTimeMs >= t.timestamp_from && searchTimeMs <= t.timestamp_to);
    const activeAyahNumber = activeTiming ? parseInt(activeTiming.verse_key.split(':')[1], 10) : null;
    const activeAyah = ayahs.find(a => parseInt(a.aya, 10) === activeAyahNumber);
    if (activeAyah) {
      activeAyahText = activeAyah.arabic_text;
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-light-bg dark:bg-dark-bg flex flex-col items-center overflow-y-auto transition-colors custom-scrollbar">
      <button 
        onClick={onClose}
        className="fixed top-4 right-4 p-3 bg-primary/10 hover:bg-primary/20 backdrop-blur-md rounded-full text-primary dark:text-accent transition-all z-[110] active:scale-95 shadow-lg border border-primary/20 dark:border-primary/30"
      >
        <X className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      <div className="w-full max-w-2xl flex flex-col items-center gap-4 sm:gap-8 min-h-full justify-center p-4 sm:p-6 sm:py-10 relative">

        {/* Content Image */}
        <div className="relative group shrink-0">
          <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full translate-y-4 opacity-50 group-hover:opacity-70 transition-opacity" />
          <div className="w-32 h-32 sm:w-48 sm:h-48 rounded-[2.5rem] sm:rounded-[3rem] overflow-hidden shadow-2xl relative z-10 border-4 border-white/50 dark:border-white/5">
            <img 
              src={image || `https://picsum.photos/seed/${encodeURIComponent(title)}/400/400?blur=1`} 
              alt={title}
              className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        {/* Title */}
        <div className="text-center space-y-2 shrink-0 px-4 w-full">
          <h2 className="text-xl sm:text-2xl font-black text-primary dark:text-accent tracking-tight leading-tight line-clamp-2" style={{ fontFamily: isRtl ? "'Cairo', sans-serif" : "inherit" }}>
            {title}
          </h2>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full">
            <div className="w-1.5 h-1.5 bg-primary dark:bg-accent rounded-full animate-pulse" />
            <span className="text-primary dark:text-accent text-[10px] sm:text-xs font-black uppercase tracking-widest">
              {isRtl ? 'يتم التشغيل الآن' : 'Now Playing'}
            </span>
          </div>
        </div>

        {/* Active Ayah Text (Only for high quality) - Decorative Religious Box */}
        {isHighQuality && activeAyahText && (
          <div className="w-full px-4 shrink-0 flex justify-center min-h-[160px] sm:min-h-[200px]">
            <div className="relative w-full max-w-xl p-6 sm:p-8 bg-primary/5 dark:bg-white/5 rounded-3xl border border-primary/30 dark:border-primary/40 flex flex-col items-center h-full">
              {/* Decorative Corners */}
              <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-primary/30 rounded-tr-2xl" />
              <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-primary/30 rounded-tl-2xl" />
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-primary/30 rounded-br-2xl" />
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-primary/30 rounded-bl-2xl" />
              
              <div className="w-full flex-1 overflow-y-auto custom-scrollbar flex items-center justify-center px-2 z-10 py-2 sm:py-4">
                <div 
                  className="text-xl sm:text-2xl md:text-3xl text-center text-primary dark:text-accent font-quran leading-[2.5] md:leading-[2.5] drop-shadow-sm select-none font-bold pb-2 w-full break-words whitespace-normal" 
                >
                  <QuranText text={activeAyahText} highlightWaqf={false} highlightHarakat={false} isRtl={isRtl} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Audio Visualizer */}
        {activeAudioRef.current && (
          <div className="w-full shrink-0 px-2 max-w-lg">
            <AudioVisualizer audioElement={activeAudioRef.current} isRtl={isRtl} />
          </div>
        )}

        {/* Unified Player Controls */}
        <div className="w-full bg-light-card/90 dark:bg-dark-card/90 backdrop-blur-2xl p-5 sm:p-10 rounded-[2.5rem] sm:rounded-[3rem] border border-primary/20 dark:border-primary/30 shadow-2xl flex flex-col gap-4 sm:gap-8 shrink-0 mt-auto sm:mt-0">
          {/* Progress Bar */}
          <div className="w-full flex flex-col gap-4">
            <div className="relative h-2 w-full bg-primary/10 dark:bg-white/5 rounded-full overflow-hidden group">
              <input 
                type="range" 
                min="0" 
                max={duration || 100} 
                step="0.1" 
                value={currentTime} 
                onChange={handleSeek}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div 
                className="absolute top-0 left-0 h-full bg-primary dark:bg-accent transition-all duration-100"
                style={{ width: `${(currentTime / (duration || 100)) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] sm:text-xs font-black tracking-widest text-primary/40 dark:text-accent/40 uppercase">
              <span>{formatTime(currentTime)}</span>
              <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-8">
            
            {/* Volume Control */}
            <div className={`flex items-center gap-4 w-full sm:w-1/4 ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>
              <button onClick={toggleMute} className="text-primary/40 dark:text-accent/40 hover:text-primary dark:hover:text-accent transition-colors shrink-0">
                {isMuted || volume === 0 ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
              </button>
              <div className="relative h-1.5 flex-1 bg-primary/10 dark:bg-white/5 rounded-full overflow-hidden">
                <input 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01" 
                  value={isMuted ? 0 : volume} 
                  onChange={handleVolumeChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div 
                  className="absolute top-0 left-0 h-full bg-primary/40 dark:bg-accent/40"
                  style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                />
              </div>
            </div>

            {/* Playback Controls */}
            <div className="flex items-center justify-center gap-6 sm:gap-8 w-full sm:w-2/4">
              <button 
                onClick={skipBackward}
                className="text-primary/30 dark:text-accent/30 hover:text-primary dark:hover:text-accent transition-all hover:scale-110 active:scale-90"
                title={isRtl ? 'تأخير 10 ثواني' : 'Rewind 10s'}
              >
                <SkipBack className="w-7 h-7 sm:w-8 sm:h-8" />
              </button>
              
              <button 
                onClick={togglePlayPause}
                disabled={!isReady}
                className="w-16 h-16 sm:w-24 sm:h-24 flex items-center justify-center bg-primary text-white rounded-[1.5rem] sm:rounded-[2.5rem] shadow-2xl shadow-primary/40 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shrink-0"
              >
                {isPlaying ? <Pause className="w-7 h-7 sm:w-10 sm:h-10" /> : <Play className={`w-7 h-7 sm:w-10 sm:h-10 ${isRtl ? 'mr-1' : 'ml-1'}`} />}
              </button>
              
              <button 
                onClick={skipForward}
                className="text-primary/30 dark:text-accent/30 hover:text-primary dark:hover:text-accent transition-all hover:scale-110 active:scale-90"
                title={isRtl ? 'تقديم 10 ثواني' : 'Forward 10s'}
              >
                <SkipForward className="w-7 h-7 sm:w-8 sm:h-8" />
              </button>
            </div>

            {/* Cast Control */}
            <div className="flex items-center justify-end w-full sm:w-1/4">
              <button 
                onClick={handleCastClick}
                className="text-primary/40 dark:text-accent/40 hover:text-primary dark:hover:text-accent transition-all p-4 rounded-3xl hover:bg-primary/5 active:scale-90"
                title={isRtl ? 'بث إلى شاشة' : 'Cast to screen'}
              >
                <Cast className="w-6 h-6" />
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* Cast Modal */}
      {showCastModal && (
        <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-light-card dark:bg-dark-card rounded-[3rem] p-8 sm:p-10 max-w-md w-full shadow-2xl border border-primary/20 dark:border-primary/30 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-8">
              <div className="bg-primary/10 p-5 rounded-[2rem] text-primary dark:text-accent">
                <MonitorSmartphone className="w-10 h-10" />
              </div>
              <button 
                onClick={() => setShowCastModal(false)}
                className="p-3 text-primary/40 hover:text-primary hover:bg-primary/5 rounded-2xl transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <h3 className={`text-3xl font-black text-primary dark:text-accent mb-6 ${isRtl ? 'text-right' : 'text-left'}`}>
              {isRtl ? 'بث المحتوى' : 'Cast Media'}
            </h3>
            
            <p className={`text-primary/60 dark:text-accent/60 mb-10 text-lg leading-relaxed ${isRtl ? 'text-right' : 'text-left'}`}>
              {isRtl 
                ? 'تأكد من أن جهازك يدعم خاصية البث وأن الجهاز المستقبل قيد التشغيل ومتصل بنفس شبكة Wi-Fi.' 
                : 'Make sure your device supports casting and the receiving device is on and connected to the same Wi-Fi network.'}
            </p>
            
            <div className={`flex gap-4 ${isRtl ? 'flex-row-reverse' : 'flex-row'}`}>
              <button 
                onClick={() => setShowCastModal(false)}
                className="flex-1 py-4 px-6 rounded-2xl font-black text-primary/60 dark:text-accent/60 bg-primary/5 hover:bg-primary/10 transition-all active:scale-95"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button 
                onClick={startCasting}
                className="flex-1 py-4 px-6 rounded-2xl font-black text-white bg-primary hover:shadow-xl hover:shadow-primary/30 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
              >
                <Cast className="w-6 h-6" />
                {isRtl ? 'بدء البث' : 'Start'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
