# API Integration Details

## Supported LLM Providers

### OpenRouter API
- **Endpoint**: `https://openrouter.ai/api/v1/chat/completions`
- **Proxy Endpoint**: `http://localhost:3000/api/openrouter`
- **Models**: Dynamic list fetched from OpenRouter
- **Authentication**: Bearer token in Authorization header
- **CORS**: Requires proxy server

### Google Gemini API
- **Endpoint**: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- **Direct Access**: No proxy needed
- **Models**: gemini-1.5-flash, gemini-1.5-pro, gemini-1.0-pro
- **Authentication**: API key as query parameter
- **CORS**: Allowed from browser

### Anthropic API
- **Endpoint**: `https://api.anthropic.com/v1/messages`
- **Proxy Endpoint**: `http://localhost:3000/api/anthropic`
- **Models**: Claude models (dynamic list)
- **Authentication**: x-api-key header
- **CORS**: Requires proxy server

## Message Flow
1. **Direct API Call** (attempted first):
   - Browser → API Provider
   - Works for Gemini, fails for OpenRouter/Anthropic due to CORS

2. **Proxy Fallback** (on CORS error):
   - Browser → Proxy Server (localhost:3000)
   - Proxy Server → API Provider
   - Handles authentication headers server-side

## Error Handling
- **Network Errors**: Retry with exponential backoff
- **CORS Errors**: Automatic fallback to proxy
- **API Errors**: Display user-friendly messages
- **Rate Limits**: Show specific rate limit message
- **Invalid Keys**: Validation endpoint checks

## Translation Prompt Structure
```javascript
{
  role: "system",
  content: "あなたは翻訳者です。以下のテキストを日本語に翻訳してください。..."
}
{
  role: "user", 
  content: [text to translate]
}
```