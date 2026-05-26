/**
 * VoiceContext.jsx — RetailFlow AI Voice Layer v4
 * ─────────────────────────────────────────────────
 * Root cause fixes applied in this version:
 *
 *  Fix A — Rate-limiter 429 blocking the AI endpoint
 *    (Fixed in server.js — 2000 req/10min in dev mode)
 *
 *  Fix B — recognition.abort() firing on every conversation turn
 *    useEffect([recognition, processCommand]) → every history change
 *    recreates processCommand → effect cleanup runs recognition.abort()
 *    → mic silently killed while user was still in the session.
 *    FIX: processCommandRef keeps the useEffect dep list as [recognition]
 *         only. cleanup never runs mid-session.
 *
 *  Fix C — Audio echo / immediate close after speaking
 *    Greeting audio played → onend fired → recognition.start() called
 *    before the speaker finished → mic picked up echo of greeting.
 *    FIX: 650 ms cooldown after greeting.onend before opening mic.
 *
 *  Fix D — Stale startListening inside processCommand callbacks
 *    FIX: startListeningRef always points to latest version.
 *
 *  Fix E — speak() silently dropped callback on TTS error
 *    FIX: onerror also fires onEndCallback.
 */

import {
  createContext, useContext, useState,
  useEffect, useCallback, useRef,
} from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';

const VoiceContext = createContext(null);
export const useVoice = () => useContext(VoiceContext);

/** ms to wait after greeting finishes before opening mic (prevents echo) */
const GREETING_COOLDOWN_MS = 1200;

