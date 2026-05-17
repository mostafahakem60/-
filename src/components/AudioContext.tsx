import React, { createContext, useContext, useRef, useState, useEffect } from 'react';

export interface RadioStation {
  id: string | number;
  name: string;
  url: string;
  img: string;
  category?: string;
}

interface AudioContextType {
  quranAudioRef: React.RefObject<HTMLAudioElement>;
  radioAudioRef: React.RefObject<HTMLAudioElement>;
  isPlayingQuran: boolean;
  setIsPlayingQuran: (playing: boolean) => void;
  isPlayingRadio: boolean;
  setIsPlayingRadio: (playing: boolean) => void;
  isBufferingRadio: boolean;
  setIsBufferingRadio: (buffering: boolean) => void;
  activeRadioStation: RadioStation | null;
  setActiveRadioStation: (station: RadioStation | null) => void;
  stopQuran: () => void;
  stopRadio: () => void;
  isRadioUserPaused: React.MutableRefObject<boolean>;
  handleRadioPlay: (station: RadioStation) => Promise<void>;
  isRadioMuted: boolean;
  setIsRadioMuted: (muted: boolean) => void;
  radioError: string | null;
  setRadioError: (error: string | null) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

const isSafeAudioUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    // Allow both http and https, though http might be blocked by browser mixed content policy
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch { return false; }
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const quranAudioRef = useRef<HTMLAudioElement | null>(null);
  const radioAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingQuran, setIsPlayingQuran] = useState(false);
  const [isPlayingRadio, setIsPlayingRadio] = useState(false);
  const [isBufferingRadio, setIsBufferingRadio] = useState(false);
  const [activeRadioStation, setActiveRadioStation] = useState<RadioStation | null>(null);
  const [isRadioMuted, setIsRadioMuted] = useState(false);
  const [radioError, setRadioError] = useState<string | null>(null);
  const isRadioUserPaused = useRef(false);
  
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const stallTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const isReconnectingRef = useRef(false);
  const activeStationRef = useRef<RadioStation | null>(null);
  const MAX_RETRIES = 5;

  useEffect(() => {
    activeStationRef.current = activeRadioStation;
  }, [activeRadioStation]);

  const attemptReconnect = async () => {
    const currentStation = activeStationRef.current;
    if (!radioAudioRef.current || !currentStation || isReconnectingRef.current) return;

    if (stallTimeoutRef.current) clearTimeout(stallTimeoutRef.current);

    if (retryCountRef.current < MAX_RETRIES) {
      isReconnectingRef.current = true;
      retryCountRef.current += 1;
      console.log(`[Radio] Attempting to reconnect... (Attempt ${retryCountRef.current}/${MAX_RETRIES})`);
      setIsBufferingRadio(true);
      
      const currentUrl = currentStation.url;
      const currentStationId = currentStation.id;
      radioAudioRef.current.removeAttribute('src');
      
      setTimeout(async () => {
        if (!radioAudioRef.current || activeStationRef.current?.id !== currentStationId) {
          isReconnectingRef.current = false;
          return;
        }
        if (currentUrl) {
          if (!isSafeAudioUrl(currentUrl)) {
            console.error('[Radio] Unsafe URL blocked:', currentUrl);
            isReconnectingRef.current = false;
            setIsBufferingRadio(false);
            return;
          }
          
          radioAudioRef.current.src = currentUrl;
          radioAudioRef.current.load();
          try {
            await radioAudioRef.current.play();
            setIsPlayingRadio(true);
            setIsBufferingRadio(false);
            isReconnectingRef.current = false;
            retryCountRef.current = 0; // Reset on success
          } catch (err: any) {
            if (err.name !== 'AbortError' && !err.message?.includes('interrupted by a call to pause')) {
              isReconnectingRef.current = false;
              if (err.name === 'NotSupportedError' || err.message?.includes('supported source') || err.message?.includes('Format not supported')) {
                console.error('[Radio] Stream is offline or format not supported:', currentUrl);
                setRadioError(currentStationId.toString());
                setIsPlayingRadio(false);
                setIsBufferingRadio(false);
                retryCountRef.current = MAX_RETRIES;
              } else {
                console.error('[Radio] Reconnect failed:', err.message || err, currentUrl);
                if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
                retryTimeoutRef.current = setTimeout(attemptReconnect, 3000);
              }
            }
          }
        } else {
          console.error('[Radio] Invalid radio URL');
          isReconnectingRef.current = false;
          setIsBufferingRadio(false);
        }
      }, 500);
    } else {
      console.error('[Radio] Max retries reached. Stream might be offline.');
      setIsPlayingRadio(false);
      setIsBufferingRadio(false);
      retryCountRef.current = 0;
      isReconnectingRef.current = false;
    }
  };

  const handleRadioPlay = async (station: RadioStation) => {
    stopQuran();
    if (!radioAudioRef.current) return;

    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
    if (stallTimeoutRef.current) clearTimeout(stallTimeoutRef.current);

    if (activeRadioStation?.id === station.id) {
      if (isPlayingRadio) {
        isRadioUserPaused.current = true;
        radioAudioRef.current.pause();
        setIsPlayingRadio(false);
      } else {
        isRadioUserPaused.current = false;
        try {
          setIsBufferingRadio(true);
          await radioAudioRef.current.play();
          setIsPlayingRadio(true);
        } catch (err) {
          console.error('[Radio] Playback failed:', err);
          attemptReconnect();
        } finally {
          setIsBufferingRadio(false);
        }
      }
    } else {
      isRadioUserPaused.current = false;
      setActiveRadioStation(station);
      setRadioError(null);
      setIsBufferingRadio(true);
      retryCountRef.current = 0;
      isReconnectingRef.current = false;
      
      if (station.url) {
        if (!isSafeAudioUrl(station.url)) {
          console.error('[Radio] Unsafe URL blocked:', station.url);
          setIsBufferingRadio(false);
          return;
        }
        try {
          radioAudioRef.current.src = station.url;
          radioAudioRef.current.load();
          await radioAudioRef.current.play();
          setIsPlayingRadio(true);
        } catch (err: any) {
          if (err.name !== 'AbortError' && !err.message?.includes('interrupted by a call to pause')) {
            console.error('[Radio] Initial playback failed:', err.message || err, station.url);
            attemptReconnect();
          }
        } finally {
          setIsBufferingRadio(false);
        }
      }
    }
  };

  const stopQuran = () => {
    if (quranAudioRef.current) {
      quranAudioRef.current.pause();
      quranAudioRef.current.removeAttribute('src');
      setIsPlayingQuran(false);
    }
  };

  const stopRadio = () => {
    if (radioAudioRef.current) {
      isRadioUserPaused.current = true;
      radioAudioRef.current.pause();
      radioAudioRef.current.removeAttribute('src');
      setIsPlayingRadio(false);
      setIsBufferingRadio(false);
      setActiveRadioStation(null);
    }
  };

  return (
    <AudioContext.Provider value={{ 
      quranAudioRef, 
      radioAudioRef, 
      isPlayingQuran, 
      setIsPlayingQuran, 
      isPlayingRadio, 
      setIsPlayingRadio, 
      isBufferingRadio,
      setIsBufferingRadio,
      activeRadioStation,
      setActiveRadioStation,
      stopQuran, 
      stopRadio, 
      isRadioUserPaused,
      handleRadioPlay,
      isRadioMuted,
      setIsRadioMuted,
      radioError,
      setRadioError
    }}>
      {children}
      <audio
        ref={quranAudioRef}
        crossOrigin="anonymous"
        onEnded={() => setIsPlayingQuran(false)}
        onPause={() => setIsPlayingQuran(false)}
        onPlay={() => setIsPlayingQuran(true)}
        preload="metadata"
        onError={(e) => {
          const audio = e.currentTarget;
          let errorMessage = "Unknown audio error";
          if (audio.error) {
            switch (audio.error.code) {
              case 1: errorMessage = "Aborted by user"; break;
              case 2: errorMessage = "Network error"; break;
              case 3: errorMessage = "Decoding error"; break;
              case 4: errorMessage = "Source not supported or unreachable"; break;
            }
          }
          console.error(`Quran Audio Error: ${errorMessage}`, {
            src: audio.src,
            code: audio.error?.code,
            message: audio.error?.message
          });
          setIsPlayingQuran(false);
        }}
      />
      <audio
        ref={radioAudioRef}
        crossOrigin="anonymous"
        preload="none"
        onEnded={() => {
          if (!isRadioUserPaused.current) {
            attemptReconnect();
          } else {
            setIsPlayingRadio(false);
          }
        }}
        onPause={() => {
          if (isRadioUserPaused.current) {
            setIsPlayingRadio(false);
          }
        }}
        onPlay={() => setIsPlayingRadio(true)}
        onWaiting={() => {
          setIsBufferingRadio(true);
          if (stallTimeoutRef.current) clearTimeout(stallTimeoutRef.current);
          stallTimeoutRef.current = setTimeout(() => {
            if (isPlayingRadio && !isRadioUserPaused.current) {
              attemptReconnect();
            }
          }, 10000);
        }}
        onPlaying={() => {
          setIsBufferingRadio(false);
          setIsPlayingRadio(true);
          retryCountRef.current = 0;
          if (stallTimeoutRef.current) clearTimeout(stallTimeoutRef.current);
        }}
        onStalled={() => {
          if (isPlayingRadio && !isRadioUserPaused.current) {
            if (stallTimeoutRef.current) clearTimeout(stallTimeoutRef.current);
            stallTimeoutRef.current = setTimeout(() => {
              attemptReconnect();
            }, 10000);
          }
        }}
        onError={(e) => {
          if (!isRadioUserPaused.current) {
            attemptReconnect();
          } else {
            setIsPlayingRadio(false);
            setIsBufferingRadio(false);
          }
        }}
      />
    </AudioContext.Provider>
  );
};

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) throw new Error('useAudio must be used within an AudioProvider');
  return context;
};
