# LLM Translator Chrome Extension

## Project Purpose
A Chrome browser extension (Manifest V3) that translates selected text and Twitter/X.com tweets using Large Language Models (LLMs). 

## Key Features
- **Text Selection Translation**: Right-click context menu + keyboard shortcut (Ctrl+Shift+T / Cmd+Shift+T)
- **Twitter/X.com Integration**: Auto-injected translation buttons on tweets using MutationObserver
- **Page-wide Translation**: Full page text node translation via context menu
- **Multi-provider Support**: Supports OpenRouter API, Google Gemini API, and Anthropic API
- **Dynamic Model Selection**: Users can choose from various models per provider
- **Settings Management**: Persistent settings storage via chrome.storage.sync

## Tech Stack
- **Platform**: Chrome Extension (Manifest V3)
- **Language**: JavaScript (ES6+ with async/await)
- **Background**: Service Worker with ES modules
- **UI Libraries**: jQuery 3.6.0, Select2 4.0.13 for enhanced dropdowns
- **Backend**: Node.js/Express proxy server for CORS bypass
- **Container**: Docker for proxy server deployment
- **APIs**: OpenRouter, Google Gemini, Anthropic Claude

## Architecture Overview
- Service worker-based background script (modular architecture)
- Content scripts injected into all web pages
- Express proxy server to handle CORS restrictions
- Settings popup with model selection and API key management