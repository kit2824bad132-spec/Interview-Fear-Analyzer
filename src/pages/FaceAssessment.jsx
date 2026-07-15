import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, Camera } from 'lucide-react';

const STEPS = [
  { id: 'left', label: 'Move your face fully to LEFT' },
  { id: 'right', label: 'Move your face fully to RIGHT' },
  { id: 'up', label: 'Move your face UP' },
  { id: 'down', label: 'Move your face DOWN' }
];

export default function FaceAssessment() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const [stream, setStream] = useState(null);
  
  const [stepIndex, setStepIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [isCentered, setIsCentered] = useState(false);
  const [error, setError] = useState("");

  // Setup WebCam
  useEffect(() => {
    async function setupCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
        setStream(mediaStream);
      } catch (err) {
        setError("Camera permission denied or camera not found.");
      }
    }
    setupCamera();
    
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  // Setup WebSocket & Frame sending
  useEffect(() => {
    wsRef.current = new WebSocket("ws://localhost:8000/ws");
    
    wsRef.current.onopen = () => {
      console.log("Connected to AI Backend");
      setError(""); // Clear any offline errors when connected
    };

    wsRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.error) return;
      
      setIsCentered(data.centered);
      
      if (!data.centered) {
        setFeedback("Face not centered");
        return;
      } else {
        setFeedback("");
      }

      // Check current step completion
      if (stepIndex < STEPS.length) {
        const requiredDirection = STEPS[stepIndex].id;
        if (data.direction === requiredDirection) {
          // Move to next step
          if (stepIndex === STEPS.length - 1) {
            setIsCompleted(true);
          }
          setStepIndex(prev => prev + 1);
        }
      }
    };

    wsRef.current.onerror = () => {
      setError("AI Engine offline. Please ensure the Python server is running.");
    };

    // Frame capture loop
    const FPS = 10;
    const interval = setInterval(() => {
      if (videoRef.current && canvasRef.current && wsRef.current?.readyState === WebSocket.OPEN) {
        const context = canvasRef.current.getContext('2d');
        canvasRef.current.width = videoRef.current.videoWidth || 640;
        canvasRef.current.height = videoRef.current.videoHeight || 480;
        
        if (canvasRef.current.width > 0) {
          context.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);
          // Get base64 jpeg
          const dataURL = canvasRef.current.toDataURL('image/jpeg', 0.5);
          wsRef.current.send(dataURL);
        }
      }
    }, 1000 / FPS);

    return () => {
      clearInterval(interval);
      if (wsRef.current) wsRef.current.close();
    };
  }, [stepIndex, stream]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col items-center justify-center p-6 text-white overflow-hidden">
      <div className="w-full max-w-3xl space-y-8 relative z-10">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            Face Movement Assessment
          </h1>
          <p className="text-gray-400 text-sm">Please follow the instructions to verify your active presence.</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Viewport */}
        <div className="relative aspect-video bg-black rounded-3xl overflow-hidden border border-gray-800 shadow-2xl ring-1 ring-white/5">
          {/* Main Video */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover -scale-x-100" // Mirror effect
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Guiding Frame */}
          {!isCompleted && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={`w-48 h-64 border-2 rounded-full transition-colors duration-500 ${
                isCentered ? 'border-emerald-500 bg-emerald-500/10' : 'border-red-500 border-dashed bg-red-500/10'
              }`} />
            </div>
          )}

          {/* Feedback Overlay */}
          {!isCompleted && feedback && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-6 py-2 rounded-full border border-gray-700 font-medium text-red-400 text-sm flex items-center gap-2">
               <AlertCircle className="w-4 h-4" /> {feedback}
            </div>
          )}

          {/* Success Overlay */}
          <AnimatePresence>
            {isCompleted && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 bg-emerald-900/90 backdrop-blur-sm flex flex-col items-center justify-center space-y-4"
              >
                <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(16,185,129,0.5)]">
                  <CheckCircle2 className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-white">Assessment Completed</h2>
                <p className="text-emerald-200">System validated successfully.</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Progress System */}
        <div className="bg-gray-900/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-6">
          <div className="flex justify-between items-end mb-4">
            <div>
              <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider font-semibold">Current Step</p>
              <h3 className="text-xl font-medium text-white transition-all">
                 {isCompleted ? "All steps verified" : STEPS[stepIndex]?.label}
              </h3>
            </div>
            <div className="text-emerald-400 font-mono text-sm">
              {Math.min(stepIndex + 1, STEPS.length)} / {STEPS.length}
            </div>
          </div>

          <div className="flex gap-2 w-full h-2">
            {STEPS.map((_, idx) => (
              <div 
                key={idx} 
                className={`flex-1 rounded-full transition-all duration-500 ${
                  idx < stepIndex || isCompleted ? 'bg-emerald-500' : 
                  idx === stepIndex ? 'bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 
                  'bg-gray-800'
                }`}
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
