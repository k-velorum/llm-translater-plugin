# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Chrome browser extension (Manifest V3) that translates selected text and Twitter/X.com tweets using Large Language Models (LLMs). The extension supports multiple LLM providers: OpenRouter API, Google Gemini API, and Anthropic API.

## Development Setup

### Icons Required
Before loading the extension in Chrome, you must generate the required PNG icons:

```bash
# Generate base SVG icon
chmod +x create_icons.sh
./create_icons.sh

# Convert SVG to PNG icons (choose one method)
# Using Inkscape:
inkscape icons/icon.svg --export-filename=icons/icon16.png --export-width=16 --export-height=16
inkscape icons/icon.svg --export-filename=icons/icon48.png --export-width=48 --export-height=48
inkscape icons/icon.svg --export-filename=icons/icon128.png --export-width=128 --export-height=128

# Using ImageMagick:
convert icons/icon.svg -resize 16x16 icons/icon16.png
convert icons/icon.svg -resize 48x48 icons/icon48.png
convert icons/icon.svg -resize 128x128 icons/icon128.png
```

### Proxy Server Setup
For OpenRouter and Anthropic APIs (CORS workaround):

```bash
cd docker
docker-compose up -d
```

Server runs on `http://localhost:3000` with endpoints:
- `/api/openrouter` - OpenRouter API proxy
- `/api/anthropic` - Anthropic API proxy  
- `/api/verify/openrouter` - OpenRouter API key verification
- `/api/verify/anthropic` - Anthropic API key verification
- `/api/models/anthropic` - Anthropic models list
- `/health` - Health check

## Architecture

### Code Structure
- **`background.js`** - Service worker entry point, imports modularized background scripts
- **`src/background/`** - Modularized background logic:
  - `api.js` - LLM API communication, error handling, fallback logic
  - `message-handlers.js` - Chrome runtime message processing
  - `settings.js` - Settings management with chrome.storage.sync
  - `event-listeners.js` - Chrome extension event handlers (install, context menu, commands)
- **`content.js`** - Injected into web pages, handles:
  - Text selection and translation popups
  - Twitter/X.com tweet translation buttons
  - Page-wide translation functionality
- **`popup.js`** - Settings UI logic with jQuery/Select2 for model selection
- **`docker/server.js`** - Express proxy server for CORS bypass

### Key Features
- **Text Selection Translation**: Right-click context menu + keyboard shortcut (Ctrl+Shift+T / Cmd+Shift+T)
- **Twitter Integration**: Auto-injected translation buttons on tweets using MutationObserver
- **Page Translation**: Full page text node translation via context menu
- **Multi-provider Support**: Dynamic model loading from OpenRouter, Gemini, Anthropic APIs
- **Settings Management**: chrome.storage.sync with fallback defaults and validation
- **CORS Workaround**: Automatic fallback from direct API calls to proxy server for OpenRouter/Anthropic

### Message Flow
1. Content script → Background script via `chrome.runtime.sendMessage`
2. Background script processes via `message-handlers.js`
3. API calls through `api.js` with automatic proxy fallback
4. Results returned to content script for UI display

## Development Notes

- Extension uses Manifest V3 with service worker background script
- Background scripts are ES modules (`"type": "module"` in manifest)
- Settings are stored in `chrome.storage.sync` with default values
- Twitter integration uses MutationObserver for dynamic content
- Select2 library used for enhanced model selection dropdowns
- API key validation includes live testing against actual endpoints
- Automatic retry logic: direct API → proxy server on CORS failure