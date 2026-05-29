import React, { useEffect, useRef } from 'react';

interface LocalRecordingWaveformProps {
  stream: MediaStream | null;
}

export function LocalRecordingWaveform({ stream }: LocalRecordingWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!stream) return;

    // Standard audio context
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    let audioCtx: AudioContext;
    try {
      audioCtx = new AudioContextClass();
    } catch (e: any) {
      console.error("Failed to create AudioContext:", e?.message || String(e));
      return;
    }

    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64; // high reactivity, smooth animation
    analyser.smoothingTimeConstant = 0.7; // slight smoothing for polished visual
    
    let source: MediaStreamAudioSourceNode;
    try {
      source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
    } catch (e: any) {
      console.error("Failed to connect audio stream source:", e?.message || String(e));
      audioCtx.close();
      return;
    }

    audioContextRef.current = audioCtx;
    analyserRef.current = analyser;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!analyserRef.current || !canvasRef.current || !ctx) return;

      animationRef.current = requestAnimationFrame(draw);

      const width = canvas.width;
      const height = canvas.height;

      // Clear the canvas
      ctx.clearRect(0, 0, width, height);

      analyserRef.current.getByteFrequencyData(dataArray);

      // Symmetrical layout
      const barCount = 20;
      const gap = 3;
      const totalGapsWidth = gap * (barCount - 1);
      const barWidth = (width - totalGapsWidth) / barCount;

      ctx.lineWidth = barWidth;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)'; // clear white for gradient-red container

      for (let i = 0; i < barCount; i++) {
        // Map symmetric index
        const centerOffset = Math.abs(i - (barCount - 1) / 2);
        const ratio = 1 - (centerOffset / ((barCount - 1) / 2));
        
        // Find corresponding index in frequency buffer
        const freqIndex = Math.min(
          Math.floor(ratio * (bufferLength - 1) * 0.8), // prioritize mid-low frequencies which captures speech nicely
          bufferLength - 1
        );
        const rawValue = dataArray[freqIndex] || 0;

        // Scale with a minimum and maximum limit
        const minHeight = 3;
        const maxHeight = height - 6;
        const barHeight = minHeight + (rawValue / 255) * maxHeight;

        const x = i * (barWidth + gap) + barWidth / 2;
        const yCenter = height / 2;

        ctx.beginPath();
        ctx.moveTo(x, yCenter - barHeight / 2);
        ctx.lineTo(x, yCenter + barHeight / 2);
        ctx.stroke();
      }
    };

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, [stream]);

  return (
    <div className="flex items-center justify-center bg-white/10 px-3 py-1.5 rounded-2xl border border-white/10 shrink-0">
      <canvas 
        ref={canvasRef} 
        className="w-24 h-6 block" 
        width={110} 
        height={30} 
      />
    </div>
  );
}
