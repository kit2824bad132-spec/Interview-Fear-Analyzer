const fs = require('fs');

let code = fs.readFileSync('src/pages/Resume.jsx', 'utf8');

// 1. Fix the syntax error at line 182
// The code looks like:
//             {/* Theme Controls */}
//             
//             )}
//           </div>
code = code.replace(/\{\/\* Theme Controls \*\/\}[\s\S]*?\)\}/, '{/* Theme Controls removed */}');

// 2. Remove `isDark` prop destructuring from components
code = code.replace(/, isDark \}/g, ' }');

// 3. Fix component definitions and Tailwind dark: variants

// CircularProgress
code = code.replace(/isDark \? "#374151" : "#EFF6FF"/g, '"currentColor" className="text-blue-50 dark:text-gray-700"'); // a bit of hack for SVG stroke but let's just use string values because React inline stroke doesn't support Tailwind directly unless we use css. Actually let's just use a fixed color or class
code = code.replace(/stroke=\{isDark \? "#374151" : "#EFF6FF"\}/g, 'className="stroke-blue-50 dark:stroke-gray-700"');
code = code.replace(/\$\{isDark \? 'text-white' : 'text-gray-900'\}/g, 'text-gray-900 dark:text-white');

// StatCard
code = code.replace(/\$\{isDark \? 'bg-gray-700' : colorTheme\.lightBg\}/g, '${colorTheme.lightBg} dark:bg-gray-700');
code = code.replace(/\$\{isDark \? 'text-gray-400' : 'text-gray-500'\}/g, 'text-gray-500 dark:text-gray-400');
code = code.replace(/\$\{isDark \? 'text-white' : 'text-gray-900'\}/g, 'text-gray-900 dark:text-white');

// SectionList
code = code.replace(/\$\{isDark \? 'bg-gray-800\/50 border-gray-700' : `\$\{bgClass\} \$\{borderClass\}`\}/g, '${bgClass} ${borderClass} dark:bg-gray-800/50 dark:border-gray-700');
code = code.replace(/\$\{isDark \? 'text-gray-300' : 'text-gray-700'\}/g, 'text-gray-700 dark:text-gray-300');

// Other random JSX string literals
code = code.replace(/\$\{isDark \? 'text-gray-400' : 'text-gray-500'\}/g, 'text-gray-500 dark:text-gray-400');
code = code.replace(/\$\{isDark \? 'text-gray-500' : 'text-gray-300'\}/g, 'text-gray-300 dark:text-gray-500');
code = code.replace(/\$\{isDark \? 'text-gray-300' : 'text-gray-600'\}/g, 'text-gray-600 dark:text-gray-300');

// Remove isDark={isDark} from JSX invocations
code = code.replace(/ isDark=\{isDark\}/g, '');

// Job Title Matches YAxis
code = code.replace(/fill: isDark \? '#9CA3AF' : '#4B5563'/g, "fill: '#9CA3AF'");
// Tooltip
code = code.replace(/backgroundColor: isDark \? '#374151' : '#fff'/g, "backgroundColor: 'var(--tw-colors-gray-800, #1F2937)'");
code = code.replace(/color: isDark \? '#fff' : '#000'/g, "color: '#fff'");

// Checklist text
code = code.replace(/\$\{isPresent \? \(isDark \? 'text-gray-300' : 'text-gray-700 font-medium'\) : 'text-gray-500'\}/g, "${isPresent ? 'text-gray-700 font-medium dark:text-gray-300' : 'text-gray-500 dark:text-gray-400'}");

fs.writeFileSync('src/pages/Resume.jsx', code);
console.log('Fixed Resume.jsx');
