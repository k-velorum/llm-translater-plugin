# Current Architecture (2025-08-09)

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

3. **Ollama (Local LLM)**
   - Local server communication (http://localhost:11434)
   - No authentication required
   - Dynamic model fetching from local server
   - Server must be running locally

4. **LM Studio (OpenAI Compatible)**
   - Local OpenAI-compatible server (http://localhost:1234)
   - Optional API key authentication
   - Dynamic model fetching from local server
   - Server must be running locally

## Core Components

### Background Script (`background.js` + `src/background/`)
- **api.js**: Handles all LLM API communication
  - `callLLMAPI()`: Main translation endpoint with retry logic (429/5xx status)
  - `validateApiKey()`: Key validation
  - `fetchAvailableModels()`: Dynamic model loading
  - `makeApiRequest()`: Common API request handler with exponential backoff
  - Special separator token `[[[SEP]]]` handling for page translation
- **message-handlers.js**: Chrome runtime message processing
- **settings.js**: Chrome storage sync management
- **event-listeners.js**: Extension events (install, context menu, shortcuts)
  - Page translation session management
  - Chunked page translation with continuation UI
  - Translation cancellation support

### Content Script (`content.js`)
- Text selection translation popups
- Twitter/X.com tweet translation button injection
- Page-wide translation functionality with chunked processing
- Continuation UI for incremental page translation
- MutationObserver for dynamic content
- Node snapshots to prevent content mismatch during translation

### Popup UI (`popup.html` + `popup.js`)
- Two-tab interface: Settings & Test
- jQuery + Select2 for enhanced dropdowns with search functionality re-enabled
- Live API key validation
- Model selection per provider with proper value restoration
- Support for both cloud and local LLM providers
- Fixed double focus and click detection issues in Select2

## Message Flow
```
User Action → Content Script → Background Script → LLM API
                     ↓                   ↓            ↓
              Translation UI ← Message Handler ← API Response
```

## Key Features
- **Keyboard Shortcut**: Ctrl/Cmd+Shift+T for quick translation
- **Context Menu**: Right-click translation option (selection and full page)
- **Twitter Integration**: Auto-injected translate buttons
- **Page Translation**: Chunked processing with continuation UI
- **Settings Sync**: Chrome storage with validation
- **Error Handling**: User-friendly error messages with fallback and retry logic
- **Local LLM Support**: Ollama and LM Studio integration

## Recent Improvements (2025-08-09)
- **Page Translation Stability**: Small chunk sequential processing with UI feedback
- **Continuation Button**: Disabled initially, enabled after processing completion
- **API Retry Logic**: Exponential backoff for 429/5xx errors with Retry-After header support
- **Select2 Fixes**: Resolved model selection issues and re-enabled search functionality
- **Logging Improvements**: Changed local model fetch failures from error to info level

## Technical Stack
- Manifest V3 with ES modules
- jQuery 3.7.1 + Select2 4.0.13
- chrome.storage.sync for persistence
- Direct CORS-enabled API calls
- Local server support for privacy-focused setups