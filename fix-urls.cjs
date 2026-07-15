const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            replaceInDir(fullPath);
        } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf-8');
            let modified = false;
            
            // Replace 'http://127.0.0.1:5000/...' with `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'}/...`
            if (content.includes("'http://127.0.0.1:5000")) {
                content = content.replace(/'http:\/\/127\.0\.0\.1:5000(.*?)'/g, "`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'}$1`");
                modified = true;
            }
            if (content.includes("`http://127.0.0.1:5000")) {
                content = content.replace(/`http:\/\/127\.0\.0\.1:5000(.*?)`/g, "`${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'}$1`");
                modified = true;
            }
            if (content.includes("'ws://127.0.0.1:5000")) {
                content = content.replace(/'ws:\/\/127\.0\.0\.1:5000(.*?)'/g, "`${import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:5000'}$1`");
                modified = true;
            }
            if (content.includes("`ws://127.0.0.1:5000")) {
                content = content.replace(/`ws:\/\/127\.0\.0\.1:5000(.*?)`/g, "`${import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:5000'}$1`");
                modified = true;
            }
            
            if (modified) {
                fs.writeFileSync(fullPath, content);
                console.log('Updated', fullPath);
            }
        }
    }
}
replaceInDir('C:/new project/src');
