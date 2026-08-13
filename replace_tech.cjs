const fs = require('fs');

function processTechnical() {
    let code = fs.readFileSync('src/pages/Technical.jsx', 'utf8');

    // Remove isDarkMode state and references to toggling it
    code = code.replace(/const \[isDarkMode, setIsDarkMode\] = useState\(false\);\n?\s*/, '');
    code = code.replace(/<button\s+onClick=\{\(\) => setIsDarkMode\(!isDarkMode\)\}[\s\S]*?<\/button>/, '');

    // Replace all ternary isDarkMode checks with standard Tailwind dark: variant
    code = code.replace(/\$\{isDarkMode \? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'\}/g, 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800');
    code = code.replace(/\$\{isDarkMode \? 'bg-slate-950' : 'bg-white'\}/g, 'bg-white dark:bg-slate-950');
    code = code.replace(/\$\{isDarkMode \? 'bg-slate-900\/80 border-slate-800' : 'bg-white border-slate-200'\}/g, 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800');
    code = code.replace(/\$\{isDarkMode \? 'bg-slate-900\/60 border-slate-800 text-slate-450' : 'bg-white border-slate-200 text-slate-650'\}/g, 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400');
    code = code.replace(/\$\{isDarkMode \? 'bg-slate-950 border-slate-850 text-slate-300' : 'bg-white border-slate-200 text-slate-700'\}/g, 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300');
    code = code.replace(/\$\{isDarkMode \? 'text-white' : 'text-slate-900'\}/g, 'text-slate-900 dark:text-white');
    code = code.replace(/\$\{isDarkMode \? 'text-slate-200' : 'text-slate-700'\}/g, 'text-slate-700 dark:text-slate-200');
    code = code.replace(/\$\{isDarkMode \? 'text-slate-400' : 'text-slate-500'\}/g, 'text-slate-500 dark:text-slate-400');
    code = code.replace(/\$\{isDarkMode \? 'bg-slate-900 border-slate-800' : 'bg-slate-50 border-slate-200'\}/g, 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800');
    code = code.replace(/\$\{isDarkMode \? 'bg-slate-800\/50' : 'bg-slate-50'\}/g, 'bg-slate-50 dark:bg-slate-800/50');
    
    // Fix Monaco theme
    code = code.replace(/theme=\{isDarkMode \? "vs-dark" : "vs-light"\}/g, 'theme="vs-dark"');
    
    // There are custom slate colors like slate-450 and slate-650 and slate-850 which don't exist by default in Tailwind unless added, so we fall back to closest standard variants
    code = code.replace(/bg-white border-slate-200 text-slate-650/g, 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400');

    // Global transitions
    code = code.replace(/<div className=\{`min-h-screen transition-colors duration-300 \$\{isDarkMode \? 'bg-slate-950' : 'bg-slate-50'\}`\}>/g, '<div className="min-h-screen transition-colors duration-300 bg-slate-50 dark:bg-slate-950">');
    
    fs.writeFileSync('src/pages/Technical.jsx', code);
    console.log('Technical updated');
}

try {
    processTechnical();
} catch(e) {
    console.error(e);
}
