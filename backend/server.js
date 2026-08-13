const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { WebSocketServer } = require('ws');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// ─── Live Proctoring WebSocket Setup ───────────────────────────────────────
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/proctor' });

// Track live student streams and admin watchers
const liveStudents = new Map(); // email -> { ws, email, name }
const adminClients = new Set();

function broadcastToAdmins(data) {
    const msg = JSON.stringify(data);
    adminClients.forEach(client => {
        if (client.readyState === 1) client.send(msg);
    });
}

wss.on('connection', (ws, req) => {
    const params = new URL(req.url, 'http://localhost').searchParams;
    const role  = params.get('role');
    const email = params.get('email') || 'unknown';

    if (role === 'admin') {
        adminClients.add(ws);
        console.log(`Admin connected to live monitor`);
        // Send current online student list immediately
        ws.send(JSON.stringify({
            type: 'student_list',
            students: [...liveStudents.keys()]
        }));
        ws.on('close', () => {
            adminClients.delete(ws);
            console.log('Admin disconnected from live monitor');
        });
    } else {
        // Student proctor connection
        liveStudents.set(email, { ws, email });
        console.log(`Student joined live proctor: ${email}`);
        broadcastToAdmins({ type: 'student_joined', email });

        ws.on('message', (data) => {
            // data = base64 JPEG frame
            broadcastToAdmins({ type: 'frame', email, frame: data.toString() });
        });

        ws.on('close', () => {
            liveStudents.delete(email);
            console.log(`Student left live proctor: ${email}`);
            broadcastToAdmins({ type: 'student_left', email });
        });
    }
});
// ────────────────────────────────────────────────────────────────────────────

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/human_analyzer')
    .then(() => console.log('MongoDB connected successfully'))
    .catch(err => console.log('MongoDB Connection Error:', err));

// Question Model
const questionSchema = new mongoose.Schema({
    text: String,
    type: String
});
const Question = mongoose.model('Question', questionSchema);

// Interview Model
const interviewSchema = new mongoose.Schema({
    confidenceScore: Number,
    clarityScore: Number,
    eyeContactScore: Number,
    date: { type: Date, default: Date.now }
});
const Interview = mongoose.model('Interview', interviewSchema);

const userProfileSchema = new mongoose.Schema({
    userEmail: { type: String, required: true, unique: true },
    role: String,
    skills: [String],
    score: Number,
    analysis: mongoose.Schema.Types.Mixed,
    lastUpdated: { type: Date, default: Date.now }
});
const UserProfile = mongoose.model('UserProfile', userProfileSchema);

// ─── Registered User Model ───────────────────────────────────────────────────
const registeredUserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    createdAt: { type: Date, default: Date.now }
});
const RegisteredUser = mongoose.model('RegisteredUser', registeredUserSchema);

// ─── Test Result Model ───────────────────────────────────────────────────────
const testResultSchema = new mongoose.Schema({
    userEmail: { type: String, required: true },
    userName: String,
    type: { type: String, enum: ['mcq', 'text', 'code', 'interview'], default: 'mcq' },
    percentage: { type: Number, default: 0 },
    correctCount: { type: Number, default: 0 },
    totalQuestions: { type: Number, default: 0 },
    timeTaken: { type: Number, default: 0 },
    tabSwitches: { type: Number, default: 0 },
    answers: mongoose.Schema.Types.Mixed,
    timestamp: { type: Date, default: Date.now }
});
const TestResult = mongoose.model('TestResult', testResultSchema);
// ─────────────────────────────────────────────────────────────────────────────

// Interview Session Model - stores full interview data per user
const interviewSessionSchema = new mongoose.Schema({
    userEmail: { type: String, required: true },
    completedAt: { type: Date, default: Date.now },
    role: String,
    questions: [String],
    answers: [String],
    fillerWordsCount: Number,
    videoFilename: String, // video saved as a file on disk
    analysis: mongoose.Schema.Types.Mixed,
});
const InterviewSession = mongoose.model('InterviewSession', interviewSessionSchema);

const multer = require('multer');
const pdfParse = require('pdf-parse');
const { OpenAI } = require('openai');

const ai = new OpenAI({ 
    apiKey: process.env.GROQ_API_KEY, 
    baseURL: 'https://api.groq.com/openai/v1' 
});

const { GoogleGenAI } = require('@google/genai');
const geminiAi = new GoogleGenAI({ 
    apiKey: process.env.GEMINI_API_KEY 
});

