import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { FileUp, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ResumeUploader({ onUpload }) {
    const { user } = useAuth();
    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const fileInputRef = useRef(null);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') setIsDragging(true);
        else if (e.type === 'dragleave') setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleFile = (selectedFile) => {
        const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (selectedFile && validTypes.includes(selectedFile.type)) {
            setFile(selectedFile);
            simulateExtraction(selectedFile);
        } else {
            alert('Please upload a valid PDF or DOC file.');
        }
    };

    const simulateExtraction = async (file) => {
        setIsProcessing(true);
        try {
            let extractedData = { skills: ["React", "JavaScript"], score: 75, role: "Software Engineer" };
            
            // If it's a real file (not demo object)
            if (file instanceof File) {
                const formData = new FormData();
                formData.append('resume', file);
                if (user?.email) {
                    formData.append('email', user.email);
                }
                
                const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'}/api/extract-resume`, {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    extractedData = await response.json();
                } else {
                    console.error("Failed to extract skills, using defaults");
                }
            } else {
                // Simulate delay for demo file
                await new Promise(r => setTimeout(r, 2000));
            }
            
            setIsProcessing(false);
            onUpload({ 
                file, 
                skills: extractedData.skills || [], 
                score: extractedData.score || 70,
                role: extractedData.role || "Candidate"
            });
        } catch (error) {
            console.error("AI Extraction error:", error);
            setIsProcessing(false);
            onUpload({ file, skills: ["React", "JavaScript"], score: 75, role: "Candidate" });
        }
    };

    return (
        <div className="w-full max-w-md mt-8">
            <h3 className="text-white/80 text-center mb-4 text-lg">Upload Resume to Start</h3>
            
            <motion.div
                className={`relative glass-panel rounded-2xl p-8 border-2 border-dashed transition-colors flex flex-col items-center justify-center text-center cursor-pointer ${
                    isDragging ? 'border-neonPrimary bg-[rgba(var(--neon-primary),0.1)]' : 'border-white/20'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => {
                    if (!isProcessing && !file) {
                        const demoFile = { name: "demo_resume.pdf" };
                        setFile(demoFile);
                        simulateExtraction(demoFile);
                    }
                }}
                whileHover={!file && !isProcessing ? { scale: 1.02, borderColor: 'rgba(var(--neon-primary), 0.5)' } : {}}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => e.target.files && handleFile(e.target.files[0])}
                />

                {isProcessing ? (
                    <div className="flex flex-col items-center">
                        <motion.div 
                            animate={{ rotate: 360 }} 
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            className="w-12 h-12 rounded-full border-t-2 border-r-2 border-neonPrimary mb-4"
                        />
                        <p className="text-neonPrimary font-semibold tracking-widest uppercase text-sm animate-pulse">
                            Extracting Skills...
                        </p>
                        <p className="text-white/50 text-xs mt-2">Connecting to AI engine</p>
                    </div>
                ) : file ? (
                    <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="flex flex-col items-center">
                        <CheckCircle className="w-16 h-16 text-neonPrimary mb-4 drop-shadow-[0_0_15px_rgba(var(--neon-primary),0.8)]" />
                        <p className="text-white font-medium mb-1">{file.name}</p>
                        <p className="text-white/50 text-sm">Resume Successfully Processed</p>
                    </motion.div>
                ) : (
                    <div className="flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full glass-panel neon-border-secondary flex items-center justify-center mb-4">
                            <FileUp className="w-8 h-8 text-neonSecondary" />
                        </div>
                        <p className="text-white font-medium mb-2">Drag & Drop Resume Here</p>
                        <p className="text-white/50 text-sm">Or click to browse (PDF, DOC, DOCX)</p>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
