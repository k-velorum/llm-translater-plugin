# LLM Translator Chrome Extension

## Project Purpose
Chrome browser extension (Manifest V3) that translates selected text and Twitter/X.com tweets using Large Language Models (LLMs).

## Core Features
- **Text Selection Translation**: Right-click context menu + keyboard shortcut (Ctrl/Cmd+Shift+T)
- **Twitter/X.com Integration**: Auto-injected translation buttons on tweets via MutationObserver
- **Page Translation**: Full page text node translation through context menu
- **Multi-provider Support**: OpenRouter API and Google Gemini API
- **Dynamic Model Selection**: Real-time model fetching from provider APIs
- **Persistent Settings**: Chrome storage sync for settings across devices

## Technical Stack
- **Platform**: Chrome Extension (Manifest V3)
- **Language**: JavaScript ES6+ with async/await
- **Background**: Service Worker with ES modules (`"type": "module"`)
- **UI Libraries**: jQuery 3.6.0, Select2 4.0.13
- **Storage**: chrome.storage.sync API
- **APIs**: Direct integration with OpenRouter and Google Gemini

## Architecture Highlights
- **Modular Background Scripts**: Separated concerns in `/src/background/`
- **Message-based Communication**: Chrome runtime messaging between scripts
- **Direct API Access**: No proxy server needed, CORS handled by extension
- **Dynamic Content Handling**: MutationObserver for Twitter/X.com
- **Error Recovery**: Graceful fallbacks and user-friendly error messages

## Current State (2025-08-08)
- Clean production code without debug statements
- Two API providers with direct access
- Simplified UI with 2-tab settings interface
- Robust error handling and validation
- Full keyboard shortcut support