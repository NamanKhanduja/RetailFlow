import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';

const VoiceContext = createContext(null);

export const useVoice = () => useContext(VoiceContext);

export const VoiceProvider = ({ children }) => {
  const navigate = useNavigate();
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  // Initialize Speech Recognition
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const recognition = SpeechRecognition ? new SpeechRecognition() : null;

  if (recognition) {
    recognition.continuous = false;
    // Set to Hindi (India) to understand Hinglish better
    recognition.lang = 'hi-IN';
    recognition.interimResults = false;
  }

  const speak = (text, onEndCallback) => {
    if (!window.speechSynthesis) return;
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hi-IN'; // Speak in Hindi/Hinglish
    
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => {
      setIsSpeaking(false);
      if (onEndCallback) onEndCallback();
    };
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const processCommand = async (text) => {
    setIsProcessing(true);
    try {
      // 1. Send to our Backend AI Agent
      const response = await api.post('/ai/assistant', { text });
      const actionData = response.data;

      // 2. Handle Navigation if requested
      if (actionData.navigationTarget) {
        navigate(actionData.navigationTarget);
      }

      // 3. Handle Refresh if mutation occurred (e.g., Attendance marked)
      if (actionData.refreshRequired) {
        // We can force a reload of data here. For now, a toast will notify the user.
        toast.success("Action completed successfully", { id: 'ai-action' });
        // Alternatively, we could dispatch a global event or context update.
        window.dispatchEvent(new Event('app-data-refresh'));
      }

      // 4. Speak the response
      if (actionData.spokenResponse) {
        speak(actionData.spokenResponse, () => {
          // 5. Follow up if AI asked a question
          if (actionData.requiresFollowUp) {
            startListening();
          }
        });
      }

    } catch (error) {
      console.error("AI Error:", error);
      toast.error("Network issue reaching AI Assistant");
      speak("Sorry, main abhi server se connect nahi kar paa raha hoon.");
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (!recognition) return;

    recognition.onresult = (event) => {
      const currentTranscript = event.results[0][0].transcript;
      setTranscript(currentTranscript);
      processCommand(currentTranscript);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error", event.error);
      setIsListening(false);
      if (event.error !== 'no-speech') {
        toast.error("Microphone error. Please check permissions.");
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    return () => {
      recognition.abort();
    };
  }, [recognition]);

  const startListening = () => {
    if (!recognition) {
      toast.error("Your browser does not support Voice Recognition.");
      return;
    }
    // Stop any current speaking before listening
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setTranscript('');
    try {
      recognition.start();
      setIsListening(true);
    } catch (e) {
      console.warn(e);
    }
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  };

  return (
    <VoiceContext.Provider value={{
      isListening,
      isProcessing,
      isSpeaking,
      transcript,
      startListening,
      stopListening,
      hasSupport: !!recognition
    }}>
      {children}
    </VoiceContext.Provider>
  );
};
