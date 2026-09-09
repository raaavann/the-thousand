// Builds a single, self-contained index.html: data, styles and behaviour are all
// inlined so the file can be opened straight from disk or dropped anywhere with
// no sibling assets and no build step at the other end. The only things fetched
// at runtime are the webfonts and the posters, both of which degrade gracefully.
//
//   node prepare-data.js && node build-index.js

const fs = require('fs');
const path = require('path');

const here = f => path.join(__dirname, f);
const read = f => fs.readFileSync(here(f), 'utf8');

const data = read(path.join('data', 'films.enriched.json'));
const css = read('styles.css');
const skyJs = read('sky.js');
const js = read('script.js');

// </script> inside a JSON payload would end the host <script> element early;
// the escape is invisible to JSON.parse.
const safeData = data.replace(/<\//g, '<\\/');

// Each replacement is a function, not a string. In String.replace, `$&`, `$'` and
// "$`" are substitution patterns, and the payloads genuinely contain them — the
// box-office line in script.js is written as `">$' + compact(f.gross)`, which as a
// replacement string silently splices the rest of the template into the script and
// leaves a file that parses as garbage. A replacer function is copied verbatim.
const out = read('index.template.html')
  .replace('__STYLES__', () => '<style>\n' + css + '\n</style>')
  .replace('__FILM_DATA__', () => safeData)
  .replace('__SKY__', () => '<script>\n' + skyJs + '\n</script>')
  .replace('__SCRIPT__', () => '<script>\n' + js + '\n</script>');

fs.writeFileSync(here('index.html'), out);
console.log('Wrote index.html — ' + (out.length / 1024).toFixed(0) + 'KB, self-contained.');
