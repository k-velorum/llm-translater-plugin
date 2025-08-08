# Code Style and Conventions

## JavaScript Style
- **ES6+ Features**: Arrow functions, async/await, template literals, destructuring
- **Module System**: ES modules for background scripts (`type: "module"` in manifest)
- **Async Patterns**: Extensive use of async/await for API calls and Chrome APIs
- **Error Handling**: Try-catch blocks with detailed error logging and user feedback

## Naming Conventions
- **Functions**: camelCase (e.g., `translateText`, `getSettings`, `makeApiRequest`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `DEFAULT_SETTINGS`, `API_ENDPOINTS`)
- **Classes/Constructors**: PascalCase (e.g., `ApiUtils`)
- **File Names**: kebab-case for modules (e.g., `message-handlers.js`)

## Code Organization
- **Modular Architecture**: Separate concerns into distinct modules
- **Export/Import**: Named exports for functions, default exports avoided
- **Configuration**: Settings stored in chrome.storage.sync with fallback defaults
- **API Abstraction**: Unified interface for multiple LLM providers

## Best Practices
- **No inline scripts**: All JavaScript in separate files (CSP compliance)
- **Defensive Programming**: Input validation, null checks, fallback values
- **Logging**: Console logging for debugging, structured error messages
- **Chrome API Usage**: Proper permission checks, graceful degradation

## Comments and Documentation
- Minimal inline comments (code should be self-documenting)
- Japanese comments/strings for user-facing content
- English for internal code and logging