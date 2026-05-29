const fs = require('fs');
const file = 'src/App.tsx';
let data = fs.readFileSync(file, 'utf8');

// Replace all occurrences of text-zinc-400 in labels with text-zinc-600
data = data.replace(/<label(.*?)text-zinc-400(.*?)>/g, '<label$1text-zinc-600$2>');

fs.writeFileSync(file, data);
console.log('Done');
