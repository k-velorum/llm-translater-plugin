# LLM Translator Chrome Extension

## Project Purpose
Chrome browser extension (Manifest V3) that translates selected text and Twitter/X.com tweets using Large Language Models (LLMs).

## Core Features
- **Text Selection Translation**: Right-click context menu + keyboard shortcut (Ctrl/Cmd+Shift+T)
- **Twitter/X.com Integration**: Auto-injected translation buttons on tweets via MutationObserver
- **Page Translation**: Full page text node translation through context menu with chunked processing
- **Multi-provider Support**: OpenRouter API, Google Gemini API, Ollama, and LM Studio
- **Dynamic Model Selection**: Real-time model fetching from provider APIs
- **Persistent Settings**: Chrome storage sync for settings across devices

## Technical Stack
- **Platform**: Chrome Extension (Manifest V3)
- **Language**: JavaScript ES6+ with async/await
- **Background**: Service Worker with ES modules (`"type": "module"`)
- **UI Libraries**: jQuery 3.7.1, Select2 4.0.13
- **Storage**: chrome.storage.sync API
- **APIs**: Direct integration with OpenRouter, Google Gemini, Ollama, and LM Studio

## Architecture Highlights
- **Modular Background Scripts**: Separated concerns in `/src/background/`
- **Message-based Communication**: Chrome runtime messaging between scripts
- **Direct API Access**: No proxy server needed, CORS handled by extension
- **Dynamic Content Handling**: MutationObserver for Twitter/X.com
- **Error Recovery**: Graceful fallbacks, retry logic, and user-friendly error messages
- **Chunked Page Translation**: Stable processing with continuation UI

## Current State (2025-08-09)
- Production-ready code with enhanced stability
- Four API providers (2 cloud, 2 local) with direct access
- Improved page translation with small chunk sequential processing
- Fixed UI issues in Select2 dropdowns
- Enhanced API retry logic with exponential backoff
- Full keyboard shortcut support