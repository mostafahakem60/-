import React, { useEffect, useRef, useState } from 'react';
import { useSettings } from '../context/SettingsContext';

interface AudioVisualizerProps {
  audioElement: HTMLAudioElement | null;
  isRtl?: boolean;
}

export default function AudioVisualizer({ audioElement, isRtl = true }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const { visualizerStyle } = useSettings();

  useEffect(() => {
    if (!audioElement) return;

    let audioCtx: AudioContext;
    let analyser: AnalyserNode;
    let source: MediaElementAudioSourceNode;

    try {
      if (!(audioElement as any).__audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        source = audioCtx.createMediaElementSource(audioElement);
        analyser = audioCtx.createAnalyser();
        
        source.connect(analyser);
        analyser.connect(audioCtx.destination);
        
        (audioElement as any).__audioCtx = audioCtx;
        (audioElement as any).__analyser = analyser;
      } else {
        audioCtx = (audioElement as any).__audioCtx;
        analyser = (audioElement as any).__analyser;
      }
      
      analyser.fftSize = 512;
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      analyserRef.current = analyser;
      dataArrayRef.current = dataArray;

      if (audioCtx.state === 'suspended') {
        const resumeCtx = () => {
          audioCtx.resume();
          audioElement.removeEventListener('play', resumeCtx);
        };
        audioElement.addEventListener('play', resumeCtx);
      }
    } catch (err) {
      console.error("Error setting up audio visualizer:", err);
    }

    const draw = () => {
      if (!canvasRef.current || !analyserRef.current || !dataArrayRef.current) {
        animationRef.current = requestAnimationFrame(draw);
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      
      analyserRef.current.getByteFrequencyData(dataArrayRef.current);
      
      // Clear canvas with deep dark background
      ctx.fillStyle = '#020617'; // very dark slate
      ctx.fillRect(0, 0, width, height);
      
      const dataArray = dataArrayRef.current;

      if (visualizerStyle === 'bars' || visualizerStyle === 'circle') {
        const barWidth = (width / dataArray.length) * 2.5;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
          const value = dataArray[i];
          const barHeight = (value / 255) * height * 0.8; // Max 80% height
          
          ctx.fillStyle = value > 200 ? '#6ee7b7' : '#10b981'; // emerald neon
          ctx.shadowBlur = value > 100 ? 15 : 5;
          ctx.shadowColor = '#10b981';
          
          // Draw symmetric vertical rounded bars
          const bH = Math.max(4, barHeight);
          const y = (height - bH) / 2;
          
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth - 1, bH, 4);
          ctx.fill();
          
          x += barWidth;
        }
      } else if (visualizerStyle === 'wave') {
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        
        let x = 0;
        const sliceWidth = width / dataArray.length;
        
        for (let i = 0; i < dataArray.length; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height / 2) * 0.8 + (height * 0.1); 

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }
        
        ctx.lineTo(width, height / 2);
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#34d399'; // emerald-400
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#10b981'; // emerald-500 glow
        ctx.stroke();
      }

      ctx.shadowBlur = 0;

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [audioElement, visualizerStyle]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = 120;
      }
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="w-full flex flex-col gap-2" ref={containerRef}>
      <div className="w-full rounded-[2rem] overflow-hidden bg-black border border-primary/20 dark:border-primary/30 shadow-inner">
        <canvas ref={canvasRef} className="w-full block" style={{ height: '120px' }} />
      </div>
    </div>
  );
}

