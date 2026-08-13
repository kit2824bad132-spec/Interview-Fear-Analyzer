const fs = require('fs');

function processDashboard() {
    let code = fs.readFileSync('src/pages/Dashboard.jsx', 'utf8');

    // Remove isDark state
    code = code.replace(/const \[isDark, setIsDark\] = useState\(false\);\n?\s*/, '');

    // Remove theme object
    code = code.replace(/const theme = \{\s*bg:[^}]+\};\n?/m, '');

    // Replace variables
    code = code.replace(/\$\{theme\.bg\}/g, 'bg-gray-50 dark:bg-gray-900');
    code = code.replace(/\$\{theme\.card\}/g, 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700');
    code = code.replace(/\$\{theme\.text\}/g, 'text-gray-900 dark:text-white');
    code = code.replace(/\$\{theme\.textMuted\}/g, 'text-gray-500 dark:text-gray-400');
    code = code.replace(/theme\.accent/g, "'#2563EB'");
    code = code.replace(/theme\.chartGrid/g, "'#E5E7EB'");

    // Specific replacements for isDark ternary operations
    code = code.replace(/\$\{isDark \? 'bg-blue-500\/20 text-blue-400' : 'bg-blue-100 text-blue-600'\}/g, 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400');
    code = code.replace(/\$\{isDark \? 'bg-gray-800\/50' : 'bg-gray-50'\}/g, 'bg-gray-50 dark:bg-gray-800/50');
    code = code.replace(/\$\{isDark \? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-700'\}/g, 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white');
    code = code.replace(/\$\{isDark \? 'border-gray-700' : 'border-gray-100'\}/g, 'border-gray-100 dark:border-gray-700');
    code = code.replace(/\$\{isDark \? 'border-gray-700' : 'border-gray-200'\}/g, 'border-gray-200 dark:border-gray-700');
    
    // Chart tooltip colors
    code = code.replace(/isDark \? '#1F2937' : '#FFFFFF'/g, "'#FFFFFF'");
    code = code.replace(/isDark \? '#374151' : '#E5E7EB'/g, "'#E5E7EB'");
    code = code.replace(/isDark \? 'rgba\(255,255,255,0\.05\)' : 'rgba\(0,0,0,0\.05\)'/g, "'rgba(0,0,0,0.05)'");
    code = code.replace(/isDark \? '#9CA3AF' : '#6B7280'/g, "'#6B7280'");

    // Remove dark mode toggle button block
    code = code.replace(/<button\s+onClick=\{\(\) => setIsDark\(!isDark\)\}[\s\S]*?<\/button>/, '');

    // Clean up empty lines where toggle was
    code = code.replace(/\n\s*\n\s*<div className=\{`px-4 py-2/, '\n<div className={`px-4 py-2');

    // Make sure Dashboard returns correctly
    fs.writeFileSync('src/pages/Dashboard.jsx', code);
    console.log('Dashboard updated');
}

function processAdminPanel() {
    let code = fs.readFileSync('src/pages/AdminPanel.jsx', 'utf8');

    code = code.replace(/const \[isDark, setIsDark\] = useState\(false\);\n?\s*/, '');
    code = code.replace(/const theme = \{\s*bg:[^}]+\};\n?/m, '');

    code = code.replace(/\$\{theme\.bg\}/g, 'bg-gray-50 dark:bg-gray-900');
    code = code.replace(/\$\{theme\.card\}/g, 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700');
    code = code.replace(/\$\{theme\.text\}/g, 'text-gray-900 dark:text-white');
    code = code.replace(/\$\{theme\.textMuted\}/g, 'text-gray-500 dark:text-gray-400');
    
    code = code.replace(/<button\s+onClick=\{\(\) => setIsDark\(!isDark\)\}[\s\S]*?<\/button>/, '');

    // Common dynamic classes
    code = code.replace(/\$\{isDark \? 'bg-gray-800\/50' : 'bg-gray-50'\}/g, 'bg-gray-50 dark:bg-gray-800/50');
    code = code.replace(/\$\{isDark \? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-700'\}/g, 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-white');
    code = code.replace(/\$\{isDark \? 'border-gray-700' : 'border-gray-100'\}/g, 'border-gray-100 dark:border-gray-700');
    code = code.replace(/\$\{isDark \? 'bg-blue-500\/20 text-blue-400' : 'bg-blue-100 text-blue-600'\}/g, 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400');
    code = code.replace(/\$\{isDark \? 'bg-purple-500\/20 text-purple-400' : 'bg-purple-100 text-purple-600'\}/g, 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400');

    fs.writeFileSync('src/pages/AdminPanel.jsx', code);
    console.log('AdminPanel updated');
}

function processResume() {
    let code = fs.readFileSync('src/pages/Resume.jsx', 'utf8');

    code = code.replace(/const \[isDark, setIsDark\] = useState\(false\);\n?\s*/, '');
    
    code = code.replace(/\$\{isDark \? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'\}/g, 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700');
    code = code.replace(/\$\{isDark \? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'\}/g, 'bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white');
    code = code.replace(/\$\{isDark \? 'border-gray-800' : 'border-gray-200'\}/g, 'border-gray-200 dark:border-gray-800');
    code = code.replace(/\$\{isDark \? 'bg-gray-800 border-gray-700 hover:bg-gray-700' : 'bg-white border-gray-200 hover:bg-gray-50'\}/g, 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700');
    code = code.replace(/\$\{isDark \? 'bg-gray-800 border-gray-700 hover:border-gray-500' : 'bg-white border-gray-200 hover:border-gray-400'\}/g, 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500');
    code = code.replace(/\$\{isDark \? 'bg-gray-900\/80' : 'bg-white\/80'\}/g, 'bg-white/80 dark:bg-gray-900/80');
    code = code.replace(/\$\{fileName \? 'bg-emerald-100 text-emerald-600' : isDark \? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'\}/g, '${fileName ? \'bg-emerald-100 text-emerald-600\' : \'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300\'}');
    code = code.replace(/\$\{isDark \? 'bg-gray-700' : 'bg-gray-50'\}/g, 'bg-gray-50 dark:bg-gray-700');
    code = code.replace(/\$\{isDark \? 'text-white' : 'text-gray-800'\}/g, 'text-gray-800 dark:text-white');
    code = code.replace(/\$\{isDark \? 'bg-gray-700' : 'bg-gray-100'\}/g, 'bg-gray-100 dark:bg-gray-700');

    // Remove toggle button block in header
    code = code.replace(/<div className=\{`flex items-center gap-3 px-4 py-2 rounded-full border \$\{isDark \? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'\} shadow-sm`\}>\s*<button onClick=\{\(\) => setIsDark\(!isDark\)\}[\s\S]*?<\/button>\s*<\/div>/, '');

    fs.writeFileSync('src/pages/Resume.jsx', code);
    console.log('Resume updated');
}

try {
    processDashboard();
    processAdminPanel();
    processResume();
} catch(e) {
    console.error(e);
}
