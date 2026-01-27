#!/usr/bin/env node
/**
 * Markdown to JSON String Converter
 *
 * Usage:
 *   node scripts/md-to-json.js content/hotspot-15.md
 *   node scripts/md-to-json.js content/hotspot-15.md --copy
 *
 * Converts a Markdown file to a JSON-escaped string ready to paste into data.json
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const args = process.argv.slice(2);
const filePath = args.find(arg => !arg.startsWith('--'));
const shouldCopy = args.includes('--copy');

if (!filePath) {
  console.log(`
Markdown to JSON String Converter

Usage:
  node scripts/md-to-json.js <file.md> [--copy]

Options:
  --copy    Copy result to clipboard (macOS)

Examples:
  node scripts/md-to-json.js content/example.md
  node scripts/md-to-json.js content/example.md --copy
`);
  process.exit(0);
}

try {
  const fullPath = path.resolve(filePath);
  const content = fs.readFileSync(fullPath, 'utf-8');

  // Convert to JSON string (this escapes newlines, quotes, etc.)
  const jsonString = JSON.stringify(content);

  // Remove the trailing \n if present and remove surrounding quotes
  let escaped = jsonString.slice(1, -1);
  if (escaped.endsWith('\\n')) {
    escaped = escaped.slice(0, -2);
  }

  console.log('\n' + '='.repeat(60));
  console.log('COPY EVERYTHING BETWEEN THE LINES BELOW:');
  console.log('='.repeat(60) + '\n');
  console.log(escaped);
  console.log('\n' + '='.repeat(60) + '\n');

  if (shouldCopy) {
    try {
      // Write to temp file to preserve exact content
      const tempFile = '/tmp/md-to-json-output.txt';
      fs.writeFileSync(tempFile, escaped, 'utf-8');
      execSync(`cat "${tempFile}" | pbcopy`);
      console.log('✅ Copied to clipboard!\n');
      console.log('Now paste it as the "description" value in your JSON.\n');
    } catch (e) {
      console.log('⚠️  Could not copy to clipboard\n');
    }
  } else {
    console.log('💡 Tip: Use --copy flag to copy directly to clipboard\n');
  }

} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
