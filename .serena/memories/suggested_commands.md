# Development Commands

## Extension Setup
```bash
# Generate required icon files
chmod +x create_icons.sh
./create_icons.sh

# Convert SVG to PNG (using Inkscape)
inkscape icons/icon.svg --export-filename=icons/icon16.png --export-width=16 --export-height=16
inkscape icons/icon.svg --export-filename=icons/icon48.png --export-width=48 --export-height=48
inkscape icons/icon.svg --export-filename=icons/icon128.png --export-width=128 --export-height=128

# Alternative: Convert using ImageMagick
convert icons/icon.svg -resize 16x16 icons/icon16.png
convert icons/icon.svg -resize 48x48 icons/icon48.png
convert icons/icon.svg -resize 128x128 icons/icon128.png
```

## Chrome Extension Installation
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the project directory
5. Note the extension ID for debugging

## Testing the Extension
1. Load extension in Chrome
2. Test text selection translation on any webpage
3. Visit Twitter/X.com to test tweet translation
4. Check console for errors (F12 → Console)
5. Test API connections via popup settings

## Debugging
```bash
# View background script logs
# Chrome: chrome://extensions/ → Details → Inspect views: service worker

# Content script logs
# Open DevTools on any webpage (F12) → Console

# Reload extension
# chrome://extensions/ → Click reload icon
```

## Git Commands
```bash
# Check status
git status

# Stage changes
git add .

# Commit
git commit -m "message"

# View recent commits
git log --oneline -10
```

## File Search & Navigation
```bash
# List files
ls -la

# Search files
find . -name "*.js"

# Search in files (case-insensitive)
grep -r -i "pattern" .

# Check file structure
tree -I 'node_modules|lib' -L 2
```

## API Testing (Direct)
```bash
# Test OpenRouter API
curl -X POST https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o-mini","messages":[{"role":"user","content":"Hello"}]}'

# Test Gemini API
curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"parts":[{"text":"Hello"}]}]}'
```