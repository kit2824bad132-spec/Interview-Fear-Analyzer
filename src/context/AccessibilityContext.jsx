import React, { createContext, useContext, useState, useEffect } from 'react';

const AccessibilityContext = createContext();

export function useAccessibility() {
  return useContext(AccessibilityContext);
}

export function AccessibilityProvider({ children }) {
  const [isHighContrast, setIsHighContrast] = useState(() => localStorage.getItem('highContrast') === 'true');
  const [isLargeText, setIsLargeText] = useState(() => localStorage.getItem('largeText') === 'true');
  const [isTTSEnabled, setIsTTSEnabled] = useState(() => localStorage.getItem('ttsEnabled') === 'true');
  const [isSTTEnabled, setIsSTTEnabled] = useState(() => localStorage.getItem('sttEnabled') === 'true');

  useEffect(() => {
    localStorage.setItem('highContrast', isHighContrast);
    if (isHighContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, [isHighContrast]);

  useEffect(() => {
    localStorage.setItem('largeText', isLargeText);
    if (isLargeText) {
      document.documentElement.classList.add('text-large');
    } else {
      document.documentElement.classList.remove('text-large');
    }
  }, [isLargeText]);

  useEffect(() => {
    localStorage.setItem('ttsEnabled', isTTSEnabled);
  }, [isTTSEnabled]);

  useEffect(() => {
    localStorage.setItem('sttEnabled', isSTTEnabled);
  }, [isSTTEnabled]);

  const toggleHighContrast = () => setIsHighContrast(!isHighContrast);
  const toggleLargeText = () => setIsLargeText(!isLargeText);
  const toggleTTS = () => setIsTTSEnabled(!isTTSEnabled);
  const toggleSTT = () => setIsSTTEnabled(!isSTTEnabled);

  // Helper to read text aloud if TTS is enabled
  const speakText = (text) => {
    if (isTTSEnabled && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // stop previous
      const utterance = new SpeechSynthesisUtterance(text);
      window.speechSynthesis.speak(utterance);
    }
  };

  const value = {
    isHighContrast,
    isLargeText,
    isTTSEnabled,
    isSTTEnabled,
    toggleHighContrast,
    toggleLargeText,
    toggleTTS,
    toggleSTT,
    speakText
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}