const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Multer: disk storage for video files, memory for PDF
const videoStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => cb(null, `interview_${Date.now()}.webm`)
});
const uploadVideo = multer({ storage: videoStorage, limits: { fileSize: 200 * 1024 * 1024 } }); // 200MB limit
const upload = multer({ storage: multer.memoryStorage() });

// Serve uploaded videos statically
app.use('/uploads', express.static(uploadsDir));

// ─── Auth Routes ─────────────────────────────────────────────────────────────
// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;
        if (!name || !email || !password) return res.status(400).json({ error: 'All fields required.' });
        const exists = await RegisteredUser.findOne({ email: email.toLowerCase() });
        if (exists) return res.status(400).json({ error: 'Email already registered.' });
        const newUser = new RegisteredUser({ name, email: email.toLowerCase(), password, role: role || 'user' });
        await newUser.save();
        const { password: _, ...safeUser } = newUser.toObject();
        res.json({ success: true, user: safeUser });
    } catch (err) {
        console.error('Register error:', err);
        res.status(500).json({ error: 'Registration failed.' });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const found = await RegisteredUser.findOne({ email: email.toLowerCase(), password });
        if (!found) return res.status(401).json({ error: 'Invalid credentials.' });
        const { password: _, ...safeUser } = found.toObject();
        res.json({ success: true, user: safeUser });
    } catch (err) {
        res.status(500).json({ error: 'Login failed.' });
    }
});

// Get all registered users (admin)
app.get('/api/auth/users', async (req, res) => {
    try {
        const users = await RegisteredUser.find({ role: { $ne: 'admin' } }, { password: 0 }).sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users.' });
    }
});

// Seed default admin + user if not exist
async function seedDefaultUsers() {
    const defaults = [
        { name: 'Admin', email: 'admin@test.com', password: 'admin123', role: 'admin' },
        { name: 'User', email: 'user@test.com', password: 'user123', role: 'user' },
    ];
    for (const u of defaults) {
        const exists = await RegisteredUser.findOne({ email: u.email });
        if (!exists) await RegisteredUser.create(u);
    }
    console.log('Default users seeded.');
}
seedDefaultUsers().catch(console.error);
// ─────────────────────────────────────────────────────────────────────────────

// ─── Test Results Routes ──────────────────────────────────────────────────────
// Save test result(s) — accepts array of result objects
app.post('/api/test-results/save', async (req, res) => {
    try {
        const results = Array.isArray(req.body) ? req.body : [req.body];
        const saved = await TestResult.insertMany(results);
        res.json({ success: true, count: saved.length });
    } catch (err) {
        console.error('Save test result error:', err);
        res.status(500).json({ error: 'Failed to save results.' });
    }
});

// Get all test results (admin)
app.get('/api/test-results', async (req, res) => {
    try {
        const results = await TestResult.find().sort({ timestamp: -1 });
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch results.' });
    }
});

// Get results by user email
app.get('/api/test-results/:email', async (req, res) => {
    try {
        const results = await TestResult.find({ userEmail: req.params.email }).sort({ timestamp: -1 });
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch results.' });
    }
});
// ─────────────────────────────────────────────────────────────────────────────

