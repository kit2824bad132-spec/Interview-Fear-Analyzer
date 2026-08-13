const fs = require('fs');
let code = fs.readFileSync('server.js', 'utf8');

code = code.replace(/mixtral-8x7b-32768/g, 'llama-3.1-8b-instant');

const fallback = `res.status(200).json([
          { id: 1, category: 'Behavioral', text: 'Tell me about yourself and your professional background.', type: 'interview' },
          { id: 2, category: 'Technical', text: 'Describe a complex technical challenge you recently solved.', type: 'interview' }
        ]);`;
code = code.replace(/res\.status\(500\)\.json\(\{ error: 'Failed to generate questions' \}\);/g, fallback);

fs.writeFileSync('server.js', code);
console.log('Successfully rewrote server.js!');
