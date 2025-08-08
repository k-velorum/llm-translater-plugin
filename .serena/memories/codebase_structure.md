# Codebase Structure

## Project Root
```
/
├── manifest.json          # Chrome Extension Manifest V3
├── background.js          # Service worker entry point (ES module)
├── content.js            # Content script for page injection
├── popup.html            # Settings UI HTML
├── popup.js              # Settings UI logic with jQuery/Select2
├── README.md             # Project documentation
├── CLAUDE.md             # AI assistant instructions
└── create_icons.sh       # Icon generation script
```

## Source Directories
```
/src/background/          # Modularized background scripts
├── api.js               # LLM API communication layer
├── message-handlers.js  # Chrome runtime message processing
├── settings.js          # Chrome storage sync management
└── event-listeners.js   # Extension event handlers
```

## Assets
```
/icons/                   # Extension icons
├── icon.svg             # Source vector icon
├── icon16.png           # 16x16 toolbar icon
├── icon48.png           # 48x48 extension icon
└── icon128.png          # 128x128 store icon

/lib/                     # Third-party libraries
├── jquery-3.6.0.min.js
├── select2.min.js
└── select2.min.css
```

## Data Flow Architecture
1. **User Interaction Layer**: Web page → Content script
2. **Message Layer**: Content script ↔ Background script (chrome.runtime)
3. **API Layer**: Background script → LLM APIs (OpenRouter/Gemini)
4. **Storage Layer**: Settings ↔ chrome.storage.sync
5. **UI Layer**: Popup → Background script → Storage

## Key Files Overview
- **background.js**: Imports and initializes all background modules
- **src/background/api.js**: Core translation logic, API calls, error handling
- **src/background/message-handlers.js**: Handles translate, validate, fetch-models messages
- **content.js**: Selection handling, popup creation, Twitter button injection
- **popup.js**: Settings form, API validation, model selection UI