import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Disc, Gamepad2, Activity, Terminal, Database, Cpu, Lock, User, Calendar, List, Settings, Image as ImageIcon, Music, Play, Pause, RotateCcw, Check, ZoomIn, Save, UploadCloud, Plus, Type, AlignLeft, ToggleLeft, ToggleRight, Clock, LayoutTemplate, ArrowUp, ArrowDown, Minus, Eye, Edit3 } from 'lucide-react';

/* -------------------------------------------------------------------------- */
/* CUSTOM CSS & FONTS                                                         */
/* -------------------------------------------------------------------------- */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Creepster&family=Inter:wght@400;700&family=Playfair+Display:wght@700&family=JetBrains+Mono&family=Orbitron:wght@700&family=Bangers&family=Special+Elite&family=MedievalSharp&family=Permanent+Marker&display=swap');

    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
    @keyframes float-particle {
      0% { transform: translate(0, 0); opacity: 0; }
      20% { opacity: 0.8; } 80% { opacity: 0.5; }
      100% { transform: translate(var(--tx), var(--ty)); opacity: 0; }
    }
    @keyframes progress-fill { 0% { width: 0%; } 100% { width: 100%; } }
    .animate-blink { animation: blink 1s step-end infinite; }
    .animate-progress-fill { animation: progress-fill 0.5s ease-out forwards; }
    
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: #0a0a0a; }
    ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
    ::-webkit-scrollbar-thumb:hover { background: #555; }

    .range-slider::-webkit-slider-thumb {
      -webkit-appearance: none; appearance: none;
      width: 12px; height: 12px; background: #3b82f6;
      cursor: pointer; border-radius: 50%; border: 2px solid #1e3a8a;
    }
    .range-slider { -webkit-appearance: none; background: transparent; }
    
    /* Font Classes */
    .font-creepster { font-family: 'Creepster', cursive; }
    .font-serif-display { font-family: 'Playfair Display', serif; }
    .font-mono-tech { font-family: 'JetBrains Mono', monospace; }
    .font-orbitron { font-family: 'Orbitron', sans-serif; }
    .font-bangers { font-family: 'Bangers', cursive; letter-spacing: 1px; }
    .font-elite { font-family: 'Special Elite', cursive; }
    .font-medieval { font-family: 'MedievalSharp', cursive; }
    .font-marker { font-family: 'Permanent Marker', cursive; }

    /* Custom Drag Handle Cursor */
    .cursor-grab-active { cursor: grabbing !important; }
    
    /* Smooth transitions */
    .transition-smooth { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
  `}</style>
);

/* -------------------------------------------------------------------------- */
/* UTILS                                                                      */
/* -------------------------------------------------------------------------- */
const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const useMultiKeyTrigger = (targetKeys, onUnlock, delay = 2000) => {
  const [pressed, setPressed] = useState(new Set());
  const [progress, setProgress] = useState(0);
  const timerRef = useRef(null);
  const intervalRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => setPressed(prev => new Set(prev).add(e.key.toLowerCase()));
    const handleKeyUp = (e) => setPressed(prev => {
        const next = new Set(prev); next.delete(e.key.toLowerCase()); return next;
    });
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (targetKeys.every(k => pressed.has(k))) {
      if (!timerRef.current) {
        let p = 0;
        const step = 100 / (delay / 100);
        intervalRef.current = setInterval(() => { p = Math.min(p + step, 100); setProgress(p); }, 100);
        timerRef.current = setTimeout(() => {
          onUnlock(); setProgress(0); clearInterval(intervalRef.current);
          timerRef.current = null; intervalRef.current = null;
        }, delay);
      }
    } else {
      if (timerRef.current) {
        clearTimeout(timerRef.current); clearInterval(intervalRef.current);
        timerRef.current = null; intervalRef.current = null; setProgress(0);
      }
    }
  }, [pressed, onUnlock, delay, targetKeys]);

  return progress;
};

/* -------------------------------------------------------------------------- */
/* AUDIO ENGINE V8 (Strict Singleton)                                         */
/* -------------------------------------------------------------------------- */
const useAudioEngine = () => {
  const audioCtxRef = useRef(null);
  const activeNodesRef = useRef([]);
  const [isSpinning, setIsSpinning] = useState(false);
  const [audioData, setAudioData] = useState(new Uint8Array(0));
  const rafRef = useRef();
  const bufferCache = useRef({});

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();
  }, []);

  // Strict stop function - immediately disconnects to prevent overlap
  const stopSound = useCallback((immediate = true) => {
    if(rafRef.current) cancelAnimationFrame(rafRef.current);
    const ctx = audioCtxRef.current;
    if (!ctx) return;

    activeNodesRef.current.forEach(node => {
        try {
            if (node.disconnect) node.disconnect(); // Immediate silence
            if (node.stop) node.stop(); 
        } catch(e){}
    });
    
    activeNodesRef.current = [];
    setIsSpinning(false);
    setAudioData(new Uint8Array(0));
  }, []);

  const playSound = useCallback(async (trackData, config = { start: 0, end: 100, loop: true }) => {
    initAudio();
    // FORCE KILL any existing sound before starting new one
    stopSound(true);

    const ctx = audioCtxRef.current;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    const t = ctx.currentTime;
    const fadeDuration = 1.5; 

    const currentSessionNodes = [];

    try {
        if (trackData.type === 'file') {
            let buffer = bufferCache.current[trackData.id];
            if (!buffer) {
                const response = await fetch(trackData.url);
                const arrayBuffer = await response.arrayBuffer();
                buffer = await ctx.decodeAudioData(arrayBuffer);
                bufferCache.current[trackData.id] = buffer;
            }
            const source = ctx.createBufferSource();
            source.buffer = buffer;
            source.loop = config.loop;
            
            const duration = buffer.duration;
            const startTime = (config.start / 100) * duration;
            const endTime = (config.end / 100) * duration;
            if (config.loop) { source.loopStart = startTime; source.loopEnd = endTime || duration; }

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.8, t + fadeDuration); 

            source.connect(gain); gain.connect(analyser); analyser.connect(ctx.destination);
            source.start(t, startTime);
            currentSessionNodes.push(source, gain);
        } else {
            const gameId = trackData.id || 1;
            const motorOsc = ctx.createOscillator();
            const motorGain = ctx.createGain();
            const basePitch = 40 + (gameId * 8); 
            motorOsc.type = (gameId % 2 === 0) ? 'sawtooth' : 'square';
            motorOsc.frequency.setValueAtTime(0, t);
            motorOsc.frequency.linearRampToValueAtTime(basePitch, t + 2);

            const lfo = ctx.createOscillator();
            lfo.frequency.value = 0.2; 
            const lfoGain = ctx.createGain();
            lfoGain.gain.value = 20;
            lfo.connect(lfoGain); lfoGain.connect(motorOsc.frequency);

            motorGain.gain.setValueAtTime(0, t); 
            motorGain.gain.linearRampToValueAtTime(0.15, t + fadeDuration);

            motorOsc.connect(motorGain); motorGain.connect(analyser); analyser.connect(ctx.destination); 
            motorOsc.start(t); lfo.start(t);
            currentSessionNodes.push(motorOsc, lfo, motorGain);

            const bufferSize = ctx.sampleRate * 2;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) { data[i] = (Math.random() * 2 - 1) * (Math.sin(i / (100 + gameId)) > 0.9 ? 3 : 0.5); }
            
            const noiseNode = ctx.createBufferSource();
            noiseNode.buffer = buffer; noiseNode.loop = config.loop; 
            const noiseGain = ctx.createGain();
            const noiseFilter = ctx.createBiquadFilter();
            noiseFilter.type = 'bandpass'; noiseFilter.frequency.value = 1000 + (gameId * 100);
            noiseGain.gain.setValueAtTime(0, t); 
            noiseGain.gain.linearRampToValueAtTime(0.05, t + fadeDuration);
            
            noiseNode.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(analyser);
            noiseNode.start(t);
            currentSessionNodes.push(noiseNode, noiseGain);
        }

        activeNodesRef.current = currentSessionNodes;
        setIsSpinning(true);

        const updateAnalysis = () => {
            if (activeNodesRef.current.length === 0) return;
            const dataArray = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteTimeDomainData(dataArray);
            setAudioData(dataArray);
            rafRef.current = requestAnimationFrame(updateAnalysis);
        };
        updateAnalysis();

    } catch (e) {
        console.error("Playback failed:", e);
    }
  }, [initAudio, stopSound]);

  const playUiSound = useCallback((type) => {
    initAudio();
    const ctx = audioCtxRef.current;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t = ctx.currentTime;
    if (type === 'hover') { osc.frequency.setValueAtTime(800, t); osc.frequency.exponentialRampToValueAtTime(200, t + 0.05); gain.gain.value = 0.02; }
    else if (type === 'open') { osc.type = 'sine'; osc.frequency.setValueAtTime(100, t); gain.gain.value = 0.2; }
    else if (type === 'success') { osc.type = 'triangle'; osc.frequency.setValueAtTime(440, t); osc.frequency.exponentialRampToValueAtTime(880, t + 0.1); gain.gain.value = 0.1; }
    osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(t + 0.2);
  }, [initAudio]);

  return { playSound, stopSound, playUiSound, isSpinning, audioData };
};

/* -------------------------------------------------------------------------- */
/* DATA                                                                       */
/* -------------------------------------------------------------------------- */
const initialGamesData = [
  { id: 1, title: "Haunting Ground", publisher: "CAPCOM", color: "from-stone-300 via-stone-200 to-stone-400", textColor: "text-stone-900", rating: "16+", description: "A survival horror game where Fiona Belli must escape a castle with her dog, Hewie.", serial: "SLES-53133" },
  { id: 2, title: "Manhunt", publisher: "Rockstar", color: "from-green-900 via-black to-green-950", textColor: "text-green-500", rating: "18", description: "Psychological horror stealth. The sound of this disc is gritty and distorted like a VHS tape.", serial: "SLES-52055" },
  { id: 3, title: "Silent Hill 2", publisher: "KONAMI", color: "from-black via-stone-900 to-black", textColor: "text-white", rating: "18", description: "The definitive psychological horror. Audio profile features low, depressing drone frequencies.", serial: "SLES-50382" },
  { id: 4, title: "Silent Hill 3", publisher: "KONAMI", color: "from-orange-900 via-red-900 to-black", textColor: "text-orange-200", rating: "15", description: "Direct sequel. Known for rusty, bloody textures. Disc spins with an aggressive, metallic whine.", serial: "SLES-51434" },
  { id: 5, title: "Project Zero", publisher: "TECMO", color: "from-indigo-950 via-black to-black", textColor: "text-indigo-200", rating: "15", description: "Capture spirits with a camera. High-pitched spectral frequencies in the spin audio.", serial: "SLES-50821" },
  { id: 6, title: "Rule of Rose", publisher: "505 GAMES", color: "from-rose-900 via-black to-stone-900", textColor: "text-rose-200", rating: "16", description: "Psychological horror involving children and hierarchy. Unsettling, uneven spin rhythm.", serial: "SLES-54218" },
  { id: 7, title: "Kuon", publisher: "FromSoftware", color: "from-red-950 via-yellow-900 to-black", textColor: "text-yellow-100", rating: "18", description: "Heian-period horror. Traditional instrument harmonics hidden in the noise floor.", serial: "SLES-53026" },
  { id: 8, title: "Forbidden Siren", publisher: "Sony", color: "from-red-800 via-black to-red-950", textColor: "text-red-500", rating: "18", description: "Sight-jacking mechanic. Disc audio includes static bursts simulating signal interference.", serial: "SCES-52328" },
];

/* -------------------------------------------------------------------------- */
/* SETTINGS PANEL                                                             */
/* -------------------------------------------------------------------------- */
const SettingsPanel = ({ onClose, playPreview, availableTracks, onAddTrack, onSaveGame, gamesList }) => {
  // Image & Visuals
  const [imgSrc, setImgSrc] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showPreviewZone, setShowPreviewZone] = useState(false);

  // Metadata
  const [targetSlot, setTargetSlot] = useState("new"); 
  const [customTitle, setCustomTitle] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [overlayText, setOverlayText] = useState("");
  const [fontStyle, setFontStyle] = useState("font-serif");
  const [textPosition, setTextPosition] = useState("top");
  const [headerStyle, setHeaderStyle] = useState("ps2"); 

  // Audio
  const [selectedTrackId, setSelectedTrackId] = useState(1);
  const [previewPlayingId, setPreviewPlayingId] = useState(null);
  const [loop, setLoop] = useState(true);
  const [startPoint, setStartPoint] = useState(0); 
  const [endPoint, setEndPoint] = useState(100);
  const [draggingPointer, setDraggingPointer] = useState(null);
  const [timelinePlaying, setTimelinePlaying] = useState(false);
  const [saveStatus, setSaveStatus] = useState(false);
  const timelineRef = useRef(null);

  // EDIT MODE LOGIC
  useEffect(() => {
      if (targetSlot !== "new") {
          const existingGame = gamesList.find(g => g.id.toString() === targetSlot.toString());
          if (existingGame) {
              // Load ALL metadata from the selected game
              setImgSrc(existingGame.customImage || null);
              setCustomTitle(existingGame.title);
              setCustomDesc(existingGame.description);
              setOverlayText(existingGame.overlayText || "");
              setFontStyle(existingGame.overlayFont || "font-serif");
              setTextPosition(existingGame.overlayPosition || "top");
              setHeaderStyle(existingGame.headerStyle || (existingGame.showHeader === false ? 'none' : 'ps2'));
              // Audio config
              const audioCfg = existingGame.audioConfig || { start: 0, end: 100, loop: true };
              setStartPoint(audioCfg.start);
              setEndPoint(audioCfg.end);
              setLoop(audioCfg.loop);
              if (existingGame.audioTrack) setSelectedTrackId(existingGame.audioTrack.id);
          }
      } else {
          // Reset for new
          setCustomTitle("");
          setCustomDesc("");
          setOverlayText("");
          setHeaderStyle("ps2");
          setImgSrc(null);
      }
  }, [targetSlot, gamesList]);

  const MOCK_DURATION = 180; 

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => {
          setImgSrc(e.target.result);
          setOffset({ x: 0, y: 0 });
          setZoom(1); 
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleAudioUpload = (e) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          const url = URL.createObjectURL(file);
          onAddTrack({ id: `custom-${Date.now()}`, title: file.name, type: 'file', url: url, serial: 'USER-UPLOAD' });
      }
  };

  const handleTimelineMouseDown = (e, pointer) => { e.stopPropagation(); setDraggingPointer(pointer); };
  const handleGlobalMouseMove = useCallback((e) => {
      if (draggingPointer && timelineRef.current) {
          const rect = timelineRef.current.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const percent = Math.min(Math.max((clickX / rect.width) * 100, 0), 100);
          if (draggingPointer === 'start') setStartPoint(percent < endPoint ? percent : endPoint - 1);
          else setEndPoint(percent > startPoint ? percent : startPoint + 1);
      }
  }, [draggingPointer, startPoint, endPoint]);
  const handleGlobalMouseUp = useCallback(() => { setDraggingPointer(null); }, []);
  
  useEffect(() => {
      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => {
          window.removeEventListener('mousemove', handleGlobalMouseMove);
          window.removeEventListener('mouseup', handleGlobalMouseUp);
      };
  }, [handleGlobalMouseMove, handleGlobalMouseUp]);

  const handleListPlay = (track) => {
      if (previewPlayingId === track.id) { playPreview(null); setPreviewPlayingId(null); }
      else { setPreviewPlayingId(track.id); playPreview(track, { start: 0, end: 100, loop: false }); }
  };

  const toggleTimelinePlay = () => {
      const track = availableTracks.find(t => t.id === selectedTrackId);
      if (timelinePlaying) { playPreview(null); setTimelinePlaying(false); }
      else { playPreview(track, { start: startPoint, end: endPoint, loop: loop }); setTimelinePlaying(true); }
  };

  const handleSave = () => {
    setSaveStatus(true);
    const track = availableTracks.find(t => t.id === selectedTrackId) || availableTracks[0];
    const gameId = targetSlot === "new" ? `user-${Date.now()}` : targetSlot;
    
    const newGame = {
        id: gameId,
        title: customTitle || "Untitled Game",
        publisher: "LOCAL_DRIVE",
        color: "from-blue-900 via-black to-blue-950",
        textColor: "text-blue-100",
        rating: "USER",
        description: customDesc || "No description provided.",
        serial: "CUST-001",
        customImage: imgSrc,
        audioTrack: track,
        audioConfig: { start: startPoint, end: endPoint, loop: loop },
        headerStyle: headerStyle,
        overlayText: overlayText,
        overlayFont: fontStyle,
        overlayPosition: textPosition
    };
    setTimeout(() => { setSaveStatus(false); onSaveGame(newGame, targetSlot); onClose(); }, 1000);
  };

  const getTextPositionClass = () => {
      switch(textPosition) {
          case 'bottom': return 'justify-end';
          case 'center': return 'justify-center';
          case 'top': default: return 'justify-start';
      }
  };

  const renderHeaderStrip = () => {
      switch(headerStyle) {
          case 'ps1':
              return (
                  <div className="absolute top-0 left-0 right-0 h-8 bg-black flex items-center px-2 border-b-2 border-white z-20">
                      <span className="text-white font-serif-display text-xs tracking-widest font-bold italic transform skew-x-[-10deg]">PlayStation</span>
                  </div>
              );
          case 'ps2':
              return (
                  <div className="absolute top-0 left-0 right-0 h-6 bg-black flex items-center px-2 justify-between z-20">
                      <div className="w-full h-[2px] bg-gradient-to-r from-blue-600 to-black mb-[-2px]"></div>
                      <span className="font-sans text-[9px] tracking-[0.1em] font-bold text-white italic">PlayStation.2</span>
                      <span className="text-[8px] text-neutral-500 font-mono">PAL</span>
                  </div>
              );
          case 'ps3':
              return (
                  <div className="absolute top-0 left-4 w-8 h-full bg-gradient-to-b from-red-900 to-black z-20 flex items-center justify-center border-r border-white/20">
                      <span className="text-[8px] text-white font-bold -rotate-90 tracking-widest whitespace-nowrap">PLAYSTATION 3</span>
                  </div>
              );
          case 'ps4':
              return (
                  <div className="absolute top-0 left-0 right-0 h-6 bg-blue-900 flex items-center justify-center z-20">
                      <div className="w-full h-[1px] bg-white/50 absolute top-1"></div>
                      <span className="text-white font-sans text-[10px] tracking-widest">PS4</span>
                  </div>
              );
          case 'ps5':
              return (
                  <div className="absolute top-0 left-0 right-0 h-8 bg-white flex items-center justify-between px-3 z-20 shadow-lg">
                      <span className="text-black font-sans text-[10px] font-bold">PS5</span>
                      <div className="h-1 w-full bg-black ml-2"></div>
                  </div>
              );
          case 'xbox':
              return (
                  <div className="absolute top-0 left-0 right-0 h-6 bg-green-600 flex items-center px-2 z-20 border-b border-green-400">
                      <span className="text-white font-bold text-xs tracking-tighter">XBOX</span>
                  </div>
              );
          default: return null;
      }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
      {saveStatus && (
          <div className="fixed bottom-4 right-4 z-[110] flex flex-col items-end gap-1 animate-in slide-in-from-bottom-2 fade-in duration-300">
              <span className="text-[10px] text-green-500 font-mono animate-pulse font-bold tracking-widest">WRITING TO MEMORY CARD...</span>
              <div className="w-48 h-1 bg-green-900/30"><div className="h-full bg-green-500 w-full animate-progress-fill"></div></div>
          </div>
      )}

      <div className="w-full max-w-6xl h-[90vh] bg-neutral-950 border border-blue-900/50 shadow-[0_0_50px_rgba(30,58,138,0.2)] rounded-lg overflow-hidden flex flex-col font-mono animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-blue-950/20 border-b border-blue-900/30 p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <Settings className="text-blue-400" size={20} />
                <h2 className="text-blue-400 font-bold tracking-widest text-lg">SETTINGS_PANEL.CONFIG</h2>
            </div>
            <div className="flex items-center gap-4">
                 <select 
                    value={targetSlot} 
                    onChange={(e) => setTargetSlot(e.target.value)}
                    className="bg-neutral-900 border border-blue-900/50 text-blue-300 text-[10px] rounded px-2 py-1 outline-none focus:border-blue-500 uppercase font-bold"
                 >
                     <option value="new">[ + ] CREATE NEW ENTRY</option>
                     {gamesList.map((g, i) => (
                         <option key={g.id} value={g.id}>[ {i + 1} ] EDIT: {g.title}</option>
                     ))}
                 </select>
                 <button onClick={handleSave} className="px-4 py-1.5 bg-blue-700 border border-blue-500 text-white rounded text-[10px] font-bold tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2">
                    <Save size={12}/> SAVE
                </button>
                <button onClick={onClose} className="text-neutral-500 hover:text-red-500 hover:shadow-[0_0_15px_rgba(220,38,38,0.5)] p-1 hover:bg-neutral-800 rounded transition-all duration-300"><X size={20}/></button>
            </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* LEFT: VISUAL EDITOR */}
            <div className="md:w-1/2 border-b md:border-b-0 md:border-r border-blue-900/30 flex flex-col overflow-y-auto custom-scrollbar">
                <div className="p-6 flex flex-col gap-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-blue-300 font-bold flex items-center gap-2 text-sm uppercase"><ImageIcon size={16}/> Visual Editor</h3>
                        <button onClick={() => setShowPreviewZone(!showPreviewZone)} className={`text-[10px] flex items-center gap-1 px-2 py-1 rounded border ${showPreviewZone ? 'bg-blue-500 text-white' : 'text-neutral-500 border-neutral-700'}`}>
                            <Eye size={10} /> Highlight Zone
                        </button>
                    </div>

                    {/* Preview Window */}
                    <label 
                        className="aspect-[2/3] w-full max-w-sm mx-auto bg-black border border-dashed border-neutral-700 rounded-sm relative overflow-hidden cursor-pointer group shadow-xl hover:border-blue-500/50 transition-colors"
                        onMouseDown={(e) => { if(imgSrc) { setIsDragging(true); setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y }); } }} 
                        onMouseMove={(e) => { if (isDragging) setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); }} 
                        onMouseUp={() => setIsDragging(false)} 
                        onMouseLeave={() => setIsDragging(false)}
                    >
                        <input type="file" accept="image/*, image/gif" onChange={handleFileChange} className="hidden" />
                        
                        {imgSrc ? (
                            <img 
                                src={imgSrc} alt="Preview" 
                                className="absolute origin-center transition-transform duration-75 ease-linear pointer-events-none object-cover w-full h-full"
                                style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, maxWidth: 'none' }}
                            />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-neutral-600 pointer-events-none">
                                <ZoomIn size={32} className="mb-2 opacity-50"/> <span className="text-xs">CLICK TO UPLOAD IMAGE</span>
                            </div>
                        )}
                        
                        {/* Overlays */}
                        {/* ADDED PADDING 'pt-8' if header is present to avoid overlap */}
                        <div className={`absolute inset-0 pointer-events-none flex flex-col p-4 z-20 ${getTextPositionClass()} ${headerStyle !== 'none' && textPosition === 'top' ? 'pt-12' : ''}`}>
                             {renderHeaderStrip()}
                             
                             <div className={`relative ${showPreviewZone ? 'border border-red-500 bg-red-500/10' : ''}`}>
                                 {overlayText && (
                                    <div className={`text-4xl text-white drop-shadow-md leading-none break-words ${fontStyle}`} style={{ textShadow: '2px 2px 0 #000' }}>
                                        {overlayText}
                                    </div>
                                 )}
                             </div>
                        </div>
                    </label>

                    {/* Image Controls */}
                    {imgSrc && (
                        <div className="space-y-4 bg-neutral-900/50 p-4 rounded border border-neutral-800">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-neutral-500">ZOOM</span>
                                <input type="range" min="0.5" max="3" step="0.1" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="flex-1 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer range-slider" />
                            </div>
                        </div>
                    )}

                    {/* Metadata & Overlays */}
                    <div className="space-y-4 bg-neutral-900/50 p-4 rounded border border-neutral-800">
                        <h4 className="text-xs font-bold text-neutral-400 uppercase border-b border-neutral-800 pb-2">Metadata & Overlays</h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <label className="text-[10px] text-neutral-500 uppercase">Game Title</label>
                                <input type="text" value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="e.g. My Horror Game" className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-white focus:border-blue-500 outline-none placeholder-neutral-600"/>
                            </div>
                             <div className="space-y-1">
                                <label className="text-[10px] text-neutral-500 uppercase">Description</label>
                                <input type="text" value={customDesc} onChange={(e) => setCustomDesc(e.target.value)} placeholder="Short synopsis..." className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-white focus:border-blue-500 outline-none placeholder-neutral-600"/>
                            </div>
                        </div>

                        <div className="space-y-1">
                             <label className="text-[10px] text-neutral-500 uppercase flex justify-between"><span>Cover Text</span></label>
                             <input type="text" value={overlayText} onChange={(e) => setOverlayText(e.target.value)} placeholder="Text on image..." className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-white focus:border-blue-500 outline-none placeholder-neutral-600"/>
                        </div>

                        <div className="flex gap-4 items-end">
                            <div className="flex-1 space-y-1">
                                <label className="text-[10px] text-neutral-500 uppercase">Position</label>
                                <div className="flex border border-neutral-700 rounded overflow-hidden">
                                    <button onClick={() => setTextPosition('top')} className={`flex-1 py-1 hover:bg-neutral-700 ${textPosition === 'top' ? 'bg-blue-900/50 text-white' : 'bg-neutral-800 text-neutral-500'}`}><ArrowUp size={12} className="mx-auto"/></button>
                                    <button onClick={() => setTextPosition('center')} className={`flex-1 py-1 hover:bg-neutral-700 ${textPosition === 'center' ? 'bg-blue-900/50 text-white' : 'bg-neutral-800 text-neutral-500'}`}><Minus size={12} className="mx-auto"/></button>
                                    <button onClick={() => setTextPosition('bottom')} className={`flex-1 py-1 hover:bg-neutral-700 ${textPosition === 'bottom' ? 'bg-blue-900/50 text-white' : 'bg-neutral-800 text-neutral-500'}`}><ArrowDown size={12} className="mx-auto"/></button>
                                </div>
                            </div>
                            <div className="flex-1 space-y-1">
                                <label className="text-[10px] text-neutral-500 uppercase">Font</label>
                                <select value={fontStyle} onChange={(e) => setFontStyle(e.target.value)} className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-white focus:border-blue-500 outline-none">
                                    <option value="font-serif-display">Serif Display</option>
                                    <option value="font-sans">Inter (Clean)</option>
                                    <option value="font-mono-tech">Tech Mono</option>
                                    <option value="font-creepster">Creepster</option>
                                    <option value="font-orbitron">Orbitron</option>
                                    <option value="font-bangers">Bangers</option>
                                    <option value="font-elite">Typewriter</option>
                                    <option value="font-medieval">Medieval</option>
                                    <option value="font-marker">Marker</option>
                                </select>
                            </div>
                            <div className="flex-1 space-y-1">
                                <label className="text-[10px] text-neutral-500 uppercase">Header Style</label>
                                <select value={headerStyle} onChange={(e) => setHeaderStyle(e.target.value)} className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1 text-xs text-white focus:border-blue-500 outline-none">
                                    <option value="none">None</option>
                                    <option value="ps2">PlayStation 2</option>
                                    <option value="ps1">PlayStation 1</option>
                                    <option value="ps3">PlayStation 3</option>
                                    <option value="ps4">PlayStation 4</option>
                                    <option value="ps5">PlayStation 5</option>
                                    <option value="xbox">Xbox</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* RIGHT: AUDIO CONFIG */}
            <div className="md:w-1/2 p-6 flex flex-col gap-6 bg-neutral-900/50">
                <div className="flex items-center justify-between border-b border-blue-900/20 pb-4">
                     <h3 className="text-blue-300 font-bold flex items-center gap-2 text-sm uppercase"><Music size={16}/> Audio Selector</h3>
                     <label className="cursor-pointer text-xs flex items-center gap-2 text-blue-400 hover:text-white transition-colors bg-blue-950/40 px-3 py-1.5 rounded border border-blue-900/50 hover:border-blue-500">
                         <UploadCloud size={14} /> <span className="font-bold">UPLOAD .WAV/.MP3</span>
                         <input type="file" accept="audio/*" className="hidden" onChange={handleAudioUpload} />
                     </label>
                </div>

                <div className="space-y-2">
                    <label className="text-xs text-neutral-500 block">AVAILABLE FILES / PROFILES</label>
                    <div className="flex flex-col gap-1 h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {availableTracks.map((t) => (
                            <div key={t.id} className={`flex items-center gap-2 p-2 rounded border transition-all ${selectedTrackId === t.id ? 'bg-blue-900/30 border-blue-500' : 'bg-neutral-800/50 border-neutral-800'}`}>
                                <button 
                                    onClick={() => handleListPlay(t)}
                                    className={`p-2 rounded-full ${previewPlayingId === t.id ? 'bg-blue-500 text-white' : 'bg-neutral-700 text-neutral-400 hover:bg-neutral-600'}`}
                                >
                                    {previewPlayingId === t.id ? <Pause size={10} /> : <Play size={10} />}
                                </button>
                                <button onClick={() => setSelectedTrackId(t.id)} className="flex-1 text-left flex justify-between items-center">
                                    <span className={`text-xs font-bold ${selectedTrackId === t.id ? 'text-white' : 'text-neutral-400'}`}>{t.title}</span>
                                    <span className="text-[9px] font-mono opacity-50">{t.serial || 'SYS-DEF'}</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ADVANCED TIMELINE */}
                <div className="space-y-6 mt-auto">
                     <div className="space-y-2">
                        <div className="flex justify-between text-xs text-neutral-500 uppercase tracking-widest items-end">
                            <span className="flex items-center gap-1"><Clock size={12}/> TIMELINE EDITOR</span>
                            <div className="flex gap-4 font-mono text-blue-400">
                                <span>START: {formatTime((startPoint/100) * MOCK_DURATION)}</span>
                                <span>END: {formatTime((endPoint/100) * MOCK_DURATION)}</span>
                            </div>
                        </div>
                        
                        {/* Interactive Timeline Bar */}
                        <div 
                            ref={timelineRef}
                            className="relative w-full h-12 bg-neutral-950 rounded border border-neutral-800 overflow-hidden group select-none"
                        >
                             <div className="absolute inset-0 flex items-end gap-[1px] opacity-30 pointer-events-none px-1">
                                {[...Array(60)].map((_, i) => (
                                    <div key={i} className="bg-blue-500 w-full rounded-t-sm" style={{ height: `${20 + Math.random() * 60}%` }}></div>
                                ))}
                             </div>
                             
                             <div className="absolute top-0 bottom-0 bg-blue-900/20 border-x border-blue-500/30"
                                  style={{ left: `${startPoint}%`, right: `${100 - endPoint}%` }}>
                             </div>

                             <div 
                                className="absolute top-0 bottom-0 w-[2px] bg-green-500 z-20 cursor-ew-resize hover:w-1 transition-width" 
                                style={{ left: `${startPoint}%` }}
                                onMouseDown={(e) => handleTimelineMouseDown(e, 'start')}
                             >
                                <div className="absolute -top-0 -left-2 w-4 h-4 bg-green-600 rounded-b flex items-center justify-center text-[9px] font-bold text-black shadow-lg cursor-grab-active">S</div>
                             </div>

                             <div 
                                className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-20 cursor-ew-resize hover:w-1 transition-width" 
                                style={{ left: `${endPoint}%` }}
                                onMouseDown={(e) => handleTimelineMouseDown(e, 'end')}
                             >
                                <div className="absolute -top-0 -left-2 w-4 h-4 bg-red-600 rounded-b flex items-center justify-center text-[9px] font-bold text-white shadow-lg cursor-grab-active">E</div>
                             </div>
                        </div>
                        <div className="text-[9px] text-neutral-600 flex justify-center">DRAG 'S' OR 'E' POINTERS TO SET LOOP</div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button 
                            onClick={toggleTimelinePlay}
                            className={`flex-1 h-10 rounded border flex items-center justify-center gap-2 text-xs font-bold tracking-widest transition-all
                                ${timelinePlaying ? 'bg-blue-600 border-blue-400 text-white' : 'bg-neutral-800 border-neutral-600 text-neutral-300 hover:bg-neutral-700'}
                            `}
                        >
                            {timelinePlaying ? <Pause size={14}/> : <Play size={14}/>} {timelinePlaying ? 'PAUSE' : 'PLAY RANGE'}
                        </button>
                        
                        <div className="flex items-center justify-between px-3 h-10 bg-neutral-800 rounded border border-neutral-700 flex-1">
                            <div className="flex items-center gap-2">
                                <RotateCcw size={14} className={loop ? "text-blue-400" : "text-neutral-600"} />
                                <span className="text-[10px] font-bold text-neutral-400">LOOP PLAYBACK</span>
                            </div>
                            <button onClick={() => setLoop(!loop)} className={`w-8 h-4 rounded-full relative transition-all duration-300 ease-in-out ${loop ? 'bg-blue-600' : 'bg-neutral-600'}`}>
                                <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all duration-300 ease-in-out ${loop ? 'left-4.5' : 'left-0.5'}`}></div>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* MAIN APP                                                                   */
/* -------------------------------------------------------------------------- */
export default function App() {
  const [games, setGames] = useState(initialGamesData);
  const [availableTracks, setAvailableTracks] = useState(initialGamesData); 
  const [selectedGame, setSelectedGame] = useState(null);
  const [isClosing, setIsClosing] = useState(false);
  const [showRegistry, setShowRegistry] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  const { playSound, stopSound, playUiSound, isSpinning, audioData } = useAudioEngine();
  
  const registryProgress = useMultiKeyTrigger(['c', 'o', '2'], () => { setShowRegistry(true); playUiSound('open'); }, 2000);
  const settingsProgress = useMultiKeyTrigger(['f', 's'], () => { setShowSettings(true); playUiSound('open'); }, 2000);

  const handleGameSelect = (game) => { playUiSound('open'); setSelectedGame(game); };
  const handleClose = () => { if(isSpinning) stopSound(); setIsClosing(true); setTimeout(() => { setSelectedGame(null); setIsClosing(false); }, 300); };
  const togglePlayback = (e) => {
    e.stopPropagation();
    if (isSpinning) stopSound();
    else {
        const track = selectedGame.audioTrack || selectedGame;
        const config = selectedGame.audioConfig || { start: 0, end: 100, loop: true };
        playSound(track, config);
    }
  };

  const handleAddTrack = (newTrack) => setAvailableTracks(prev => [newTrack, ...prev]);
  
  const handleSaveGame = (newGame, targetSlot) => {
      if (targetSlot === 'new') {
          setGames(prev => [newGame, ...prev]);
      } else {
          setGames(prev => prev.map(g => g.id.toString() === targetSlot.toString() ? newGame : g));
      }
  };

  // Render Header in Grid/Zoom
  const renderHeader = (game) => {
      if (game.headerStyle && game.headerStyle !== 'none') {
          switch(game.headerStyle) {
              case 'ps1': return <div className="absolute top-0 left-0 right-0 h-8 bg-black flex items-center px-2 border-b-2 border-white z-20"><span className="text-white font-serif-display text-xs tracking-widest font-bold italic transform skew-x-[-10deg]">PlayStation</span></div>;
              case 'ps2': return <div className="absolute top-0 left-0 right-0 h-6 bg-black flex items-center px-2 justify-between z-20"><div className="w-full h-[2px] bg-gradient-to-r from-blue-600 to-black mb-[-2px]"></div><span className="font-sans text-[9px] tracking-[0.1em] font-bold text-white italic">PlayStation.2</span><span className="text-[8px] text-neutral-500 font-mono">PAL</span></div>;
              case 'ps3': return <div className="absolute top-0 left-4 w-8 h-full bg-gradient-to-b from-red-900 to-black z-20 flex items-center justify-center border-r border-white/20"><span className="text-[8px] text-white font-bold -rotate-90 tracking-widest whitespace-nowrap">PLAYSTATION 3</span></div>;
              case 'ps4': return <div className="absolute top-0 left-0 right-0 h-6 bg-blue-900 flex items-center justify-center z-20"><div className="w-full h-[1px] bg-white/50 absolute top-1"></div><span className="text-white font-sans text-[10px] tracking-widest">PS4</span></div>;
              case 'ps5': return <div className="absolute top-0 left-0 right-0 h-8 bg-white flex items-center justify-between px-3 z-20 shadow-lg"><span className="text-black font-sans text-[10px] font-bold">PS5</span><div className="h-1 w-full bg-black ml-2"></div></div>;
              case 'xbox': return <div className="absolute top-0 left-0 right-0 h-6 bg-green-600 flex items-center px-2 z-20 border-b border-green-400"><span className="text-white font-bold text-xs tracking-tighter">XBOX</span></div>;
              default: return null;
          }
      }
      // Default Fallback to PS2 if unstyled
      return <div className="absolute top-0 left-0 right-0 h-6 bg-black flex items-center px-2 justify-between z-20"><div className="w-full h-[2px] bg-gradient-to-r from-blue-600 to-black mb-[-2px]"></div><span className="font-sans text-[9px] tracking-[0.1em] font-bold text-white italic">PlayStation.2</span><span className="text-[8px] text-neutral-500 font-mono">PAL</span></div>;
  };

  const getGridTextPosition = (pos, hasHeader) => {
      // Add padding top if there is a header and position is top
      const base = pos === 'bottom' ? 'justify-end' : pos === 'center' ? 'justify-center' : 'justify-start';
      const padding = (hasHeader && pos === 'top') ? 'pt-10' : '';
      return `${base} ${padding}`;
  };

  const getVisuals = () => {
    if (!audioData || audioData.length === 0) return { x: 0, y: 0, scratch: 0 };
    let sum = 0; for(let i=0; i<audioData.length; i++) sum += Math.abs(audioData[i] - 128);
    const avg = sum / audioData.length; const highFreq = audioData[10] || 128; 
    return { x: (Math.random()-0.5)*(avg*0.1), y: (Math.random()-0.5)*(avg*0.1), scratchOp: (highFreq>140 && Math.random()>0.7)?0.6:0 };
  };
  const visuals = getVisuals();

  return (
    <div className="min-h-screen bg-black text-gray-200 font-sans overflow-x-hidden selection:bg-red-900 selection:text-white">
      <GlobalStyles />
      <div className="fixed inset-0 opacity-10 pointer-events-none z-0 mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }}></div>

      {showRegistry && <SystemRegistry onClose={() => setShowRegistry(false)} />}
      
      {showSettings && (
        <SettingsPanel 
            onClose={() => setShowSettings(false)} 
            playPreview={(track, config) => track ? playSound(track, config) : stopSound()}
            availableTracks={availableTracks}
            onAddTrack={handleAddTrack}
            onSaveGame={handleSaveGame}
            gamesList={games}
        />
      )}

      {registryProgress > 0 && !showRegistry && (
          <div className="fixed bottom-4 right-4 z-[100] flex flex-col items-end gap-1">
              <span className="text-[10px] text-red-500 font-mono animate-pulse">DECRYPTING...</span>
              <div className="w-32 h-1 bg-red-900/30"><div className="h-full bg-red-600 transition-all duration-100 ease-linear" style={{ width: `${registryProgress}%` }}></div></div>
          </div>
      )}
      {settingsProgress > 0 && !showSettings && (
          <div className="fixed bottom-4 left-4 z-[100] flex flex-col items-start gap-1">
              <span className="text-[10px] text-blue-500 font-mono animate-pulse">INITIALIZING CONFIG...</span>
              <div className="w-32 h-1 bg-blue-900/30"><div className="h-full bg-blue-600 transition-all duration-100 ease-linear" style={{ width: `${settingsProgress}%` }}></div></div>
          </div>
      )}

      <header className="fixed top-0 left-0 right-0 z-40 bg-black/90 backdrop-blur-sm border-b border-neutral-800">
        <div className="w-full px-4 h-12 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className={`w-4 h-4 ${isSpinning ? 'text-red-500 animate-pulse' : 'text-neutral-600'}`} />
            <h1 className="text-sm font-bold tracking-widest text-neutral-400">ARCHIVE<span className="text-red-800">.SYS</span></h1>
          </div>
          <div className="hidden sm:flex gap-4 text-[10px] font-mono text-neutral-600 uppercase"><span>MEM: 64MB</span> <span>CPU: EE_CORE</span></div>
        </div>
      </header>

      <main className="pt-12 relative z-10 w-full">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 bg-black">
          {games.map((game) => (
            <div
              key={game.id}
              onClick={() => handleGameSelect(game)}
              onMouseEnter={() => playUiSound('hover')}
              className="group relative cursor-pointer aspect-[2/3] overflow-hidden border-r border-b border-white/5"
            >
              <div className={`w-full h-full bg-gradient-to-br ${game.color} relative transition-all duration-300 group-hover:brightness-110`}>
                {game.customImage ? (
                    <>
                        <img src={game.customImage} alt={game.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent"></div>
                        {renderHeader(game)}
                        <div className={`absolute inset-0 p-4 z-10 flex flex-col ${getGridTextPosition(game.overlayPosition || 'top', game.headerStyle !== 'none')}`}>
                            {game.overlayText && (
                                <div 
                                    className={`text-xl text-white drop-shadow-md leading-none break-words ${game.overlayFont || 'font-serif'}`} 
                                    style={{ 
                                        textShadow: '2px 2px 0 #000',
                                        transform: `translate(${visuals.x}px, ${visuals.y}px)`
                                    }}
                                >
                                    {game.overlayText}
                                </div>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        {renderHeader(game)}
                        <div className="absolute inset-0 p-4 pt-10 flex flex-col justify-between">
                           <div className="transform transition-transform duration-500 group-hover:translate-x-1">
                              <h2 className={`text-xl sm:text-2xl font-serif font-bold leading-none ${game.textColor} drop-shadow-lg`}>{game.title}</h2>
                           </div>
                           <div className="flex justify-between items-end opacity-70">
                              <div className="bg-white text-black w-6 h-8 flex items-center justify-center font-bold text-[10px] border border-black">{game.rating}</div>
                              <span className="text-[9px] font-mono text-white/50">{game.serial}</span>
                           </div>
                        </div>
                    </>
                )}
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none"></div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {(selectedGame || isClosing) && (
        <div 
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
          onClick={handleClose}
        >
          {isSpinning && (
             <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-50 mix-blend-screen">
                <div className="absolute h-[1px] bg-red-600 w-full top-1/4 shadow-[0_0_10px_red]" style={{ opacity: visuals.scratchOp, transform: `translateY(${visuals.y * 10}px)` }} />
                <div className="absolute h-[2px] bg-red-500 w-full top-2/3 shadow-[0_0_10px_red]" style={{ opacity: visuals.scratchOp, transform: `translateY(${visuals.x * -20}px) rotate(1deg)` }} />
             </div>
          )}

          <div 
            className={`relative w-full max-w-4xl h-[600px] flex flex-col md:flex-row bg-neutral-900 border border-neutral-800 shadow-2xl transition-transform duration-300 ${isClosing ? 'scale-90' : 'scale-100'}`}
            onClick={(e) => e.stopPropagation()}
            style={{ transform: `translate(${visuals.x}px, ${visuals.y}px) ${isClosing ? 'scale(0.9)' : 'scale(1)'}` }}
          >
            <div className={`md:w-5/12 relative bg-gradient-to-br ${selectedGame?.color} flex flex-col justify-between overflow-hidden`}>
                {selectedGame?.customImage ? (
                    <>
                        <img src={selectedGame.customImage} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
                        {selectedGame.overlayText && (
                            <div className={`absolute inset-0 p-8 z-10 flex flex-col ${getGridTextPosition(selectedGame.overlayPosition || 'top', selectedGame.headerStyle !== 'none')}`}>
                                <div className={`text-4xl text-white drop-shadow-md leading-none break-words ${selectedGame.overlayFont || 'font-serif'}`} style={{ textShadow: '2px 2px 0 #000' }}>
                                    {selectedGame.overlayText}
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="p-8 h-full flex flex-col justify-between relative z-10">
                        <div className="mt-12"><h2 className={`text-5xl font-serif font-bold leading-none ${selectedGame?.textColor} drop-shadow-2xl`}>{selectedGame?.title}</h2></div>
                    </div>
                )}
                {renderHeader(selectedGame)}
                <div className={`absolute -right-20 -bottom-20 opacity-30 transition-all duration-[2000ms] ${isSpinning ? 'rotate-[3600deg]' : 'rotate-0'}`}>
                    <Disc size={300} className="text-white" />
                </div>
            </div>

            <div className="md:w-7/12 p-8 bg-neutral-900 flex flex-col relative text-neutral-300">
                <button onClick={handleClose} className="absolute top-4 right-4 text-neutral-500 hover:text-white"><X /></button>
                <div className="mb-6 flex items-center gap-2 text-xs font-mono text-neutral-500">
                    <Database size={12} /> <span>ID: {selectedGame?.id.toString().slice(-4)}</span>
                    {isSpinning && <span className="text-red-500 animate-pulse ml-2 font-bold">READING SECTOR...</span>}
                </div>
                <h3 className="text-xl text-white font-bold mb-4">{selectedGame?.title}</h3>
                <p className="text-neutral-400 leading-relaxed mb-8">{selectedGame?.description}</p>
                <div className="mt-auto">
                    <button 
                        onClick={togglePlayback}
                        className={`w-full h-16 rounded-sm border flex items-center justify-center gap-3 font-mono text-sm tracking-widest transition-all ${isSpinning ? 'bg-red-950/20 border-red-900 text-red-500' : 'bg-neutral-800 border-neutral-700 hover:bg-neutral-700'}`}
                    >
                        {isSpinning ? <><Activity className="animate-bounce" size={16} /> EJECT DISC</> : <><Disc size={16} /> INSERT DISC</>}
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const SystemRegistry = ({ onClose }) => {
    const particles = useRef([...Array(15)].map((_, i) => ({ id: i, left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, tx: `${(Math.random()-0.5)*100}px`, ty: `${(Math.random()-0.5)*100}px`, delay: `${Math.random()*2}s`, duration: `${3+Math.random()*3}s` }))).current;
    useEffect(() => { const handleEsc = (e) => { if (e.key === 'Escape') onClose(); }; window.addEventListener('keydown', handleEsc); document.body.style.overflow = 'hidden'; return () => { window.removeEventListener('keydown', handleEsc); document.body.style.overflow = 'unset'; }; }, [onClose]);
    return (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-neutral-950 border border-red-900/50 shadow-[0_0_60px_rgba(153,27,27,0.15)] rounded-sm overflow-hidden relative font-mono animate-in fade-in zoom-in duration-300">
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">{particles.map(p => <div key={p.id} className="absolute w-1 h-1 bg-red-500 rounded-full opacity-0" style={{ left: p.left, top: p.top, '--tx': p.tx, '--ty': p.ty, animation: `float-particle ${p.duration} ease-in-out infinite`, animationDelay: p.delay }}/>)}</div>
                <div className="bg-red-950/20 border-b border-red-900/30 p-4 flex justify-between items-center relative z-10"><div className="flex items-center gap-3"><Terminal className="text-red-500" size={18} /><h2 className="text-red-500 font-bold tracking-widest text-lg flex items-center gap-1">SYSTEM_REGISTRY.SYS<span className="w-2 h-4 bg-red-500 animate-blink inline-block ml-1"></span></h2></div><button onClick={onClose} className="text-red-500 hover:text-white transition-colors"><X size={20}/></button></div>
                <div className="p-8 text-neutral-300 space-y-8 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div className="space-y-4"><div className="flex items-start gap-3 group"><User className="text-red-600 mt-1" size={16} /><div><span className="block text-xs text-neutral-500 uppercase">Author</span><span className="text-lg font-bold text-white">Anacondy</span></div></div><div className="flex items-start gap-3 group"><Calendar className="text-red-600 mt-1" size={16} /><div><span className="block text-xs text-neutral-500 uppercase">Origin Date</span><span className="text-lg font-bold text-white">November 24, 2025</span></div></div></div><div className="space-y-4"><div className="flex items-start gap-3 group"><Cpu className="text-red-600 mt-1" size={16} /><div><span className="block text-xs text-neutral-500 uppercase">Version</span><span className="text-lg font-bold text-white">v3.1.4 (STABLE)</span></div></div><div className="flex items-start gap-3 group"><Lock className="text-red-600 mt-1" size={16} /><div><span className="block text-xs text-neutral-500 uppercase">Security Level</span><span className="text-lg font-bold text-green-500">ROOT ACCESS</span></div></div></div></div>
                    <div className="border-t border-red-900/30 pt-6"><div className="flex items-center gap-2 mb-4"><List className="text-red-500" size={16} /><h3 className="uppercase tracking-widest text-sm font-bold text-red-500">Feature Log</h3></div><ul className="space-y-2 text-xs md:text-sm font-light text-neutral-400 h-48 overflow-y-auto pr-2 custom-scrollbar"><li className="flex gap-2"><span className="text-red-500">[+]</span> Immersive Wall Grid Layout (Gapless)</li><li className="flex gap-2"><span className="text-red-500">[+]</span> Generative Audio Engine (Mathematical Synthesis)</li><li className="flex gap-2"><span className="text-red-500">[+]</span> Visualizer V2: Red Scratch Overlay</li><li className="flex gap-2"><span className="text-red-500">[+]</span> Settings Panel (Img Crop + Audio Config)</li><li className="flex gap-2"><span className="text-red-500">[+]</span> Live Particle System (Registry)</li></ul></div>
                </div>
                <div className="bg-black/50 p-2 border-t border-red-900/30 flex justify-between px-4 text-[10px] text-red-900 font-bold uppercase tracking-widest relative z-10"><span className="animate-pulse">CONFIDENTIAL</span><span>INTERNAL USE ONLY</span></div>
            </div>
        </div>
    );
};
