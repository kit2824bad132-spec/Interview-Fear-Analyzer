const fs = require('fs');
let code = fs.readFileSync('c:/new project/backend/server.js', 'utf8');

// Replace imports
code = code.replace(
  /const \{ GoogleGenAI \} = require\('@google\/genai'\);/,
  "const { OpenAI } = require('openai');"
);

// Replace client init
code = code.replace(
  /const ai = new GoogleGenAI\(\{[\s\S]*?apiKey: process\.env\.GEMINI_API_KEY \|\| "dummy_key"[\s\S]*?\}\);/,
  "const ai = new OpenAI({ apiKey: process.env.GEMINI_API_KEY || 'dummy_key', baseURL: 'https://api.hpc-ai.com/inference/v1' });"
);

// Replace generation calls
code = code.replace(/await ai\.models\.generateContent\(\{[\s\S]*?model:\s*'[^']+'[\s\S]*?contents:\s*prompt,?[\s\S]*?(config:\s*\{[^}]+\})?[\s\S]*?\}\)/g, (match, p1) => {
    let temp = p1 ? p1.replace('config:', '').trim() : '';
    let tempStr = temp ? ", " + temp.slice(1, -1) : "";
    return `await ai.chat.completions.create({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }]${tempStr}
        })`;
});

// Replace completion.text and completion.text.trim()
code = code.replace(/completion\.text/g, 'completion.choices[0].message.content');

fs.writeFileSync('c:/new project/backend/server.js', code);
console.log("Rewrote server.js for OpenAI compat.");
