import React, { useEffect, useRef } from 'react';
import { X, Check } from 'lucide-react';

interface VoiceWaveformProps {
  isListening: boolean;
  audioStream: MediaStream | null;
  onCancel: () => void;
  onConfirm: () => void;
}

export function VoiceWaveform({ isListening, audioStream, onCancel, onConfirm }: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (!isListening || !audioStream || !canvasRef.current) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(audioStream);
    const analyser = audioContext.createAnalyser();
    analyserRef.current = analyser;

    analyser.fftSize = 256;
    source.connect(analyser);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isListening) return;

      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgb(34 197 94)';
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      source.disconnect();
      audioContext.close();
    };
  }, [isListening, audioStream]);

  if (!isListening) return null;

  return (
    <div className="absolute inset-0 flex items-center bg-gray-800/95 rounded-xl transition-all duration-200 ease-in-out">
      <div className="flex-1 h-8 px-4">
        <canvas
          ref={canvasRef}
          width={600}
          height={32}
          className="w-full h-full"
        />
      </div>
      <div className="flex items-center gap-2 pr-3">
        <button
          onClick={onCancel}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-200 hover:bg-gray-700/50 transition-colors"
          title="Cancel"
        >
          <X size={18} />
        </button>
        <button
          onClick={onConfirm}
          className="p-2 rounded-lg text-green-500 hover:text-green-400 hover:bg-gray-700/50 transition-colors"
          title="Confirm"
        >
          <Check size={18} />
        </button>
      </div>
    </div>
  );
}