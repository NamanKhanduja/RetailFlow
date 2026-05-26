import React, { useState } from 'react';
import { useVoice } from '../context/VoiceContext';
import { Mic, MicOff, Loader2, Volume2, Send, Keyboard } from 'lucide-react';
import './VoiceAssistant.css';

export default function VoiceAssistant() {
  const { 
    isListening, 
    isProcessing, 
    isSpeaking, 
    startListening, 
    stopListening, 
    processCommand,
    micLang,
    toggleMicLang,
    transcript, 
    hasSupport 
  } = useVoice();

  const [textInput, setTextInput] = useState('');
  const [showKeyboard, setShowKeyboard] = useState(false);

  if (!hasSupport) return null;

  const handleSendText = async () => {
    if (!textInput.trim()) return;
    const cmd = textInput.trim();
    setTextInput('');
    
    // Stop any active speech/listening session
    stopListening();
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    // Send to backend via processCommand
    await processCommand(cmd);
  };

  return (
    <div className="voice-widget-container">
      {/* Visual Feedback Bubble */}
      {(isListening || isProcessing || isSpeaking || transcript || showKeyboard) && (
        <div className="voice-status-bubble fade-up">
          <div className="voice-status-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {isListening && <span className="status-text listening"><span className="dot pulse-red"></span> Listening...</span>}
              {isProcessing && <span className="status-text processing"><Loader2 size={14} className="spin" /> Processing AI...</span>}
              {isSpeaking && <span className="status-text speaking"><Volume2 size={14} className="pulse-blue" /> Speaking</span>}
              {!isListening && !isProcessing && !isSpeaking && showKeyboard && (
                <span className="status-text manual"><Keyboard size={14} className="pulse-blue" /> Type Command</span>
              )}
            </div>
            
            {(isListening || showKeyboard) && (
              <button 
                className="voice-lang-toggle-btn"
                onClick={toggleMicLang}
                title="Toggle language"
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  borderRadius: '20px',
                  padding: '2px 8px',
                  color: '#c084fc',
                  fontSize: '9px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s',
                  outline: 'none'
                }}
              >
                <span>{micLang === 'hi-IN' ? '🇮🇳 HI' : '🇬🇧 EN'}</span>
              </button>
            )}
          </div>
          
          {transcript && (
            <div className="voice-transcript">
              "{transcript}"
            </div>
          )}

          {/* Keyboard input fallback */}
          <div className="voice-keyboard-input-container">
            <input 
              type="text" 
              placeholder="Or type command (e.g. Add Bread)..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSendText();
                }
              }}
              className="voice-keyboard-input"
              disabled={isProcessing}
            />
            <button 
              className="voice-keyboard-send" 
              onClick={handleSendText}
              disabled={isProcessing || !textInput.trim()}
              title="Send Command"
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Floating Action Buttons */}
      <div className="voice-buttons-group" style={{ display: 'flex', gap: 12 }}>
        {/* Keyboard Toggle Button */}
        <button
          className={`voice-keyboard-fab ${showKeyboard ? 'active' : ''}`}
          onClick={() => setShowKeyboard(prev => !prev)}
          disabled={isProcessing}
          title="Type command manually"
          style={{
            width: 60,
            height: 60,
            borderRadius: '50%',
            background: 'rgba(15, 23, 42, 0.85)',
            border: '1px solid rgba(139, 92, 246, 0.4)',
            color: '#c084fc',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            position: 'relative'
          }}
        >
          <Keyboard size={24} />
        </button>

        {/* Microphone Floating Action Button */}
        <button 
          className={`voice-fab ${isListening ? 'listening' : ''} ${isSpeaking ? 'speaking' : ''}`}
          onClick={isListening ? stopListening : startListening}
          disabled={isProcessing}
          title="Tap to speak"
        >
          {isListening ? <Mic size={24} /> : <MicOff size={24} />}
          
          {/* Ripples when listening */}
          {isListening && (
            <>
              <div className="ripple ripple-1"></div>
              <div className="ripple ripple-2"></div>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
