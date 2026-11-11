// Loads the browser modules into Node exactly as the page does (same files, no build step).
globalThis.Astronomy = require('astronomy-engine');
require('../js/core/engine.js');
require('../js/core/scanner.js');
require('../js/data/session.js');
require('../js/data/providers.js');
const fs = require('fs'), path = require('path');
const sample = fs.readFileSync(path.join(__dirname, '../js/data/sample-xau.js'), 'utf8');
globalThis.window = undefined;
const SAMPLE = JSON.parse(sample.slice(sample.indexOf('=') + 1).trim().replace(/;$/, ''));
module.exports = { G: globalThis.GannEngine, S: globalThis.GannScanner, D: globalThis.GannData, A: globalThis.Astronomy, SAMPLE };
