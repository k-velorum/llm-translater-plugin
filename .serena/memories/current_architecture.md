# Current Architecture (2025-08-08)

## System Overview
Chrome Extension (Manifest V3) for LLM-based translation of web text and Twitter/X.com tweets.

## Supported API Providers
1. **OpenRouter API**
   - Direct browser-to-API communication
   - Dynamic model selection with Select2 dropdown
   - Default models: GPT-4o-mini, Claude 3.5 Haiku, Claude 3.7 Sonnet
   - Bearer token authentication

2. **Google Gemini API**  
   - Direct browser-to-API communication
   - Dynamic model fetching from API
   - Default model: gemini-1.5-flash
   - API key as query parameter

## Core Components

### Background Script (`background.js` + `src/background/`)
- **api.js**: Handles all LLM API communication
  - `callLLMAPI()`: Main translation endpoint
  - `validateApiKey()`: Key validation
  - `fetchAvailableModels()`: Dynamic model loading
- **message-handlers.js**: Chrome runtime message processing
- **settings.js**: Chrome storage sync management
- **event-listeners.js**: Extension events (install, context menu, shortcuts)

### Content Script (`content.js`)
- Text selection translation popups
- Twitter/X.com tweet translation button injection
- Page-wide translation functionality
- MutationObserver for dynamic content

### Popup UI (`popup.html` + `popup.js`)
- Two-tab interface: Settings & Test
- jQuery + Select2 for enhanced dropdowns
- Live API key validation
- Model selection per provider

## Message Flow
```
User Action → Content Script → Background Script → LLM API
                     ↓                   ↓            ↓
              Translation UI ← Message Handler ← API Response
```

## Key Features
- **Keyboard Shortcut**: Ctrl/Cmd+Shift+T for quick translation
- **Context Menu**: Right-click translation option
- **Twitter Integration**: Auto-injected translate buttons
- **Settings Sync**: Chrome storage with validation
- **Error Handling**: User-friendly error messages with fallback

## Technical Stack
- Manifest V3 with ES modules
- jQuery 3.7.1 + Select2 4.0.13
- chrome.storage.sync for persistence
- Direct CORS-enabled API calls