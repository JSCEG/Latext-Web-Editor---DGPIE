const fs = require('fs');
const path = require('path');

const files = [
    'App.tsx',
    'components/Dashboard.tsx',
    'components/UserActivityTracker.tsx',
    'components/Button.tsx'
];

const replacements = [
    { from: /text-\[#691C32\]/g, to: 'text-gob-guinda' },
    { from: /bg-\[#691C32\]/g, to: 'bg-gob-guinda' },
    { from: /border-\[#691C32\]/g, to: 'border-gob-guinda' },
    { from: /ring-\[#691C32\]/g, to: 'ring-gob-guinda' },
    { from: /text-\[#BC955C\]/g, to: 'text-gob-gold' },
    { from: /bg-\[#BC955C\]/g, to: 'bg-gob-gold' },
    { from: /border-\[#BC955C\]/g, to: 'border-gob-gold' },
    { from: /\[#691C32\]/g, to: 'gob-guinda' }, 
    { from: /\[#BC955C\]/g, to: 'gob-gold' },
    { from: /\[#541628\]/g, to: 'gob-guinda-dark' }
];

files.forEach(file => {
    const filePath = path.join(__dirname, '..', file);
    if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, 'utf8');
        let original = content;
        replacements.forEach(rep => {
            content = content.replace(rep.from, rep.to);
        });
        if (content !== original) {
            fs.writeFileSync(filePath, content);
            console.log(`Updated ${file}`);
        } else {
            console.log(`No changes in ${file}`);
        }
    } else {
        console.log(`File not found: ${file}`);
    }
});