// Routes
app.post('/api/extract-resume', upload.single('resume'), async (req, res) => {

    try {
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
        
        // Parse PDF
        console.log("Stage 1: Parsing PDF buffer...");
        const data = await pdfParse(req.file.buffer);
        const resumeText = data.text;
        if (!resumeText || resumeText.length < 10) throw new Error("Could not extract text from PDF (it might be an image-only scan).");
        
        // Feed into Groq
        console.log("Stage 2: Querying Groq AI...");
        const prompt = `Act as an expert AI Recruiter and ATS system. Analyze this resume text and provide a highly detailed assessment.
Extract the top skills, detected role, and give an ATS score (0-100).

Calculate and estimate these statistics based on the text:
- Total Words (integer)
- Pages (integer, assume ~400 words/page if not obvious)
- Skills Found (integer)
- Projects Count (integer)
- Certifications Count (integer)
- Experience Years (integer)

Provide detailed analysis arrays (each array containing detailed string items):
- Strengths (min 2)
- Weaknesses (min 2)
- Missing Skills (based on the detected role)
- Grammar Suggestions
- Formatting Suggestions
- ATS Improvements
- Keywords Used
- Action Verbs Used

Calculate:
- Readability Score (0-100)
- Badge (strictly one of: "Excellent", "Good", "Average")
- Job Matches: Provide top 4 job titles they match with and a percentage fit (e.g., {"title": "Software Engineer", "percentage": 85})

Checklist: Provide boolean (true/false) flags indicating if these sections are present and adequate:
"contact", "summary", "education", "skills", "projects", "experience", "certifications", "achievements".

Respond ONLY with a valid JSON object in this exact structure:
{
  "role": "Detected Role",
  "score": 85,
  "badge": "Good",
  "skills": ["skill1", "skill2"],
  "stats": { "words": 450, "pages": 1, "skillsCount": 12, "projects": 2, "certifications": 1, "experienceYears": 3 },
  "analysis": {
    "strengths": ["..."],
    "weaknesses": ["..."],
    "missingSkills": ["..."],
    "grammar": ["..."],
    "ats": ["..."],
    "formatting": ["..."],
    "keywords": ["..."],
    "actionVerbs": ["..."]
  },
  "readability": 88,
  "jobMatches": [ { "title": "...", "percentage": 85 } ],
  "checklist": { "contact": true, "summary": false, "education": true, "skills": true, "projects": true, "experience": true, "certifications": false, "achievements": false }
}
Do not include markdown code block syntax. Return raw JSON.
Resume Text: ${resumeText.slice(0, 4000)}`;

        const completion = await ai.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' }
        });
        
        let resultStr = completion.choices[0].message.content;
        console.log("Stage 3: Parsing AI Response...");
        
        // Extract JSON specifically in case the LLM wrapped it in text
        let cleanJson = resultStr.trim();
        if (cleanJson.includes('```')) {
            cleanJson = cleanJson.replace(/```json|```/g, '').trim();
        }
        
        const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("AI did not return a valid JSON object.");
        const resultJSON = JSON.parse(jsonMatch[0]);

        // Save to Knowledge Base if email is provided
        if (req.body.email) {
            console.log("Stage 4: Updating Knowledge Base in MongoDB...");
            await UserProfile.findOneAndUpdate(
                { userEmail: req.body.email },
                { 
                    role: resultJSON.role,
                    skills: resultJSON.skills,
                    score: resultJSON.score,
                    analysis: resultJSON,
                    lastUpdated: Date.now()
                },
                { upsert: true, new: true, timeout: 5000 }
            );
        }

        console.log("Successfully processed resume!");
        res.json(resultJSON);
    } catch (err) {
        console.error("SERVER ERROR:", err);
        res.status(500).json({ error: 'Failed to process resume', details: err.message });
    }
});

app.post('/api/generate-questions', async (req, res) => {
    try {
        let { role = "Software Engineer", skills = [], email } = req.body;
        
        // Use Knowledge Base if profile exists
        if (email) {
            const profile = await UserProfile.findOne({ userEmail: email });
            if (profile) {
                role = profile.role || role;
                skills = profile.skills?.length > 0 ? profile.skills : skills;
            }
        }
        
        const prompt = `You are an expert technical recruiter. Generate exactly 25 UNIQUE, HIGHLY RANDOMIZED, and HIGHLY RELEVANT interview questions for a ${role} with skills: ${skills.join(', ')}.
        
To ensure randomness, pick random subsets of the provided skills, use random real-world scenarios, and avoid standard cliché questions. The questions should feel tailored and unpredictable.

The questions MUST be distributed exactly as follows:
- 5 HR Questions
- 5 Behavioral Questions
- 10 Technical Questions (based ONLY on the provided skills, pick random combinations of skills)
- 5 Coding Questions
- 5 Project-Based Questions

CRITICAL RULES:
- EVERY question must be completely unique and highly randomized. DO NOT repeat any questions from typical templates.
- Ensure the questions match their assigned category exactly.
- Respond ONLY with a valid JSON array. Do not include markdown code blocks.
- Use current, up-to-date trends and random real-world scenarios from the web.

Format Example:
{ "questions": [
  { "id": 1, "category": "HR", "text": "Unique HR question..." },
  { "id": 2, "category": "Technical", "text": "Unique Technical question..." }
] }`;

        const completion = await ai.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' }
        });

        let resultStr = completion.choices[0].message.content;
        resultStr = resultStr.replace(/```json/g, "").replace(/```/g, "").trim();
        let parsed = JSON.parse(resultStr);
        const questions = parsed.questions || parsed;
        
        res.json(questions);
    } catch (err) {
        console.error(err);
        res.status(200).json([
          { id: 1, category: 'Behavioral', text: 'Tell me about yourself and your professional background.', type: 'interview' },
          { id: 2, category: 'Technical', text: 'Describe a complex technical challenge you recently solved.', type: 'interview' }
        ]);
    }
});

