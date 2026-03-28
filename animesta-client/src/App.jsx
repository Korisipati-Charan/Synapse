import React, { useEffect, useRef, useState } from 'react';
import { Hands, HAND_CONNECTIONS } from '@mediapipe/hands';
import { FaceMesh } from '@mediapipe/face_mesh';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';

// ============================================================================
// 1. DYNAMIC FACE WIREFRAME
// ============================================================================
const BiometricFaceDrawing = ({ expression, theme }) => {
  const getMouthPath = () => {
    if (expression === "SMILING") return "M 35 70 Q 50 90 65 70";
    if (expression === "SURPRISED / TALKING") return "M 40 70 C 40 85, 60 85, 60 70 C 60 60, 40 60, 40 70"; 
    return "M 35 75 L 65 75"; 
  };

  const getEyeOffset = () => {
    if (expression === "SURPRISED / TALKING") return -5; 
    if (expression === "SMILING") return 2; 
    return 0;
  };

  return (
    <div style={{ position: 'relative', width: '150px', height: '180px', border: `1px solid ${theme}55`, background: '#050505', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundImage: `linear-gradient(${theme}22 1px, transparent 1px), linear-gradient(90deg, ${theme}22 1px, transparent 1px)`, backgroundSize: '15px 15px', opacity: 0.5 }}></div>
      <style>{`
        @keyframes scanline { 0% { top: 0; } 100% { top: 100%; } }
        @keyframes pulseNode { 0%, 100% { r: 2; opacity: 0.8; } 50% { r: 4; opacity: 1; } }
      `}</style>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '2px', background: theme, boxShadow: `0 0 10px ${theme}`, animation: 'scanline 2s linear infinite' }}></div>

      <svg width="100" height="120" viewBox="0 0 100 120" style={{ position: 'relative', zIndex: 2, filter: `drop-shadow(0 0 5px ${theme})` }}>
        <path d="M 20 20 L 80 20 L 85 50 L 70 100 L 50 110 L 30 100 L 15 50 Z" fill="none" stroke={theme} strokeWidth="2.5" strokeDasharray="4 2" />
        <line x1="25" y1={35 + getEyeOffset()} x2="40" y2={35 + getEyeOffset()} stroke={theme} strokeWidth="3" />
        <line x1="60" y1={35 + getEyeOffset()} x2="75" y2={35 + getEyeOffset()} stroke={theme} strokeWidth="3" />
        <circle cx="32" cy="45" r="4" fill={theme} />
        <circle cx="68" cy="45" r="4" fill={theme} />
        <path d="M 50 35 L 50 65 L 45 70" fill="none" stroke={theme} strokeWidth="2" opacity="0.6" />
        <path d={getMouthPath()} fill={expression === "SURPRISED / TALKING" ? `${theme}44` : "none"} stroke={theme} strokeWidth="3" />
        <circle cx="50" cy="110" r="3" fill="#fff" style={{ animation: 'pulseNode 1.5s infinite' }} />
        <circle cx="15" cy="50" r="3" fill="#fff" style={{ animation: 'pulseNode 1.5s infinite 0.5s' }} />
        <circle cx="85" cy="50" r="3" fill="#fff" style={{ animation: 'pulseNode 1.5s infinite 0.5s' }} />
      </svg>
    </div>
  );
};

