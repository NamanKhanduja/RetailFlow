import React from 'react';
import { useVoice } from '../context/VoiceContext';
import { Mic, MicOff, Loader2, Volume2 } from 'lucide-react';
import './VoiceAssistant.css';

export default function VoiceAssistant() {
  const { isListening, isProcessing, isSpeaking, startListening, stopListening, transcript, hasSupport } = useVoice();

  if (!hasSupport) return null;

  return (
    <div className="voice-widget-container">
      {/* Visual Feedback Bubble */}
      {(isListening || isProcessing || isSpeaking || transcript) && (
        <div className="voice-status-bubble fade-up">
          <div className="voice-status-header">
            {isListening && <span className="status-text listening"><span className="dot pulse-red"></span> Listening...</span>}
            {isProcessing && <span className="status-text processing"><Loader2 size={14} className="spin" /> Processing AI...</span>}
            {isSpeaking && <span className="status-text speaking"><Volume2 size={14} className="pulse-blue" /> Speaking</span>}
          </div>
          
          {transcript && (
            <div className="voice-transcript">
              "{transcript}"
            </div>
          )}
        </div>
      )}

      {/* Floating Action Button */}
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
  );
}