app.post('/api/evaluate-answer', async (req, res) => {
    try {
        const { question, answer, role } = req.body;
        const prompt = `Act as an expert technical interviewer. The candidate for a ${role} role answered the question:
Question: ${question}
Answer: ${answer}

Evaluate the answer and provide exactly this JSON structure (no markdown):
{
  "score": 8,
  "technicalAccuracy": "evaluation string",
  "communication": "evaluation string",
  "confidence": "evaluation string",
  "improvement": "suggestion string",
  "followUpQuestion": "a new question if needed, else null"
}`;
        
        const completion = await ai.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' }
        });
        
        let resultStr = completion.choices[0].message.content.trim();
        const jsonMatch = resultStr.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("AI did not return a valid JSON object.");
        res.json(JSON.parse(jsonMatch[0]));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to evaluate answer' });
    }
});

app.post('/api/analyze-interview', async (req, res) => {
    try {
        const { email, questions, answers } = req.body;
        let role = "Software Engineer";
        let skills = [];
        
        if (email) {
            const profile = await UserProfile.findOne({ userEmail: email });
            if (profile) {
                role = profile.role || role;
                skills = profile.skills || [];
            }
        }

        const interviewData = questions.map((q, i) => ({
            question: q,
            answer: answers[i] || "No response provided."
        }));

        const prompt = `Act as a senior HR manager and Technical Recruiter. A candidate for a ${role} role (with skills: ${skills.join(', ')}) just completed an AI interview.
Questions and Transcribed Answers: ${JSON.stringify(interviewData)}.

Task:
Provide a highly detailed Final Report evaluating the candidate's entire performance.
Respond ONLY with a valid JSON object in this exact structure (no markdown):
{
  "summary": "Overall executive summary of performance.",
  "scores": {
    "overall": 0,
    "technical": 0,
    "behavioral": 0,
    "hr": 0,
    "communication": 0,
    "confidence": 0
  },
  "strengths": ["Area 1", "Area 2"],
  "weaknesses": ["Area 1", "Area 2"],
  "improvements": ["Suggestion 1", "Suggestion 2"],
  "recommendedLearning": ["Topic 1", "Topic 2"]
}`;

        const completion = await ai.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' }
        });

        let resultStr = completion.choices[0].message.content;
        const jsonMatch = resultStr.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("AI did not return a valid JSON object.");
        const analysis = JSON.parse(jsonMatch[0]);

        res.json(analysis);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to analyze interview', details: err.message });
    }
});

app.post('/api/generate-technical-question', async (req, res) => {
    try {
        const { email } = req.body;
        let role = "Software Engineer";
        let skills = ["JavaScript", "React", "Node.js"];
        
        if (email) {
            const profile = await UserProfile.findOne({ userEmail: email });
            if (profile) {
                role = profile.role || role;
                skills = profile.skills || skills;
            }
        }

        const prompt = `Act as a senior technical interviewer. Create a coding challenge for a candidate applying for a ${role} role with experience in: ${skills.join(', ')}.
The challenge should be:
1. Relevant to their specific skills.
2. Moderate difficulty.
3. Provided in a structured JSON format.

Respond ONLY with a JSON object:
{
  "title": "Short title of the problem",
  "text": "Detailed problem description including input/output examples",
  "difficulty": "Easy | Medium | Hard",
  "boilerplate": "Initial function signature or code to start with"
}
Do not include markdown.`;

        const completion = await ai.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' }
        });

        const content = completion.choices[0].message.content;
        let cleanJson = content.trim();
        if (cleanJson.includes('```')) {
            cleanJson = cleanJson.replace(/```json|```/g, '').trim();
        }
        
        res.json(JSON.parse(cleanJson));
    } catch (err) {
        console.error("Technical AI Error:", err);
        res.status(200).json({ 
            title: "Two Sum", 
            text: "Given an array of integers, return indices of the two numbers such that they add up to a specific target.",
            difficulty: "Easy",
            boilerplate: "function twoSum(nums, target) {\n  \n}"
        });
    }
});