// ============================================================================
// 2. TERMINAL INPUT (HYBRID RESPONSIVE)
// ============================================================================
const TerminalInput = ({ command, setCommand, onExecute, theme, hciActive, internetActive }) => {
  const getPrompt = () => {
    if (hciActive && internetActive) return "C:\\OMNI>";
    if (hciActive && !internetActive) return "C:\\REQ>";
    return "C:\\ZERO>";
  };

  let statusText = "IDLE";
  if (hciActive) statusText = "MIC_HOT";
  if (command.length > 0) statusText = "TYPING";

  return (
    <div className="terminal-input-container" style={{ background: '#030303', border: `1px solid ${theme}44`, borderLeft: `6px solid ${theme}`, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, ${theme} 2px, ${theme} 4px)`, opacity: 0.05, pointerEvents: 'none' }}></div>

      <div style={{ display: 'flex', alignItems: 'center', flex: 1, background: 'transparent', zIndex: 1, minWidth: 0 }}>
        <span className="prompt-text" style={{ color: theme, fontWeight: 'bold', fontFamily: 'monospace' }}>{getPrompt()}</span>
        <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center', minWidth: 0 }}>
            {command.length === 0 && <span className="prompt-placeholder" style={{ position: 'absolute', color: theme, opacity: 0.3, fontFamily: 'monospace', pointerEvents: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>_ await...</span>}
            <input type="text" value={command} onChange={e => setCommand(e.target.value)} onKeyDown={e => e.key === 'Enter' && onExecute()} className="input-box" style={{ width: '100%', background: 'transparent', border: 'none', color: theme, outline: 'none', fontFamily: 'monospace', caretColor: 'transparent', zIndex: 2 }} spellCheck="false" autoComplete="off" autoFocus />
            <div style={{ width: '12px', height: '1.2rem', background: theme, animation: 'blink 1s step-end infinite', flexShrink: 0, marginLeft: '2px' }}></div>
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
        <span className="terminal-status" style={{ color: theme, opacity: 0.5, fontFamily: 'monospace', letterSpacing: '1px' }}>[{statusText}]</span>
        <button className="exec-btn" onClick={onExecute} style={{ background: 'transparent', color: theme, border: `2px solid ${theme}`, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'monospace', letterSpacing: '1px', transition: 'all 0.1s', zIndex: 1 }} onMouseOver={e => { e.currentTarget.style.background = theme; e.currentTarget.style.color = '#000'; }} onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = theme; }}>EXEC</button>
      </div>
      <style>{`@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }`}</style>
    </div>
  );
};

// ============================================================================
// 3. MAIN APPLICATION CORE
// ============================================================================
const App = () => {
  const [bootState, setBootState] = useState('STANDBY'); 
  const [bootError, setBootError] = useState('');

  const videoRef = useRef(null);
  const hudCanvasRef = useRef(null);
  const neuralCanvasRef = useRef(null);
  const fftCanvasRef = useRef(null);
  const socketRef = useRef(null);
  const logsEndRef = useRef(null);
  
  // Audio & Hardware Refs
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const audioDataRef = useRef(null);
  const recognitionRef = useRef(null); 
  const micStreamRef = useRef(null); 
  
  // VAD Locks & Timers
  const haltTriggeredRef = useRef(false);
  const isSpeakingRef = useRef(false); 
  const isProcessingRef = useRef(false); 
  const silenceTimerRef = useRef(null);
  const transcriptBufferRef = useRef("");
  
  const lastSent = useRef(0);
  const lastGestureTime = useRef(0);
  const bioHistory = useRef([]); 
  const currentBio = useRef({ face: "SCANNING...", tone: "SILENT" }); 
  
  const [ui, setUi] = useState({ gesture: "SEARCHING..." });
  const [biometrics, setBiometrics] = useState({ face: "SCANNING...", tone: "SILENT" });
  const [logs, setLogs] = useState(["[SYSTEM] HCI TERMINAL READY. BOOTING IN ZERO MODE."]);
  const [command, setCommand] = useState("");
  
  const [hciActive, setHciActive] = useState(false); 
  const [internetActive, setInternetActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false); 
  const [isSurging, setIsSurging] = useState(false); 
  const [psychReport, setPsychReport] = useState(null);

  const hciActiveRef = useRef(false);
  const internetActiveRef = useRef(false);

  useEffect(() => { 
    hciActiveRef.current = hciActive; 
    internetActiveRef.current = internetActive;
  }, [hciActive, internetActive]);

  useEffect(() => {
    if (recognitionRef.current) {
      if (hciActive) {
        try { recognitionRef.current.start(); } catch (err) {}
      } else {
        try { recognitionRef.current.stop(); } catch (err) {}
      }
    }
  }, [hciActive]);

  let theme = '#00ffcc'; 
  if (hciActive) theme = internetActive ? '#ff3300' : '#ff00ff';

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  // --- HIGH-RES FFT VISUALIZER ---
  const startAudioAnalyzer = (stream) => {
    audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    analyserRef.current = audioCtxRef.current.createAnalyser();
    analyserRef.current.fftSize = 2048; 
    analyserRef.current.smoothingTimeConstant = 0.85; 
    
    const source = audioCtxRef.current.createMediaStreamSource(stream);
    source.connect(analyserRef.current);
    
    const bufferLength = analyserRef.current.frequencyBinCount;
    audioDataRef.current = new Uint8Array(bufferLength);

    const analyzeAudio = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(audioDataRef.current);
        
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) { sum += audioDataRef.current[i]; }
        const avgVolume = sum / bufferLength;

        let tone = "SILENT";
        if (avgVolume > 40) tone = "STRESSED / LOUD";
        else if (avgVolume > 15) tone = "ELEVATED";
        else if (avgVolume > 2) tone = "CALM";

        setBiometrics(p => ({ ...p, tone: tone }));
        currentBio.current.tone = tone; 
        
        if (hciActiveRef.current && fftCanvasRef.current) {
            const canvas = fftCanvasRef.current;
            const ctx = canvas.getContext('2d');
            
            canvas.width = canvas.parentElement.clientWidth;
            canvas.height = 120;
            
            const w = canvas.width;
            const h = canvas.height;
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fillRect(0, 0, w, h);
            
            ctx.lineWidth = 4;
            ctx.strokeStyle = theme;
            ctx.beginPath();
            
            const sliceWidth = w * 1.0 / bufferLength;
            let x = 0;
            
            for (let i = 0; i < bufferLength; i++) {
                let v = (audioDataRef.current[i] / 255.0) * 1.2; 
                if (v > 1) v = 1;
                const y = h - (v * h); 
                
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
                x += sliceWidth;
            }
            
            ctx.stroke();
            ctx.lineTo(w, h);
            ctx.lineTo(0, h);
            ctx.fillStyle = `${theme}22`;
            ctx.fill();
        }
        requestAnimationFrame(analyzeAudio);
    };
    analyzeAudio();
  };

  // --- HARDWARE INITIALIZATION ---
  const initializeSystem = async () => {
    setBootState('CONNECTING');
    setBootError('');

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: "user" }, 
            audio: { 
                echoCancellation: true,   
                noiseSuppression: true,   
                autoGainControl: true,    
                sampleRate: 44100 
            } 
        });
        
        micStreamRef.current = stream;

        const smartLocateFile = (file) => {
            if (file.startsWith('face_mesh')) return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`; 
        };

        const hands = new Hands({ locateFile: smartLocateFile });
        hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.8, minTrackingConfidence: 0.8 });

        const faceMesh = new FaceMesh({ locateFile: smartLocateFile });
        faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.7, minTrackingConfidence: 0.7 });

        await hands.initialize();
        await faceMesh.initialize();

        if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.onloadedmetadata = () => { 
                videoRef.current.play(); 
                
                const loop = async () => { 
                    if (videoRef.current && videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
                        try {
                            if (!hciActiveRef.current) {
                                await Promise.all([
                                    hands.send({ image: videoRef.current }),
                                    faceMesh.send({ image: videoRef.current })
                                ]);
                            }
                        } catch (err) {}
                    }
                    requestAnimationFrame(loop); 
                }; 
                setTimeout(() => { loop(); }, 500); 
            };
        }

        faceMesh.onResults(res => {
            if (!hudCanvasRef.current || !videoRef.current) return;
            const ctx = hudCanvasRef.current.getContext('2d');
            if (hciActiveRef.current) { ctx.clearRect(0,0,hudCanvasRef.current.width,hudCanvasRef.current.height); return; }

            if (res.multiFaceLandmarks && res.multiFaceLandmarks.length > 0) {
                const face = res.multiFaceLandmarks[0];
                ctx.save(); ctx.translate(hudCanvasRef.current.width, 0); ctx.scale(-1, 1);
                ctx.restore();

                const mouthOpen = Math.abs(face[13].y - face[14].y);
                const smileWidth = Math.abs(face[61].x - face[291].x);
                const faceWidth = Math.abs(face[234].x - face[454].x);

                let expression = "NEUTRAL";
                if (mouthOpen / faceWidth > 0.15) expression = "SURPRISED / TALKING";
                else if (smileWidth / faceWidth > 0.45) expression = "SMILING";

                setBiometrics(p => ({ ...p, face: expression }));
                currentBio.current.face = expression; 
            } else {
                setBiometrics(p => ({ ...p, face: "NO TARGET" }));
                currentBio.current.face = "NO TARGET";
            }
        });

        hands.onResults(res => {
            if (!hudCanvasRef.current || !videoRef.current) return;
            const ctx = hudCanvasRef.current.getContext('2d');
            
            hudCanvasRef.current.width = videoRef.current.videoWidth;
            hudCanvasRef.current.height = videoRef.current.videoHeight;
            
            ctx.save(); ctx.clearRect(0,0,hudCanvasRef.current.width,hudCanvasRef.current.height);
            ctx.translate(hudCanvasRef.current.width,0); ctx.scale(-1,1); 
            
            if (hciActiveRef.current) { ctx.restore(); return; }

            if (res.multiHandLandmarks && res.multiHandLandmarks.length > 0) {
                const lm = res.multiHandLandmarks[0];
                const dx = (lm[9].x - lm[0].x) * hudCanvasRef.current.width;
                const dy = (lm[9].y - lm[0].y) * hudCanvasRef.current.height;
                const handPixelSize = Math.sqrt(dx * dx + dy * dy);
                const lineWeight = Math.max(4, handPixelSize * 0.08); 

                ctx.shadowColor = theme; ctx.shadowBlur = 15; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
                drawConnectors(ctx, lm, HAND_CONNECTIONS, { color: theme, lineWidth: lineWeight });
                ctx.shadowBlur = 0; 
                drawLandmarks(ctx, lm, { color: '#ffffff', fillColor: '#000000', lineWidth: Math.max(2, lineWeight * 0.4), radius: lineWeight * 0.8 });
                
                setUi(p => (p.gesture === "SEARCHING..." ? { ...p, gesture: "SCANNING..." } : p));

                const now = Date.now();
                if (now - lastSent.current > 50 && socketRef.current?.readyState === WebSocket.OPEN) { 
                    socketRef.current.send(JSON.stringify({ intent: "check_gesture", landmarks: lm }));
                    lastSent.current = now;
                }
            } else { 
                setUi(p => (p.gesture !== "SEARCHING..." ? { ...p, gesture: "SEARCHING..." } : p));
            }
            ctx.restore();
        });

        startAudioAnalyzer(stream);
        setupSpeechRecognition();
        setupWebSocket();
        setBootState('ACTIVE'); 

    } catch (err) {
        console.error(">>> MEDIA DEVICES ERROR:", err.name, err.message);
        setBootError(`${err.name}: ${err.message}`);
        setBootState('ERROR');
    }
  };

  // --- V2V PING-PONG RECOGNITION (VERBAL GATEKEEPER INCLUDED) ---
  const setupSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        
        recognitionRef.current.continuous = true; 
        recognitionRef.current.interimResults = true; 
        recognitionRef.current.lang = 'en-US';

        recognitionRef.current.onstart = () => {
            console.log("[MIC] Engaged and listening...");
            transcriptBufferRef.current = ""; 
        };

        recognitionRef.current.onresult = (event) => {
            if (isSpeakingRef.current) return;

            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
                else interimTranscript += event.results[i][0].transcript;
            }

            const liveText = (finalTranscript + interimTranscript).toLowerCase().trim();
            
            if (hciActiveRef.current) setCommand(liveText);
            
            if (liveText.includes('halt') && hciActiveRef.current) {
                clearTimeout(silenceTimerRef.current);
                if (!haltTriggeredRef.current) {
                    window.speechSynthesis.cancel(); 
                    if (socketRef.current?.readyState === WebSocket.OPEN) {
                        socketRef.current.send(JSON.stringify({ intent: "halt_generation" })); 
                    }
                    setLogs(p => [...p, `[SYS] VOCAL OVERRIDE 'HALT' DETECTED. AI SILENCED.`]);
                    haltTriggeredRef.current = true; 
                }
                setCommand("");
                return;
            }

            haltTriggeredRef.current = false;

            clearTimeout(silenceTimerRef.current);
            
            if (liveText.length > 0) {
                silenceTimerRef.current = setTimeout(() => {
                    const finalPayload = liveText.trim();
                    setCommand(""); 
                    
                    if (finalPayload === '') return;

                    // --- THE VERBAL GATEKEEPER ---
                    const cleanedText = finalPayload.replace(/[^a-z0-9\s]/gi, '').toLowerCase().trim();
                    const fillerWords = ["um", "uh", "hmm", "hm", "ah", "huh", "a", "i", "oh"];
                    
                    if (cleanedText.length <= 1 || fillerWords.includes(cleanedText)) {
                        console.log(`[MIC] Ignored non-verbal noise: "${finalPayload}"`);
                        setLogs(p => [...p, `[SYS] FILTERED NOISE: "${finalPayload}"`]);
                        
                        try { recognitionRef.current.stop(); } catch(e){}
                        return;
                    }
                    // -----------------------------

                    console.log("[MIC] Valid human speech detected. Sending to AI...");

                    setIsProcessing(true);
                    isProcessingRef.current = true; 
                    setLogs(p => [...p, `[AUDIO_LINK] ${finalPayload}`]);

                    try { recognitionRef.current.stop(); } catch(e){}

                    if (socketRef.current?.readyState === WebSocket.OPEN) {
                      socketRef.current.send(JSON.stringify({ 
                          intent: "command", text: finalPayload, hciActive: true, internetActive: internetActiveRef.current 
                      }));
                    } else {
                      setLogs(p => [...p, "[CRITICAL] CANNOT SEND: WEBSOCKET IS OFFLINE."]);
                      isProcessingRef.current = false; 
                    }
                }, 2000); 
            }
        };

        recognitionRef.current.onend = () => {
            console.warn("[MIC] Session ended / Silence triggered.");
            if (hciActiveRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
                console.log("[MIC] Re-engaging for next command...");
                setTimeout(() => { try { recognitionRef.current.start(); } catch(e) {} }, 250);
            }
        };

        recognitionRef.current.onerror = (e) => {
            console.error(">>> [MIC CRITICAL ERROR] <<< :", e.error);
            if (e.error === 'no-speech' || e.error === 'network' || e.error === 'audio-capture') {
                if (hciActiveRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
                    setTimeout(() => { try { recognitionRef.current.start(); } catch(err){} }, 1000);
                }
            }
        };
    }
  };

  // --- SELF-HEALING WEBSOCKET ---
  const setupWebSocket = () => {
    setLogs(p => [...p, "[SYS] PINGING LOCALHOST:8000. WAITING FOR AI CORES TO MOUNT..."]);
    
    const connect = () => {
        socketRef.current = new WebSocket("ws://localhost:8000/ws/predict");
        
        socketRef.current.onopen = () => { 
            setLogs(p => [...p, "[SYS] WEBSOCKET NEURAL LINK ESTABLISHED."]); 
        };
        
        socketRef.current.onerror = (error) => { 
            console.warn(">> Socket refused (Server likely still loading models...)"); 
        };
        
        socketRef.current.onclose = () => { 
            setLogs(p => [...p, "[SYS] LINK REFUSED/SEVERED. RETRYING IN 3 SECONDS..."]); 
            setTimeout(connect, 3000);
        };

        socketRef.current.onmessage = (e) => {
            const d = JSON.parse(e.data);
            if (d.text) {
                setIsProcessing(false); 
                isProcessingRef.current = false; 
                setLogs(p => [...p, `[${d.tier || 'AI'}] ${d.text}`]); 
                speak(d.text);
                if (d.status === "TRANSPOSED") { setIsSurging(true); setTimeout(() => setIsSurging(false), 3000); }
            }
            if (d.gesture && !hciActiveRef.current && d.gesture !== "SCANNING..." && d.gesture !== "SEARCHING...") {
                setUi(p => ({ ...p, gesture: d.gesture }));
                const now = Date.now();
                if (now - lastGestureTime.current > 2000) {
                    setLogs(p => [...p, `[HCI] GESTURE_DETECTED: ${d.gesture.toUpperCase()}`]);
                    lastGestureTime.current = now; 
                }
            }
        };
    };
    connect();
  };

  useEffect(() => {
    if (bootState !== 'ACTIVE') return;
    const sampler = setInterval(() => {
        if (!hciActiveRef.current && currentBio.current.face !== "SCANNING..." && currentBio.current.face !== "NO TARGET") {
            bioHistory.current.push({ face: currentBio.current.face, tone: currentBio.current.tone });
            if (bioHistory.current.length > 300) bioHistory.current.shift();
        }
    }, 1000);
    return () => clearInterval(sampler);
  }, [bootState]);

  const generateProceduralAnalysis = (face, tone, duration) => {
    let text = `Subject has been continuously monitored for ${duration} seconds. `;
    if (face === "NEUTRAL" && tone === "SILENT") text += "Indicators suggest a deeply regulated autonomic nervous system. Subject is currently operating in a high-focus 'flow state'.";
    else if (face === "SMILING") text += "Subject exhibits elevated dopamine markers and low cortisol resistance. Psychological state is receptive, relaxed.";
    else if (face === "SURPRISED / TALKING" || tone !== "SILENT") text += "Subject is actively processing high-bandwidth external stimuli. Verbal and associative processing centers are highly engaged.";
    else text += "Baseline neural patterns detected. Subject maintains operational stability with standard homeostatic variance.";
    return text;
  };

  const triggerDeepEvaluation = () => {
    if (bioHistory.current.length < 5) {
        setLogs(p => [...p, "[SYS] INSUFFICIENT BIOMETRIC DATA FOR EVALUATION."]);
        speak("Insufficient data for evaluation. Need 5 seconds of telemetry.", true);
        return;
    }
    setPsychReport("COMPILING");
    setLogs(p => [...p, `[SYS] INITIATING DEEP PSYCHOLOGICAL PROFILE...`]);
    speak(`Initiating psychological compile. Please stand by.`, true);

    const faceCounts = {}; const toneCounts = {};
    bioHistory.current.forEach(b => { faceCounts[b.face] = (faceCounts[b.face] || 0) + 1; toneCounts[b.tone] = (toneCounts[b.tone] || 0) + 1; });
    const dominantFace = Object.keys(faceCounts).reduce((a, b) => faceCounts[a] > faceCounts[b] ? a : b);
    const dominantTone = Object.keys(toneCounts).reduce((a, b) => toneCounts[a] > toneCounts[b] ? a : b);
    
    const calcStress = dominantTone === "STRESSED / LOUD" ? Math.floor(Math.random() * 20) + 75 : Math.floor(Math.random() * 30) + 10;
    const calcLoad = dominantFace === "SURPRISED / TALKING" ? Math.floor(Math.random() * 30) + 60 : Math.floor(Math.random() * 40) + 20;
    const duration = bioHistory.current.length;
    const analysisText = generateProceduralAnalysis(dominantFace, dominantTone, duration);

    setTimeout(() => {
        setPsychReport({ face: dominantFace, tone: dominantTone, duration: duration, stress: calcStress, load: calcLoad, analysis: analysisText });
        setLogs(p => [...p, `[PSYCH-EVAL] COMPILATION COMPLETE.`]);
        speak(`Psychological evaluation complete. Displaying biometric rendering.`, true);
        bioHistory.current = []; 
    }, 3500); 
  };

  // --- DSA OPTIMIZATION: SQUARED DISTANCE RENDER LOOP ---
  useEffect(() => {
    const canvas = neuralCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let frameId;
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    const pts = Array.from({ length: 50 }, () => ({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, vx: (Math.random() - 0.5) * 1, vy: (Math.random() - 0.5) * 1, s: Math.random() * 2 + 1 }));

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const mult = isSurging ? 15 : (isProcessing ? 8 : 1);
      const connectionThresholdSq = 32400; 

      for (let i = 0; i < pts.length; i++) {
        let p = pts[i];
        p.x += p.vx * mult; p.y += p.vy * mult;
        if (p.x < 0 || p.x > canvas.width) p.vx *= -1; 
        if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
        
        ctx.beginPath(); ctx.arc(p.x, p.y, p.s, 0, Math.PI * 2);
        ctx.fillStyle = isSurging ? '#ff0000' : (isProcessing ? '#fff' : theme + '33'); ctx.fill();
        
        for (let j = i + 1; j < pts.length; j++) {
          const dx = p.x - pts[j].x;
          const dy = p.y - pts[j].y;
          const distSq = (dx * dx) + (dy * dy);
          
          if (distSq < connectionThresholdSq) {
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = isSurging ? '#ff0000' : (isProcessing ? theme : theme + '11');
            ctx.lineWidth = isSurging ? 3 : 1.0; 
            ctx.stroke();
          }
        }
      }
      frameId = requestAnimationFrame(animate);
    };
    animate(); 
    return () => cancelAnimationFrame(frameId);
  }, [theme, isProcessing, isSurging]);

  // --- TRUE HALF-DUPLEX NUKE SPEAK FUNCTION ---
  const speak = (txt, force = false, isGesture = false) => {
    if (!hciActiveRef.current && !force && !isGesture) return; 
    window.speechSynthesis.cancel(); 

    // 1. Lock the software flags
    isSpeakingRef.current = true;

    // 2. THE NUKE: Physically detach the listener so it CANNOT hear the AI
    if (recognitionRef.current) {
        recognitionRef.current.onresult = null; 
        try { recognitionRef.current.abort(); } catch(e) {}
    }

    // 3. Mute the visualizer hardware
    if (micStreamRef.current) {
        micStreamRef.current.getAudioTracks().forEach(track => track.enabled = false);
    }

    const u = new SpeechSynthesisUtterance(txt);
    if (isGesture) { u.pitch = 1.6; u.rate = 1.2; } 
    else { u.pitch = hciActiveRef.current ? 0.6 : 1.0; u.rate = 1.1; }

    // 4. UNMUTE & REBUILD: Wait 800ms for room echoes to die, then reconstruct
    u.onend = () => {
        setTimeout(() => {
            if (micStreamRef.current) {
                micStreamRef.current.getAudioTracks().forEach(track => track.enabled = true);
            }
            
            isSpeakingRef.current = false;
            
            // Rebuild the listener from scratch now that the room is quiet
            if (hciActiveRef.current && !isProcessingRef.current) {
                setupSpeechRecognition(); 
                try { recognitionRef.current.start(); } catch (err) {}
            }
        }, 800); 
    };

    window.speechSynthesis.speak(u);
  };

  const handleExecute = () => {
    if (!command.trim()) return;
    const cmd = command.trim().toLowerCase();
    
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();

    const triggerHardPurge = () => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify({ intent: "purge_memory" }));
        }
        if (recognitionRef.current) recognitionRef.current.abort(); 
    };

    if (cmd === "requiem") { 
        triggerHardPurge();
        setHciActive(true); setInternetActive(false); setPsychReport(null); 
        setLogs(p => [...p, "[SYS] DIVERTING RESOURCES TO LOCAL TINYLLAMA & QWEN CORES."]);
        speak("Requiem protocol activated. Optical systems suspended. Secure local language models are listening.", true); 
        setCommand(""); return; 
    }
    if (cmd === "zero requiem") { 
        triggerHardPurge();
        setHciActive(true); setInternetActive(true); setPsychReport(null); 
        setLogs(p => [...p, "[SYS] INITIATING ZERO REQUIEM. OMNI-LINK PROTOCOL ONLINE. EXTERNAL NETWORK ACCESS GRANTED."]);
        speak("Zero Requiem protocol engaged. Optical systems suspended. Global network link established.", true); 
        setCommand(""); return; 
    }
    if (cmd === "zero") { 
        triggerHardPurge();
        setHciActive(false); setInternetActive(false); 
        speak("Zero protocol engaged. Optical tracking online.", true); 
        setCommand(""); return; 
    }
    if (cmd === "evaluate" || cmd === "psych" || cmd === "status") {
        if (hciActive) { setLogs(p => [...p, "[SYS] CANNOT EVALUATE: OPTICAL TRACKING IS SUSPENDED."]); speak("Cannot evaluate biometrics while vision systems are offline.", true); setCommand(""); return; }
        triggerDeepEvaluation(); setCommand(""); return;
    }

    if (!hciActive) { setLogs(p => [...p, "[SYS] AI CORE OFFLINE. ENTER 'requiem' OR 'zero requiem' TO ELEVATE LINK."]); setCommand(""); return; }

    setIsProcessing(true);
    isProcessingRef.current = true; 
    setLogs(p => [...p, `[USER] ${command}`]);
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ intent: "command", text: command, hciActive: true, internetActive: internetActive }));
    } else {
      setLogs(p => [...p, "[CRITICAL] CANNOT SEND: WEBSOCKET IS OFFLINE."]);
      isProcessingRef.current = false;
    }
    setCommand("");
  };

  // ==========================================================================
  // RENDER: RESPONSIVE CSS + OVERLAY ARCHITECTURE
  // ==========================================================================
  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body, html { margin: 0; padding: 0; overflow: hidden; background: #000; width: 100vw; height: 100vh; font-family: monospace; }
        
        .surge { box-shadow: inset 0 0 150px rgba(255,0,0,0.5); animation: s-pulse 0.4s infinite alternate; } 
        @keyframes s-pulse { from { opacity: 0.8; } to { opacity: 1; } }
        
        /* --- MOBILE FIRST (Stacking) --- */
        .terminal-wrapper { box-sizing: border-box; width: 95vw; height: 95vh; display: flex; flex-direction: column; gap: 15px; border: 1px solid ${theme}33; padding: 10px; background: rgba(0,0,0,0.92); z-index: 1; backdrop-filter: blur(10px); }
        .main-layout { display: flex; flex-direction: column; gap: 15px; flex: 1; overflow: hidden; position: relative; }
        .col-visuals { display: flex; flex-direction: column; gap: 10px; flex: 1; min-height: 40vh; }
        .col-logs { display: flex; flex-direction: column; min-height: 25vh; background: rgba(2,2,2,0.8); border: 1px solid #1a1a1a; padding: 15px; overflow-y: auto; }
        
        .header-container { display: flex; flex-direction: column; gap: 10px; border-bottom: 2px solid ${theme}; padding-bottom: 10px; }
        .header-title { font-size: 1.2rem; margin: 0; }
        .header-status { font-size: 0.8rem; justify-content: flex-start; }
        
        .terminal-input-container { display: flex; flex-direction: column; padding: 10px; gap: 10px; }
        .prompt-text { font-size: 1rem; }
        .input-box { font-size: 1rem; }
        .prompt-placeholder { font-size: 1rem !important; }
        .exec-btn { padding: 5px 15px; font-size: 0.9rem; }
        .terminal-status { font-size: 0.7rem; }
        
        .fft-container { width: 95%; max-width: 500px; margin: 0 auto; }

        /* --- DESKTOP REVERSION (Exactly like previous UI) --- */
        @media (min-width: 900px) {
            .terminal-wrapper { height: 90vh; padding: 20px; gap: 20px; }
            .header-container { flex-direction: row; justify-content: space-between; align-items: center; }
            .header-title { font-size: 2em; font-weight: bold; margin-top: 0.67em; margin-bottom: 0.67em; }
            .header-status { font-size: 1rem; justify-content: flex-end; }
            
            /* Restores the strict 1.4fr / 0.6fr layout */
            .main-layout { display: grid; grid-template-columns: 1.4fr 0.6fr; gap: 25px; flex-direction: row; }
            .col-visuals { gap: 15px; min-height: 0; }
            .col-logs { min-height: 0; padding: 20px; }
            
            /* Restores horizontal input bar */
            .terminal-input-container { flex-direction: row; padding: 15px; gap: 15px; align-items: center; }
            .prompt-text { font-size: 1.2rem; }
            .input-box { font-size: 1.2rem; }
            .prompt-placeholder { font-size: 1.2rem !important; }
            .exec-btn { padding: 0 25px; font-size: 1rem; }
            .terminal-status { font-size: 0.8rem; }
            
            .fft-container { width: 500px; }
        }
      `}</style>

      {/* --- BOOT SCREEN OVERLAY --- */}
      {bootState !== 'ACTIVE' && (
        <div style={{ position: 'fixed', top: 0, left: 0, zIndex: 9999, height: '100vh', width: '100vw', background: '#050505', color: theme, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ border: `2px solid ${theme}`, padding: '30px', maxWidth: '600px', width: '90%', background: 'rgba(0,0,0,0.8)', boxShadow: `0 0 30px ${theme}33`, position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '3px', background: theme, animation: 'scanline 2s linear infinite' }}></div>
            <h1 style={{ borderBottom: `2px solid ${theme}`, paddingBottom: '10px', letterSpacing: '2px', marginTop: 0, fontSize: '1.5rem' }}>SYNAPSE // TERMINAL_INIT</h1>
            <div style={{ margin: '20px 0', lineHeight: '1.8', color: '#ccc', fontSize: '1rem' }}>
              <p><span style={{ color: theme, fontWeight: 'bold' }}>SYS_ADMIN:</span> CHARAN</p>
              <p><span style={{ color: theme, fontWeight: 'bold' }}>PROTOCOL:</span> ZERO_REQUIEM</p>
              <p><span style={{ color: theme, fontWeight: 'bold' }}>REQUIREMENT:</span> OPTICAL & VOCAL TELEMETRY</p>
            </div>
            {bootState === 'ERROR' && (
              <div style={{ border: '2px solid #ff3300', background: 'rgba(255,51,0,0.1)', padding: '15px', color: '#ff3300', marginBottom: '25px', lineHeight: '1.4' }}>
                <strong>[CRITICAL] HARDWARE DENIED</strong><br/><span style={{ fontSize: '0.85rem' }}>{bootError}</span>
              </div>
            )}
            <button onClick={initializeSystem} disabled={bootState === 'CONNECTING'} style={{ width: '100%', padding: '15px', background: bootState === 'CONNECTING' ? '#222' : theme, color: bootState === 'CONNECTING' ? theme : '#000', border: `2px solid ${theme}`, fontSize: '1.1rem', fontWeight: 'bold', fontFamily: 'monospace', cursor: bootState === 'CONNECTING' ? 'not-allowed' : 'pointer', letterSpacing: '2px', transition: 'all 0.2s' }}>
              {bootState === 'CONNECTING' ? '[ ALLOCATING HARDWARE... ]' : '[ GRANT SYSTEM ACCESS ]'}
            </button>
          </div>
        </div>
      )}

      {/* --- MAIN TERMINAL --- */}
      <div className={isSurging ? 'surge' : ''} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', width: '100vw', color: theme, position: 'relative' }}>
        <canvas ref={neuralCanvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }} />
        
        <div className="terminal-wrapper">
          
          <header className="header-container">
            <h1 className="header-title">SYNAPSE // {!hciActive ? 'ZERO_STANDBY' : (internetActive ? 'OMNILINK' : 'REQUIEM_ELEVATED')}</h1>
            <div className="header-status" style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '10px' }}> 
              {hciActive && <div style={{ width: '10px', height: '10px', background: theme, borderRadius: '50%', animation: 'pulseNode 1s infinite' }}></div>}
              {!hciActive ? 'LLM: OFF | VISION: ACTIVE' : (internetActive ? <span style={{color: theme}}>NET_ACTIVE | VISION: OFF</span> : <span style={{color: theme}}>LOCAL_SECURE | VISION: OFF</span>)}
            </div>
          </header>

          <main className="main-layout">
            
            {/* LEFT COLUMN: Visuals + Input */}
            <div className="col-visuals">
              
              <div style={{ position: 'relative', border: `1px solid ${theme}`, background: '#080808', flex: 1, overflow: 'hidden' }}>
                
                {/* 1. ALWAYS MOUNTED MEDIA */}
                <video 
                    ref={videoRef} 
                    muted 
                    playsInline 
                    style={{ 
                        width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)',
                        display: hciActive ? 'none' : 'block' 
                    }} 
                />
                <canvas 
                    ref={hudCanvasRef} 
                    style={{ 
                        position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none',
                        display: hciActive ? 'none' : 'block'
                    }} 
                />
                
                {/* 2. OPTICAL STATUS HUD */}
                {!hciActive && (
                  <div style={{ position: 'absolute', bottom: 10, left: 10, background: 'rgba(0,0,0,0.9)', padding: '10px', borderLeft: `4px solid ${theme}` }}>
                    STATUS: <span style={{color: '#fff', fontSize: '1rem'}}>{ui.gesture.toUpperCase()}</span>
                  </div>
                )}

                {/* 3. REQUIEM MODE OVERLAY */}
                {hciActive && (
                  <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: internetActive ? '#050100' : '#050005', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: theme, textAlign: 'center', padding: '10px', zIndex: 2 }}>
                      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: `radial-gradient(circle, ${internetActive ? 'rgba(255,51,0,0.05)' : 'rgba(255,0,255,0.05)'} 0%, rgba(0,0,0,0) 70%)`, animation: 's-pulse 2s infinite alternate' }}></div>
                      <div style={{ position: 'relative', zIndex: 2, width: '100%' }}>
                        <div style={{ fontSize: '1.5rem', letterSpacing: '2px', marginBottom: '10px', textShadow: `0 0 10px ${theme}`, fontWeight: 'bold' }}>{internetActive ? 'GLOBAL_NETWORK_LINK' : 'NEURAL_LINK_ESTABLISHED'}</div>
                        <div style={{ border: `1px solid ${theme}55`, padding: '15px', background: `rgba(${internetActive ? '255,51,0' : '255,0,255'},0.05)`, maxWidth: '90%', margin: '0 auto' }}>
                            <div style={{ color: '#888', fontSize: '0.8rem', lineHeight: '1.5' }}>
                                [!] VISION SUSPENDED<br/>[!] CORES DIVERTED TO LLM<br/>
                                {internetActive && <span style={{color: theme, fontWeight: 'bold'}}>[!] EXTERNAL ROUTING ON</span>}
                            </div>
                        </div>
                        <div style={{ marginTop: '20px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ fontSize: '0.8rem', color: theme, opacity: 0.7, marginBottom: '5px' }}>VOCAL_INPUT_STREAM_ACTIVE</div>
                            <div className="fft-container">
                                <canvas ref={fftCanvasRef} style={{ width: '100%', height: '120px', borderBottom: `2px solid ${theme}55` }} />
                            </div>
                        </div>
                      </div>
                  </div>
                )}

                {/* 4. PASSIVE BIOMETRICS */}
                <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.8)', padding: '10px', borderRight: `4px solid ${theme}`, textAlign: 'right', fontSize: '0.75rem', display: 'flex', flexDirection: 'column', gap: '5px', zIndex: 5 }}>
                  <div style={{ marginBottom: '5px', color: '#888' }}>// BIOMETRICS</div>
                  <div>FACE: <span style={{color: '#fff'}}>{biometrics.face}</span></div>
                  <div>TONE: <span style={{color: '#fff'}}>{biometrics.tone}</span></div>
                  <button onClick={triggerDeepEvaluation} style={{ marginTop: '5px', background: theme, color: '#000', border: 'none', padding: '5px 8px', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'monospace' }}>PSYCH-EVAL</button>
                </div>

                {/* 5. PSYCH REPORT OVERLAY */}
                {psychReport && (
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(5px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10, padding: '10px' }}>
                        {psychReport === "COMPILING" ? (
                          <div style={{ border: `2px solid ${theme}`, background: '#0a0a0a', padding: '30px', width: '90%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxShadow: `0 0 30px ${theme}44` }}>
                              <div style={{ width: '40px', height: '40px', borderTop: `4px solid ${theme}`, borderRight: `4px solid ${theme}`, borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: '20px' }}></div>
                              <h3 style={{ margin: 0, color: theme, letterSpacing: '2px', animation: 'blink 1s infinite' }}>ANALYZING...</h3>
                          </div>
                        ) : (
                          <div style={{ border: `2px solid ${theme}`, background: '#0a0a0a', padding: '20px', width: '95%', maxWidth: '700px', maxHeight: '95%', overflowY: 'auto', boxShadow: `0 0 30px ${theme}44` }}>
                              <h2 style={{ borderBottom: `2px solid ${theme}`, paddingBottom: '10px', marginTop: 0, letterSpacing: '1px', fontSize: '1.2rem' }}>[ PSYCH_PROFILE ]</h2>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginTop: '15px' }}>
                                  <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                      <BiometricFaceDrawing expression={psychReport.face} theme={theme} />
                                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        <div style={{ width: '100%', fontSize: '0.8rem' }}><div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff' }}><span>STRESS</span><span>{psychReport.stress}%</span></div><div style={{ height: '6px', background: '#222', width: '100%', marginTop: '3px' }}><div style={{ height: '100%', width: `${psychReport.stress}%`, background: psychReport.stress > 60 ? '#f00' : theme }}></div></div></div>
                                        <div style={{ width: '100%', fontSize: '0.8rem' }}><div style={{ display: 'flex', justifyContent: 'space-between', color: '#fff' }}><span>LOAD</span><span>{psychReport.load}%</span></div><div style={{ height: '6px', background: '#222', width: '100%', marginTop: '3px' }}><div style={{ height: '100%', width: `${psychReport.load}%`, background: psychReport.load > 70 ? '#ffcc00' : theme }}></div></div></div>
                                      </div>
                                  </div>
                                  <div style={{ display: 'flex', flexDirection: 'column', color: '#ccc' }}>
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', borderBottom: '1px solid #333', paddingBottom: '15px' }}>
                                          <div><strong style={{color: theme, display: 'block', fontSize: '0.7rem'}}>DOMINANT_EXPRESSION</strong> {psychReport.face}</div>
                                          <div><strong style={{color: theme, display: 'block', fontSize: '0.7rem'}}>VOCAL_BASELINE</strong> {psychReport.tone}</div>
                                      </div>
                                      <div style={{ marginTop: '15px', padding: '15px', background: 'rgba(255,255,255,0.03)', borderLeft: `4px solid ${theme}`, fontSize: '0.85rem', lineHeight: '1.5', fontFamily: 'sans-serif' }}>{psychReport.analysis}</div>
                                  </div>
                              </div>
                              <button onClick={() => setPsychReport(null)} style={{ marginTop: '20px', width: '100%', background: theme, color: '#000', border: 'none', padding: '12px', fontWeight: 'bold', cursor: 'pointer', letterSpacing: '2px', transition: 'all 0.2s', fontFamily: 'monospace' }}>DISMISS_REPORT</button>
                          </div>
                        )}
                    </div>
                )}
              </div>

              <TerminalInput command={command} setCommand={setCommand} onExecute={handleExecute} theme={theme} hciActive={hciActive} internetActive={internetActive} />
            </div>

            {/* RIGHT COLUMN: Logs */}
            <div className="col-logs">
              <p style={{ flexShrink: 0, color: '#444', borderBottom: '1px solid #1a1a1a', paddingBottom: '5px', letterSpacing: '1px' }}>SYSTEM_TELEMETRY_LOG</p>
              {logs.map((l, i) => <div key={i} style={{ marginTop: '10px', fontSize: '0.8rem', lineHeight: '1.4', opacity: 0.9 }}>{l}</div>)}
              <div ref={logsEndRef} style={{ flexShrink: 0 }} />
            </div>

          </main>
        </div>
      </div>
    </>
  );
};

export default App;