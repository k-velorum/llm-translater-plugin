# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

⚠️ **CRITICAL PRIORITY:**
If the conditions for using Serena MCP are met, **ALWAYS use it**.
No exceptions.
## Quick Reference: When to Use Serena Tools

1. **Code Understanding / Exploration**

`get_symbols_overview`: A bird’s-eye view of top-level symbols per directory/file. Start here to get the map.

`find_symbol`: Search for functions/classes/variables by name (partial match). For searches with a clear target.

`find_referencing_symbols`: Reverse lookup of callers/references. For identifying the scope of impact.

`read_file`: Read only the minimal necessary fragments. Reading the entire file is a last resort.

**Anti-pattern:** Don’t immediately fall back to `search_for_pattern` (regex). First, improve accuracy with symbol search.

2. **Implementation / Modification**

`replace_symbol_body`: Replace the entire body of an existing function/class. For major overhauls or bug fixes.

`insert_before_symbol` / `insert_after_symbol`: Safely add nearby without breaking the existing structure.

`create_text_file` / `list_dir` / `find_file`: For creating new files or checking their placement.

`replace_regex`: Broad superficial replacements (e.g., changing log tags). Do not use for semantic changes.

3. **Bug Reproduction / Verification / Quality**

`execute_shell_command`: Run tests/linters/builds. In principle, follow the loop: verify here ⇒ fix ⇒ re-run.

`summarize_changes`: Output a summary of changes to prepare review materials.

`restart_language_server`: Recovery when external edits or LSP malfunction occur.

4. **Project Initialization / Context**

`onboarding` / `check_onboarding_performed`: Automatically infer build/test steps and key configurations. Always run on first use.

`prepare_for_new_conversation`: Re-read minimal information needed when resuming a session.

`list_memories` / `write_memory` / `read_memory` / `delete_memory`: Lightweight memory in `.serena/memories/` to persist rules, key paths, etc.

5. **Optional (Enable as Needed)**

`insert_at_line` / `replace_lines` / `delete_lines`: Line-based precise edits (use with understanding of conflict risks).

`initial_instructions` / `get_current_config` / `switch_modes`: For cases where the client cannot pass a system prompt, or when you want to switch modes.
## Project Overview

This is a Chrome browser extension (Manifest V3) that translates selected text and Twitter/X.com tweets using Large Language Models (LLMs). The extension supports multiple LLM providers: OpenRouter API and Google Gemini API.

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

### Key Features
- **Text Selection Translation**: Right-click context menu + keyboard shortcut (Ctrl+Shift+T / Cmd+Shift+T)
- **Twitter Integration**: Auto-injected translation buttons on tweets using MutationObserver
- **Page Translation**: Full page text node translation via context menu
- **Multi-provider Support**: Dynamic model loading from OpenRouter, Gemini APIs
- **Settings Management**: chrome.storage.sync with fallback defaults and validation
- **CORS Workaround**: Direct API calls for supported providers

### Message Flow
1. Content script → Background script via `chrome.runtime.sendMessage`
2. Background script processes via `message-handlers.js`
3. API calls through `api.js`
4. Results returned to content script for UI display

## Development Notes

- Extension uses Manifest V3 with service worker background script
- Background scripts are ES modules (`"type": "module"` in manifest)
- Settings are stored in `chrome.storage.sync` with default values
- Twitter integration uses MutationObserver for dynamic content
- Select2 library used for enhanced model selection dropdowns
- API key validation includes live testing against actual endpoints
