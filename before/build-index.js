const fs = require('fs');
const path = require('path');

const films = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'films.json'), 'utf8'));
const template = fs.readFileSync(path.join(__dirname, 'index.template.html'), 'utf8');
const out = template.replace('__FILM_DATA__', JSON.stringify(films));
fs.writeFileSync(path.join(__dirname, 'index.html'), out);
console.log('Wrote index.html (' + out.length + ' bytes) with', films.length, 'films embedded.');
