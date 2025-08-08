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

## Proxy Server
```bash
# Start proxy server with Docker
cd docker
docker-compose up -d

# Stop proxy server
docker-compose down

# View logs
docker-compose logs -f

# Development mode (with nodemon)
cd docker
npm install
npm run dev
```

## Chrome Extension Installation
1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select the project directory

## Git Commands (macOS/Darwin)
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

## System Utilities (macOS/Darwin)
```bash
# List files
ls -la

# Search files
find . -name "*.js"

# Search in files (case-insensitive)
grep -r -i "pattern" .

# Open in default editor
open filename

# Check port usage
lsof -i :3000
```

## Testing the Extension
1. Load extension in Chrome
2. Test text selection translation on any webpage
3. Visit Twitter/X.com to test tweet translation
4. Check console for errors (F12 → Console)
5. Test API connections via popup settings

## API Endpoints (Proxy Server)
- Health check: `curl http://localhost:3000/health`
- Verify OpenRouter: `curl -X POST http://localhost:3000/api/verify/openrouter -H "Content-Type: application/json" -d '{"apiKey":"YOUR_KEY"}'`
- Verify Anthropic: `curl -X POST http://localhost:3000/api/verify/anthropic -H "Content-Type: application/json" -d '{"apiKey":"YOUR_KEY"}'`