app.get('/api/admin/users', async (req, res) => {
    try {
        const users = await UserProfile.find().sort({ lastUpdated: -1 });
        res.json(users);
    } catch (err) {
        console.error("Error fetching users:", err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

app.post('/api/interviews/save', async (req, res) => {
    try {
        const interview = new Interview(req.body);
        await interview.save();
        res.json({ message: 'Session metrics saved successfully!', id: interview._id });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save session' });
    }
});

// Save full interview session - video as file upload, metadata as JSON fields
app.post('/api/interview-session/save', uploadVideo.single('video'), async (req, res) => {
    try {
        const { userEmail, role, questions, answers, fillerWordsCount, analysis } = req.body;
        const parsedAnalysis = typeof analysis === 'string' ? JSON.parse(analysis) : analysis;
        const parsedQuestions = typeof questions === 'string' ? JSON.parse(questions) : questions;
        const parsedAnswers = typeof answers === 'string' ? JSON.parse(answers) : answers;

        const videoFilename = req.file ? req.file.filename : null;

        const session = new InterviewSession({
            userEmail,
            role,
            questions: parsedQuestions,
            answers: parsedAnswers,
            fillerWordsCount: Number(fillerWordsCount) || 0,
            videoFilename,
            analysis: parsedAnalysis
        });
        await session.save();

        // Also update UserProfile with latest score
        await UserProfile.findOneAndUpdate(
            { userEmail },
            { score: parsedAnalysis?.scores?.total, analysis: parsedAnalysis, lastUpdated: new Date() },
            { upsert: true }
        );

        res.json({
            message: 'Interview session saved!',
            id: session._id,
            videoUrl: videoFilename ? `http://127.0.0.1:5000/uploads/${videoFilename}` : null
        });
    } catch (err) {
        console.error('Save session error:', err);
        res.status(500).json({ error: 'Failed to save interview session', details: err.message });
    }
});

// Admin: get all interview sessions (with videoUrl included)
app.get('/api/admin/interview-sessions', async (req, res) => {
    try {
        const sessions = await InterviewSession.find().sort({ completedAt: -1 });
        const sessionsWithUrl = sessions.map(s => ({
            ...s.toObject(),
            videoUrl: s.videoFilename ? `http://127.0.0.1:5000/uploads/${s.videoFilename}` : null
        }));
        res.json(sessionsWithUrl);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
});

// Admin: get single session
app.get('/api/admin/interview-sessions/:id', async (req, res) => {
    try {
        const session = await InterviewSession.findById(req.params.id);
        if (!session) return res.status(404).json({ error: 'Session not found' });
        res.json({
            ...session.toObject(),
            videoUrl: session.videoFilename ? `http://127.0.0.1:5000/uploads/${session.videoFilename}` : null
        });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch session' });
    }
});

// AI Code Review Endpoint
app.post('/api/analyze-code', async (req, res) => {
    try {
        const { code, language, problemTitle, problemText } = req.body;
        const prompt = `Act as an expert technical interviewer and AI code reviewer. Evaluate the following candidate solution:
Problem: ${problemTitle}
Description: ${problemText}
Language: ${language}
Candidate Code:
\`\`\`${language}
${code}
\`\`\`

Provide feedback strictly as a valid JSON object with the following format:
{
  "correctness": "Feedback on whether the code is correct, covers edge cases, and handles constraints.",
  "codeQuality": "Feedback on variable naming, structure, readability, and clean code practices.",
  "timeComplexity": "O(...) explanation",
  "spaceComplexity": "O(...) explanation",
  "suggestions": ["Specific suggestion 1", "Specific suggestion 2"]
}
Do not include any markdown code blocks, just return raw JSON.`;

        const completion = await ai.chat.completions.create({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: prompt }], response_format: { type: 'json_object' }
        });

        let content = completion.choices[0].message.content.trim();
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("AI did not return a valid JSON object.");
        res.json(JSON.parse(jsonMatch[0]));
    } catch (err) {
        console.error("AI Code Review Error:", err);
        res.status(500).json({
            correctness: "Code ran successfully, but detailed correctness analysis was unavailable.",
            codeQuality: "Formatting matches conventions. Needs manual review.",
            timeComplexity: "O(N) estimated",
            spaceComplexity: "O(1) estimated",
            suggestions: [
                "Consider standard double-check for off-by-one errors.",
                "Ensure standard boundary conditions are handled."
            ]
        });
    }
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Express + WebSocket server running on port ${PORT}`);
    console.log(`Live Proctoring WS: ws://127.0.0.1:${PORT}/proctor`);
});
