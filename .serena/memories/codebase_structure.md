# Codebase Structure

## Root Directory
- `manifest.json` - Chrome extension manifest (V3)
- `background.js` - Service worker entry point
- `content.js` - Content script injected into pages
- `popup.html` / `popup.js` - Settings UI
- `CLAUDE.md` - Codebase instructions for AI assistants
- `create_icons.sh` - Icon generation script

## `/src/background/` - Modularized Background Scripts
- `api.js` - LLM API communication, error handling, fallback logic
- `message-handlers.js` - Chrome runtime message processing
- `settings.js` - Settings management with chrome.storage.sync
- `event-listeners.js` - Chrome extension event handlers

## `/docker/` - Proxy Server
- `server.js` - Express proxy server for CORS bypass
- `package.json` - Node.js dependencies
- `docker-compose.yml` - Container configuration
- `Dockerfile` - Container image definition

## `/icons/` - Extension Icons
- Generated PNG icons (16x16, 48x48, 128x128)
- Source SVG icon

## `/lib/` - Third-party Libraries
- jQuery and Select2 libraries for UI

## Key Data Flow
1. User interaction → Content script
2. Content script → Background script (via chrome.runtime.sendMessage)
3. Background script → API (direct or via proxy)
4. Response → Background script → Content script → UI update