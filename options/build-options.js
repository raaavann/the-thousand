// Generates options.html by embedding the real sample dataset into a template.
// Not part of the final artifact — a design-comparison tool for direction-choice only.
const fs = require('fs');
const path = require('path');

const sample = JSON.parse(fs.readFileSync(path.join(__dirname, 'sample-data.json'), 'utf8'));
const dataJson = JSON.stringify(sample);

const GENRE_ORDER = ['Drama','Comedy','Crime','Adventure','Action','Thriller','Romance','Biography','Mystery','Animation','Sci-Fi','Fantasy','History','Family','War','Music','Horror','Western','Film-Noir','Sport','Musical'];

const template = fs.readFileSync(path.join(__dirname, 'options.template.html'), 'utf8');
const out = template
  .replace('__SAMPLE_DATA__', dataJson)
  .replace('__GENRE_ORDER__', JSON.stringify(GENRE_ORDER));

fs.writeFileSync(path.join(__dirname, 'options.html'), out);
console.log('Wrote options.html (' + out.length + ' bytes) with', sample.length, 'sample films.');
