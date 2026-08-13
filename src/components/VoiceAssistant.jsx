import React, { useState, useEffect, useRef } from 'react';
import { useAccessibility } from '../context/AccessibilityContext';
import { Mic, MicOff } from 'lucide-react';
import { motion } from 'framer-motion';

export default function VoiceAssistant({ onTranscript }) {
  const { isSTTEnabled } = useAccessibility();
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.warn('Speech recognition not supported in this browser.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;

    recognitionRef.current.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript && onTranscript) {
        onTranscript(finalTranscript);
      }
    };

    recognitionRef.current.onerror = (event) => {
      console.error('Speech recognition error', event.error);
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      // Auto-restart if we are supposed to be listening
      if (isListening && isSTTEnabled) {
        try {
          recognitionRef.current.start();
        } catch(e) {
          console.error(e);
        }
      } else {
        setIsListening(false);
      }
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isSTTEnabled, isListening, onTranscript]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch(e) {
        console.error(e);
      }
    }
  };

  if (!isSTTEnabled) return null;

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={toggleListening}
      className={`p-3 rounded-full shadow-lg flex items-center justify-center transition-colors ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-primary-600 text-white hover:bg-primary-700'}`}
      title={isListening ? "Stop Listening" : "Start Voice Typing"}
      aria-label={isListening ? "Stop Voice Recognition" : "Start Voice Recognition"}
    >
      {isListening ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
    </motion.button>
  );
}