export const VoiceProvider = ({ children }) => {
  const navigate = useNavigate();

  const [isListening,  setIsListening]  = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking,   setIsSpeaking]   = useState(false);
  const [transcript,   setTranscript]   = useState('');
  const [history,      setHistory]      = useState([]);

  /**
   * Refs that always hold the LATEST function references.
   * This is the pattern that breaks stale closures without causing
   * useEffect to re-run (and call recognition.abort()) on every render.
   */
  const processCommandRef  = useRef(null);
  const startListeningRef  = useRef(null);
  const activeUtteranceRef = useRef(null);
  const noSpeechCountRef   = useRef(0);
  const micStartTimestampRef = useRef(0);
  const gotResultRef         = useRef(false);

  // ── Initialise Speech Recognition once at mount ─────────────────────────
  const [recognition] = useState(() => {
    const API = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!API) return null;
    const rec          = new API();
    rec.continuous     = false;   // single-shot per button press
    rec.lang           = 'hi-IN';
    rec.interimResults = false;
    return rec;
  });

  const [micLang, setMicLang] = useState('hi-IN');

  useEffect(() => {
    if (recognition) {
      recognition.lang = micLang;
      console.log('[Voice] SpeechRecognition language set to:', micLang);
    }
  }, [recognition, micLang]);

  const toggleMicLang = useCallback(() => {
    setMicLang(prev => {
      const next = prev === 'hi-IN' ? 'en-IN' : 'hi-IN';
      setTimeout(() => {
        toast.success(`Mic Language: ${next === 'hi-IN' ? 'Hindi (Hinglish)' : 'English (India)'} 🌐`, { 
          id: 'lang-toast',
          style: {
            background: '#0f172a',
            color: '#f8fafc',
            border: '1px solid rgba(139, 92, 246, 0.4)',
            borderRadius: '12px',
            fontSize: '13px'
          }
        });
      }, 0);
      return next;
    });
  }, []);

  // ── speak() — TTS with guaranteed callback & GC protection ───────────────
  const speak = useCallback((text, onEndCallback) => {
    if (!window.speechSynthesis) {
      if (onEndCallback) onEndCallback();
      return;
    }
    window.speechSynthesis.cancel();

    const u    = new SpeechSynthesisUtterance(text);
    activeUtteranceRef.current = u; // Keep reference to prevent GC bug!
    u.lang     = 'hi-IN';
    u.rate     = 1.05;
    
    const handleEnd = () => {
      console.log('[Voice] TTS speaking ended for:', text.substring(0, 40));
      setIsSpeaking(false);
      activeUtteranceRef.current = null;
      if (onEndCallback) onEndCallback();
    };

    u.onstart  = () => {
      console.log('[Voice] TTS speaking started for:', text.substring(0, 40));
      setIsSpeaking(true);
    };
    u.onend    = handleEnd;
    u.onerror  = (e) => {
      const errType = e.error || e;
      console.warn('[Voice] TTS speaking error:', errType);
      // If the speech was interrupted or canceled (due to cancel()), do not execute the callback
      if (errType !== 'interrupted' && errType !== 'canceled') {
        handleEnd();
      } else {
        console.log('[Voice] TTS canceled/interrupted. Skipping end callback.');
        setIsSpeaking(false);
        activeUtteranceRef.current = null;
      }
    };
    window.speechSynthesis.speak(u);
  }, []);

  // ── handleNoSpeechGracefully() — recovers from silence without crashing ──
  const handleNoSpeechGracefully = useCallback(() => {
    noSpeechCountRef.current += 1;
    console.log('[Voice] Silence detected. Attempt count:', noSpeechCountRef.current);
    
    if (noSpeechCountRef.current < 2) {
      toast('Awaaz nahi aayi... Firse sunn raha hoon 🎙️', { 
        id: 'voice-retry', 
        duration: 4000,
        style: {
          background: '#1e1b4b',
          color: '#e0e7ff',
          border: '1px solid #4338ca'
        }
      });
      // Play a quick Hinglish voice nudge to keep conversation alive
      speak("Mujhe kuch sunayi nahi diya. Firse boliye?", () => {
        // Automatically restart mic skipping greeting
        if (startListeningRef.current) {
          startListeningRef.current(true); // skipGreeting = true
        }
      });
    } else {
      toast.error('Awaaz nahi aayi. Please button daba kar firse koshish karein.', { id: 'voice-no-speech' });
      speak("Koshish kamyab nahi hui. Please button daba kar firse try karein.");
      noSpeechCountRef.current = 0; // reset
    }
  }, [speak]);

  // ── openMic() — safe recognition.start() ────────────────────────────────
  const openMic = useCallback(() => {
    if (!recognition) return;
    try {
      console.log('[Voice] Starting SpeechRecognition (mic active)...');
      micStartTimestampRef.current = Date.now();
      gotResultRef.current = false;
      recognition.start();
      setIsListening(true);
    } catch (e) {
      // DOMException "already started" — safe to ignore
      console.warn('[Voice] openMic:', e.message);
    }
  }, [recognition]);

  // ── processCommand() — core AI pipeline ─────────────────────────────────
  const processCommand = useCallback(async (text) => {
    setIsProcessing(true);
    try {
      const currentHistory = [...history, { role: 'User', content: text }].slice(-6);
      const { data: actionData } = await api.post('/ai/assistant', { text, history: currentHistory });

      setHistory([
        ...currentHistory,
        { role: 'Assistant', content: actionData.spokenResponse || 'Done.' },
      ]);

      if (actionData.navigationTarget) navigate(actionData.navigationTarget);

      if (actionData.refreshRequired) {
        toast.success('✅ Done!', { id: 'ai-action', duration: 3000 });
        window.dispatchEvent(new Event('app-data-refresh'));
      }

      // After all speech ends, optionally re-open mic for follow-up
      const onAllDone = () => {
        if (actionData.requiresFollowUp && startListeningRef.current) {
          startListeningRef.current(true); // skipGreeting = true
        }
      };

      // Chain: main response → optional recommendation → onAllDone
      const afterMainResponse = () => {
        if (actionData.recommendation) {
          toast(
            () => (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>💡</span>
                <span>{actionData.recommendation}</span>
              </span>
            ),
            {
              id: 'ai-rec', duration: 8000,
              style: {
                background:   'linear-gradient(135deg,rgba(139,92,246,0.2),rgba(79,70,229,0.2))',
                border:       '1px solid rgba(139,92,246,0.4)',
                color:        '#e2d9f3',
                borderRadius: 12,
                fontSize:     13,
                fontWeight:   500,
              },
            }
          );
          setTimeout(() => speak(actionData.recommendation, onAllDone), 600);
        } else {
          onAllDone();
        }
      };

      if (actionData.spokenResponse) {
        speak(actionData.spokenResponse, afterMainResponse);
      } else {
        afterMainResponse();
      }

    } catch (err) {
      console.error('[Voice] API error:', err);
      const msg = err?.response?.status === 429
        ? 'Bahut saari requests aa rahi hain, thodi der baad try karo.'
        : err?.response?.status === 503
          ? 'AI server busy hai, thodi der mein try karna.'
          : 'Network issue — server se connect nahi ho pa raha.';
      toast.error(msg);
      speak('Sorry, abhi thodi problem aa rahi hai. Phir try karo.');
    } finally {
      setIsProcessing(false);
    }
  }, [history, navigate, speak]); // history dep → processCommand recreated on each turn

  // ── FIX B: keep processCommandRef in sync WITHOUT adding it to the
  //    recognition useEffect dep array (which would trigger abort). ─────────
  useEffect(() => {
    processCommandRef.current = processCommand;
  }, [processCommand]);

  // ── Attach recognition event handlers — dep array is [recognition] ONLY ──
  // Because we use processCommandRef.current, the effect never re-runs due to
  // processCommand changes, so recognition.abort() is only called on unmount.
  useEffect(() => {
    if (!recognition) return;

    recognition.onresult = (event) => {
      const heard = event.results[0][0].transcript;
      console.log('[Voice] Speech recognized:', heard);
      gotResultRef.current = true;
      noSpeechCountRef.current = 0; // Reset silence counter on successful input
      setTranscript(heard);
      processCommandRef.current(heard); // always the latest processCommand
    };

    recognition.onerror = (event) => {
      console.error('[Voice] SpeechRecognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        toast.error('Mic blocked — browser URL bar mein allow karo.', { duration: 6000 });
      } else if (event.error === 'no-speech') {
        setTranscript('');
        handleNoSpeechGracefully(); // Fix: recover gracefully on no-speech
      } else if (event.error === 'network') {
        toast.error('Network error — voice recognition ke liye internet chahiye.');
      }
    };

    recognition.onend = () => {
      console.log('[Voice] SpeechRecognition ended (mic closed).');
      setIsListening(false);
      
      const duration = Date.now() - micStartTimestampRef.current;
      // If it closed in less than 1.5 seconds and we did not get any result, nor did we trigger a graceful silence retry
      if (duration < 1500 && !gotResultRef.current) {
        console.warn('[Voice] Mic closed instantly. Likely hardware mute or permission blockage.');
        toast.error(
          'Mic closed instantly! Please check if your hardware mic is muted (press F4 on Lenovo / check Lenovo Vantage) or Chrome mic permission is blocked.',
          { id: 'mic-instant-close', duration: 8000 }
        );
      }
    };

    return () => { 
      console.log('[Voice] Unmounting: aborting recognition.');
      recognition.abort(); 
    }; // only on unmount now ✅
  }, [recognition, handleNoSpeechGracefully]); // ← recognition and handleNoSpeechGracefully only

  // ── startListening() — called by FAB button ──────────────────────────────
  // skipGreeting = false  → play greeting then open mic  (first press)
  // skipGreeting = true   → open mic directly            (AI follow-up)
  const startListening = useCallback((skipGreeting = false) => {
    if (!recognition) {
      toast.error('Your browser does not support Voice Recognition.');
      return;
    }
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setTranscript('');

    if (!skipGreeting) {
      noSpeechCountRef.current = 0; // Reset silence count on manual click
    }

    // Always delay slightly before opening mic so audio system resets (Fix C)
    const openMicDelayed = (extraMs = 0) => {
      const delay = GREETING_COOLDOWN_MS + extraMs;
      console.log(`[Voice] Delaying mic opening by ${delay}ms...`);
      setTimeout(openMic, delay);
    };

    if (!skipGreeting && window.speechSynthesis) {
      const g = new SpeechSynthesisUtterance(
        "Namaste! Main RetailFlow AI hoon. Sir ya Ma'am, main aapki kya madad kar sakta hoon?"
      );
      activeUtteranceRef.current = g; // Keep reference to prevent GC bug!
      g.lang    = 'hi-IN';
      g.rate    = 1.05;
      g.pitch   = 1.1;
      
      const handleGreetingEnd = () => {
        console.log('[Voice] Greeting speaking ended.');
        setIsSpeaking(false);
        activeUtteranceRef.current = null;
        openMicDelayed();
      };

      g.onstart = () => {
        console.log('[Voice] Greeting speaking started.');
        setIsSpeaking(true);
      };
      g.onend   = handleGreetingEnd;
      g.onerror = (e) => {
        const errType = e.error || e;
        console.warn('[Voice] Greeting speaking error:', errType);
        // Only open the microphone if it wasn't interrupted or canceled by a new speak/cancel call
        if (errType !== 'interrupted' && errType !== 'canceled') {
          handleGreetingEnd();
        } else {
          console.log('[Voice] Greeting canceled/interrupted. Skipping mic open.');
          setIsSpeaking(false);
          activeUtteranceRef.current = null;
        }
      };
      window.speechSynthesis.speak(g);
    } else {
      openMicDelayed(-800); // follow-up: shorter delay (400ms net)
    }
  }, [recognition, openMic]);

  // FIX D: keep startListeningRef in sync
  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  const stopListening = useCallback(() => {
    if (recognition) {
      console.log('[Voice] Explicit stopListening requested.');
      recognition.stop();
      setIsListening(false);
    }
  }, [recognition]);

  return (
    <VoiceContext.Provider value={{
      isListening,
      isProcessing,
      isSpeaking,
      transcript,
      startListening,
      stopListening,
      processCommand,
      micLang,
      toggleMicLang,
      hasSupport: !!recognition,
    }}>
      {children}
    </VoiceContext.Provider>
  );
};
