"use client";

import { useState } from 'react';
import { UploadCloud, CheckCircle2, Play, Activity } from 'lucide-react';
import { ExecutionLog } from '@/components/execution-log';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [excitement, setExcitement] = useState<number>(5);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true);
    setLogs(['Starting Pipeline...', 'Uploading video to server...']);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('excitement', excitement.toString());

    try {
      setLogs(l => [...l, 'Sending video to preprocessing...']);
      const res = await fetch('/api/process', {
        method: 'POST',
        body: formData,
      });

      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.trim().startsWith('data: ')) {
            const data = line.replace('data: ', '').trim();
            if (data) {
              if (data.startsWith('|TTS_READY|')) {
                const scriptText = data.replace('|TTS_READY|', '');
                setLogs(l => [...l, `Playing audio: "${scriptText}"`]);
                
                // Trigger Browser TTS
                if ('speechSynthesis' in window) {
                  const utterance = new SpeechSynthesisUtterance(scriptText);
                  utterance.rate = excitement > 7 ? 1.2 : excitement < 4 ? 0.9 : 1.0;
                  utterance.pitch = excitement > 7 ? 1.3 : 1.0;
                  window.speechSynthesis.speak(utterance);
                }
              } else {
                setLogs(l => [...l, data]);
              }
            }
          }
        }
      }
      
      setLogs(l => [...l, 'Pipeline complete. Ready for playback.']);
      setIsProcessing(false);
      
    } catch (e: any) {
      setLogs(l => [...l, 'Error processing video.']);
      setIsProcessing(false);
    }
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-neutral-800">
      <div className="max-w-4xl mx-auto p-8 flex flex-col gap-12">
        
        {/* Header */}
        <header className="flex items-center justify-between border-b border-neutral-800 pb-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Activity className="text-neutral-950 w-5 h-5" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Esports Hype Caster</h1>
          </div>
          <span className="text-sm text-neutral-500">Powered by NVIDIA VILA & Nemotron</span>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Controls Panel */}
          <section className="flex flex-col gap-8">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
              <h2 className="text-lg font-medium mb-4">1. Select Clip</h2>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-neutral-700 hover:border-emerald-500/50 bg-neutral-950 rounded-xl h-32 cursor-pointer transition-colors group">
                <UploadCloud className="w-8 h-8 text-neutral-500 group-hover:text-emerald-500 transition-colors mb-2" />
                <span className="text-sm font-medium text-neutral-400 group-hover:text-neutral-300">
                  {file ? file.name : "Click to upload gameplay video"}
                </span>
                <input 
                  type="file" 
                  accept="video/mp4,video/webm" 
                  className="hidden" 
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setFile(f);
                      setVideoUrl(URL.createObjectURL(f));
                    }
                  }} 
                />
              </label>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
              <div className="flex justify-between items-end mb-4">
                <h2 className="text-lg font-medium">2. Excitement Level</h2>
                <span className="text-2xl font-bold text-emerald-400">{excitement}</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="10" 
                value={excitement}
                onChange={(e) => setExcitement(Number(e.target.value))}
                className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
              <div className="flex justify-between mt-2 text-xs text-neutral-500 font-medium tracking-wide uppercase">
                <span>Chill</span>
                <span>Maximum Hype</span>
              </div>
            </div>

            <button 
              onClick={handleProcess}
              disabled={!file || isProcessing}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-lg py-4 rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.2)] disabled:opacity-50 disabled:shadow-none transition-all"
            >
              {isProcessing ? 'Processing...' : 'Generate Narration'}
            </button>
          </section>

          {/* Trace & Playback Panel */}
          <section className="flex flex-col gap-6">
            <div className="aspect-video bg-black rounded-2xl border border-neutral-800 overflow-hidden relative group">
              {videoUrl ? (
                <video src={videoUrl} className="w-full h-full object-contain" controls />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-600">
                  <Play className="w-12 h-12 mb-3 opacity-20" />
                  <span className="text-sm font-medium">Video Output</span>
                </div>
              )}
            </div>

            <ExecutionLog logs={logs} />
          </section>
        </div>
      </div>
    </main>
  );
}
