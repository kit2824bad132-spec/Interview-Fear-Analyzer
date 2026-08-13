const fs = require('fs');
const path = require('path');

const filesToUpdate = [
    'src/pages/Interview.jsx',
    'src/pages/TestPage.jsx',
    'src/pages/ResultPage.jsx',
    'src/pages/LandingPage.jsx',
    'src/pages/LoginPage.jsx',
    'src/pages/RegisterPage.jsx',
    'src/pages/FaceAssessment.jsx'
];

function applyDarkClasses(content) {
    let code = content;

    // Backgrounds
    code = code.replace(/bg-white/g, 'bg-white dark:bg-gray-800');
    code = code.replace(/bg-gray-50/g, 'bg-gray-50 dark:bg-gray-900');
    code = code.replace(/bg-gray-100/g, 'bg-gray-100 dark:bg-gray-700');
    
    // Text colors
    code = code.replace(/text-black/g, 'text-black dark:text-white');
    code = code.replace(/text-gray-900/g, 'text-gray-900 dark:text-gray-100');
    code = code.replace(/text-gray-800/g, 'text-gray-800 dark:text-gray-100');
    code = code.replace(/text-gray-700/g, 'text-gray-700 dark:text-gray-300');
    code = code.replace(/text-gray-600/g, 'text-gray-600 dark:text-gray-400');
    code = code.replace(/text-gray-500/g, 'text-gray-500 dark:text-gray-400');
    
    // Borders
    code = code.replace(/border-gray-100/g, 'border-gray-100 dark:border-gray-700');
    code = code.replace(/border-gray-200/g, 'border-gray-200 dark:border-gray-700');
    code = code.replace(/border-gray-300/g, 'border-gray-300 dark:border-gray-600');
    
    // Hovers
    code = code.replace(/hover:bg-gray-50/g, 'hover:bg-gray-50 dark:hover:bg-gray-700');
    code = code.replace(/hover:bg-gray-100/g, 'hover:bg-gray-100 dark:hover:bg-gray-600');
    
    // Specific fixes for double-applications that might happen due to the simple regex
    // Clean up any "dark:dark:" errors just in case
    code = code.replace(/dark:dark:bg-gray-\d+/g, (match) => match.substring(5));
    code = code.replace(/dark:dark:text-white/g, 'dark:text-white');
    code = code.replace(/dark:dark:text-gray-\d+/g, (match) => match.substring(5));
    code = code.replace(/dark:dark:border-gray-\d+/g, (match) => match.substring(5));

    // Ensure transition classes are present on main containers
    code = code.replace(/min-h-screen(?! transition-colors)/g, 'min-h-screen transition-colors duration-300');

    return code;
}

for (const filePath of filesToUpdate) {
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        let newContent = applyDarkClasses(content);
        fs.writeFileSync(filePath, newContent);
        console.log(`Updated ${filePath}`);
    } else {
        console.warn(`Skipped ${filePath} - not found`);
    }
}
