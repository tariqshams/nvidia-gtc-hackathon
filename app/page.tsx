"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { UploadCloud, CheckCircle2, Play, Activity, Mic, Square, Volume2 } from 'lucide-react';
import { ExecutionLog } from '@/components/execution-log';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [excitement, setExcitement] = useState<number>(5);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [script, setScript] = useState<string | null>(null);
  const [isPlayingHype, setIsPlayingHype] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const ttsActiveRef = useRef(false); // guards against stale onend/onerror callbacks

  // ── Voice Warm-up ─────────────────────────────────────────────────────
  // Chrome loads voices asynchronously. We listen for the `voiceschanged`
  // event and cache the result in a ref so it's available synchronously
  // when the user clicks "Play Hype Cast".
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
      console.log('[TTS] Voices loaded:', voicesRef.current.length);
    };

    loadVoices(); // immediate attempt (works on Firefox / Safari)
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  // ── Centralized cleanup helper ────────────────────────────────────────
  const stopHypeCast = useCallback(() => {
    console.log('[TTS] stopHypeCast called');
    ttsActiveRef.current = false;
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    // @ts-ignore
    if (window._ttsAudio) {
      // @ts-ignore
      window._ttsAudio.pause();
      // @ts-ignore
      window._ttsAudio.currentTime = 0;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.muted = false;
      videoRef.current.volume = 1.0;
    }
    setIsPlayingHype(false);
  }, []);

  const handleProcess = async () => {
    if (!file) return;
    setIsProcessing(true);
    setScript(null);
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
                setScript(scriptText);
                setLogs(l => [...l, `Generated Narration Script ready.`]);
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

  const toggleHypeCast = async () => {
    if (!videoRef.current || !script) return;

    // ── STOP ──────────────────────────────────────────────────────────
    if (isPlayingHype) {
      stopHypeCast();
      return;
    }

    // ── PLAY ──────────────────────────────────────────────────────────
    console.log('[TTS] === PLAY HYPE CAST ===');

    // 1. Duck video & play
    videoRef.current.currentTime = 0;
    videoRef.current.volume = 0.15;
    videoRef.current.muted = false; // ensure it's not muted from previous attempts
    videoRef.current.play();

    setIsPlayingHype(true);
    ttsActiveRef.current = true;

    // 2. TTS Server-side
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: script,
          rate: excitement > 7 ? 1.3 : excitement < 4 ? 0.8 : 1.0,
        }),
      });

      if (!res.ok) {
        console.error('[TTS] API error:', res.status);
        if (ttsActiveRef.current) stopHypeCast();
        return;
      }

      if (!ttsActiveRef.current) return; // check if cancelled while fetching

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      
      // @ts-ignore – anchor to window to prevent GC
      window._ttsAudio = audio;
      audio.volume = 1.0;
      
      audio.onended = () => {
        if (!ttsActiveRef.current) return;
        ttsActiveRef.current = false;
        setIsPlayingHype(false);
        if (videoRef.current) videoRef.current.volume = 1.0;
        URL.revokeObjectURL(url);
      };
      
      audio.onerror = () => {
        console.error('[TTS] Audio playback error');
        if (!ttsActiveRef.current) return;
        ttsActiveRef.current = false;
        setIsPlayingHype(false);
        if (videoRef.current) videoRef.current.volume = 1.0;
        URL.revokeObjectURL(url);
      };
      
      audio.play();
    } catch (err) {
      console.error('[TTS] Fetch error:', err);
      if (ttsActiveRef.current) stopHypeCast();
    }
  };

  return (
    <main className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-emerald-500/30">
      <div className="max-w-6xl mx-auto p-8 flex flex-col gap-12">
        
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Left Column: Input Panel */}
          <section className="flex flex-col gap-8">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
              <h2 className="text-lg font-medium mb-4 text-emerald-500">1. Setup Scene</h2>
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
                      setScript(null);
                      setLogs([]);
                    }
                  }} 
                />
              </label>

              <div className="mt-8">
                <div className="flex justify-between items-end mb-4">
                  <h3 className="text-sm font-medium text-neutral-400">Excitement Level</h3>
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
                  <span>Chill Golf</span>
                  <span>Maximum Hype</span>
                </div>
              </div>
            </div>

            {videoUrl && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
                <h2 className="text-lg font-medium mb-4">Input Preview</h2>
                <div className="aspect-video bg-black rounded-xl overflow-hidden border border-neutral-800">
                  <video src={videoUrl} controls className="w-full h-full object-contain" />
                </div>
              </div>
            )}

            <button 
              onClick={handleProcess}
              disabled={!file || isProcessing}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-semibold text-lg py-4 rounded-xl shadow-[0_0_30px_rgba(16,185,129,0.2)] disabled:opacity-50 disabled:shadow-none transition-all mt-4"
            >
              {isProcessing ? 'Agent Generating...' : 'Generate Hype Cast'}
            </button>
          </section>

          {/* Right Column: Trace & Output Panel */}
          <section className="flex flex-col gap-8">
            
            {(logs.length > 0 || isProcessing) && (
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl flex flex-col gap-4">
                <h2 className="text-lg font-medium text-emerald-500">2. Agent Pipeline Trace</h2>
                <ExecutionLog logs={logs} />
              </div>
            )}

            {script && (
              <div className="bg-neutral-900 border border-emerald-500/50 rounded-2xl p-6 shadow-[0_0_50px_rgba(16,185,129,0.1)] relative overflow-hidden flex flex-col gap-6">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                
                <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  <Mic className="text-emerald-500 w-5 h-5"/>
                  Final Output
                </h2>

                <div className="relative aspect-video bg-black rounded-xl border border-neutral-800 overflow-hidden group">
                  <video 
                    ref={videoRef} 
                    src={videoUrl!} 
                    className="w-full h-full object-contain pointer-events-none opacity-80" 
                    onEnded={stopHypeCast} 
                  />
                  
                  {/* Central Play Button Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity">
                    <button 
                      onClick={toggleHypeCast} 
                      className="bg-emerald-500 hover:bg-emerald-400 text-neutral-950 pl-6 pr-8 py-4 rounded-full font-bold shadow-2xl flex items-center gap-3 transition-transform transform hover:scale-105 active:scale-95"
                    >
                      {isPlayingHype ? (
                        <><Square className="w-5 h-5 fill-current" /> Stop Cast</>
                      ) : (
                        <><Play className="w-6 h-6 fill-current" /> Play Hype Cast</>
                      )}
                    </button>
                  </div>
                </div>

                <div className="bg-neutral-950 p-5 rounded-xl border border-neutral-800/80 flex flex-col gap-4">
                  <p className="text-emerald-400/90 leading-relaxed italic text-lg font-medium">&quot;{script}&quot;</p>
                  <button
                    onClick={async () => {
                      if (!script) return;

                      // Stop if already playing
                      if (isSpeaking) {
                        // @ts-ignore
                        if (window._ttsAudio) {
                          // @ts-ignore
                          window._ttsAudio.pause();
                          // @ts-ignore
                          window._ttsAudio.currentTime = 0;
                        }
                        setIsSpeaking(false);
                        return;
                      }

                      setIsSpeaking(true);

                      try {
                        const res = await fetch('/api/tts', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            text: script,
                            rate: excitement > 7 ? 1.3 : excitement < 4 ? 0.8 : 1.0,
                          }),
                        });

                        if (!res.ok) {
                          console.error('[TTS] API error:', res.status);
                          setIsSpeaking(false);
                          return;
                        }

                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const audio = new Audio(url);
                        // @ts-ignore – anchor to window to prevent GC
                        window._ttsAudio = audio;
                        audio.volume = 1.0;
                        audio.onended = () => {
                          setIsSpeaking(false);
                          URL.revokeObjectURL(url);
                        };
                        audio.onerror = () => {
                          console.error('[TTS] Audio playback error');
                          setIsSpeaking(false);
                          URL.revokeObjectURL(url);
                        };
                        audio.play();
                      } catch (err) {
                        console.error('[TTS] Fetch error:', err);
                        setIsSpeaking(false);
                      }
                    }}
                    className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold py-3 px-6 rounded-xl transition-all active:scale-95 w-full"
                  >
                    {isSpeaking ? (
                      <><Square className="w-4 h-4 fill-current" /> Stop Narration</>
                    ) : (
                      <><Volume2 className="w-5 h-5" /> Play Narration</>
                    )}
                  </button>
                </div>
              </div>
            )}

          </section>
        </div>
      </div>
    </main>
  );
}
