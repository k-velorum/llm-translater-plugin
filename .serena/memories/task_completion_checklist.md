# Task Completion Checklist

## When Modifying Extension Code

### Before Starting
1. Ensure icons are generated (run `create_icons.sh` if needed)
2. Check if proxy server is needed (for OpenRouter/Anthropic APIs)
3. Load extension in Chrome developer mode for testing

### During Development
1. Follow ES6+ JavaScript conventions
2. Use async/await for asynchronous operations
3. Handle errors with try-catch blocks
4. Add console logging for debugging
5. Test in Chrome after each change (reload extension)

### After Code Changes
1. **Test Core Functionality**:
   - Text selection translation
   - Twitter/X.com button injection
   - Settings persistence
   - API connection (all providers)

2. **Verify Chrome Extension**:
   - Reload extension in `chrome://extensions/`
   - Check for errors in extension details
   - Open DevTools console on test pages
   - Test keyboard shortcuts

3. **Check Proxy Server** (if modified):
   - Restart Docker container
   - Verify health endpoint
   - Test CORS bypass functionality

### Before Committing
1. Remove debug console.log statements
2. Verify all API keys are in .env (not hardcoded)
3. Test all three API providers
4. Ensure no JavaScript errors in console
5. Verify settings save/load correctly

## Testing Checklist
- [ ] Extension loads without errors
- [ ] Context menu appears on text selection
- [ ] Keyboard shortcut works (Ctrl/Cmd+Shift+T)
- [ ] Translation popup displays correctly
- [ ] Twitter/X.com buttons inject properly
- [ ] Settings popup opens and saves
- [ ] API keys validate correctly
- [ ] Model selection updates dynamically
- [ ] Translation requests succeed
- [ ] Error messages display appropriately

## Common Issues to Check
- CORS errors → Ensure proxy server is running
- API failures → Verify API keys and endpoints
- UI not updating → Check content script injection
- Settings not saving → Verify chrome.storage permissions