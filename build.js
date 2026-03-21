#!/usr/bin/env node
'use strict';

const { buildSync } = require('esbuild');
const { mkdirSync }  = require('fs');

mkdirSync('dist', { recursive: true });

buildSync({
  stdin: {
    contents: `
var Buffer = require('buffer').Buffer;
globalThis.Buffer = Buffer;
module.exports = require('./index.js');
`,
    resolveDir: __dirname,
  },
  bundle:     true,
  format:     'iife',
  globalName: 'Cs2MaskedInspect',
  platform:   'browser',
  outfile:    'dist/cs2-masked-inspect.min.js',
  minify:     true,
});

console.log('Built dist/cs2-masked-inspect.min.js');
