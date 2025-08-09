# Current Architecture (2025-08-09)

## System Overview
Chrome Extension (Manifest V3) for LLM-based translation of web text, Twitter/X.com tweets, and YouTube comments.

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
- **settings.js**: Chrome storage sync management with feature flags
  - `enableTwitterTranslation`: Twitter translation feature toggle
  - `enableYoutubeTranslation`: YouTube translation feature toggle
- **event-listeners.js**: Extension events (install, context menu, shortcuts)
  - Page translation session management
  - Chunked page translation with continuation UI
  - Translation cancellation support
  - Fallback translation display via chrome.scripting API

### Content Script (`content.js`)
- Text selection translation popups
- Twitter/X.com tweet translation button injection
- YouTube comment translation functionality
- Page-wide translation functionality with chunked processing
- Continuation UI for incremental page translation
- MutationObserver for dynamic content on Twitter and YouTube
- Node snapshots to prevent content mismatch during translation
- Feature toggle support with real-time enable/disable

### Popup UI (`popup.html` + `popup.js`)
- Three-tab interface: Settings, Features & Test
  - **Settings Tab**: API provider configuration
  - **Features Tab**: Platform-specific feature toggles (Twitter/YouTube)
  - **Test Tab**: Translation testing interface
- jQuery + Select2 for enhanced dropdowns with search functionality
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
- **Twitter Integration**: Auto-injected translate buttons with JP icon
- **YouTube Integration**: Per-comment translation buttons
- **Page Translation**: Chunked processing with continuation UI
- **Settings Sync**: Chrome storage with validation
- **Error Handling**: User-friendly error messages with fallback and retry logic
- **Local LLM Support**: Ollama and LM Studio integration
- **Fallback Display**: Direct popup injection when content script unavailable

## Platform-Specific Features

### Twitter/X.com Translation
- Automatic button injection on all tweets
- Toggle translation display on button click
- JP icon with loading spinner
- Feature can be disabled via Features tab

### YouTube Comment Translation
- Translation button for each comment
- Reuses Twitter's JP icon design
- Toggle translation display functionality
- Feature can be disabled via Features tab

## Recent Improvements (2025-08-09)
- **YouTube Support**: Added comment-level translation buttons
- **Feature Toggles**: Platform-specific enable/disable in Features tab
- **Real-time Toggle**: Instant apply/remove of translation features
- **Fallback Display**: chrome.scripting API for content script failures
- **Page Translation Stability**: Small chunk sequential processing with UI feedback
- **API Retry Logic**: Exponential backoff for 429/5xx errors
- **UI Improvements**: Fixed Select2 issues and re-enabled search

## Technical Stack
- Manifest V3 with ES modules
- jQuery 3.7.1 + Select2 4.0.13
- chrome.storage.sync for persistence
- chrome.scripting API for fallback injection
- Direct CORS-enabled API calls
- Local server support for privacy-focused setups