# API Configuration

## API Providers

### 1. OpenRouter API
- **Endpoint**: https://openrouter.ai/api/v1/chat/completions
- **Authentication**: Bearer token in Authorization header
- **Key Storage**: `settings.openrouterApiKey`
- **Model Storage**: `settings.openrouterModel`
- **Default Models**:
  - openai/gpt-4o-mini
  - anthropic/claude-3-5-haiku-latest
  - anthropic/claude-3-7-sonnet-latest
- **Model List Endpoint**: https://openrouter.ai/api/v1/models
- **Error Handling**: Retry on 429/5xx with exponential backoff

### 2. Google Gemini API
- **Endpoint**: https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
- **Authentication**: API key as query parameter (?key=)
- **Key Storage**: `settings.geminiApiKey`
- **Model Storage**: `settings.geminiModel`
- **Default Model**: gemini-1.5-flash
- **Model List Endpoint**: https://generativelanguage.googleapis.com/v1beta/models?key={apiKey}
- **Batch Support**: `translateBatchStructured()` for multiple texts
- **Special Features**: Structured JSON output for batch translations

### 3. Ollama (Local)
- **Endpoint**: http://localhost:11434/api/chat
- **Server Setting**: `settings.ollamaServer` (default: http://localhost:11434)
- **Model Storage**: `settings.ollamaModel`
- **Authentication**: None required
- **Model List Endpoint**: {server}/api/tags
- **CORS Requirement**: Set OLLAMA_ORIGINS environment variable
- **Error Handling**: User-friendly messages for connection issues

### 4. LM Studio (OpenAI Compatible)
- **Endpoint**: http://localhost:1234/v1/chat/completions
- **Server Setting**: `settings.lmstudioServer` (default: http://localhost:1234)
- **Model Storage**: `settings.lmstudioModel`
- **Authentication**: Optional API key in `settings.lmstudioApiKey`
- **Model List Endpoint**: {server}/v1/models
- **OpenAI Compatible**: Uses standard OpenAI API format

## Key Files and Functions

### src/background/api.js
- `translateText(text, settings)`: Main translation function
- `translateBatchStructured(texts, settings)`: Batch translation (Gemini only)
- `makeApiRequest(url, options, errorMessage, logLevel)`: HTTP request wrapper
- `formatErrorDetails(error, settings)`: Error formatting with API key masking
- `getSystemPrompt(settings)`: Returns custom or default system prompt

### src/background/settings.js
- `validateApiKey(apiKey, apiProvider)`: API key validation
- `fetchAvailableModels(apiProvider, apiKey, server)`: Dynamic model fetching
- Default settings and storage management

## Translation System Prompt
- Customizable via Features tab
- Default: "あなたは優秀な日本語翻訳者です。与えられたテキストを自然で読みやすい日本語に翻訳してください。専門用語は適切に処理し、文脈を考慮して最適な翻訳を提供してください。"
- Stored in `settings.translationSystemPrompt`

## Page Translation Settings
- **Separator Token**: `settings.pageSeparatorToken` (default: "[[[SEP]]]")
- **Max Chars per Chunk**: `settings.pageMaxCharsPerChunk` (default: 8000)
- **Max Items per Chunk**: `settings.pageMaxItemsPerChunk` (default: 50)
- **Chunks per Pass**: `settings.pageChunksPerPass` (default: 5)
- **Delay Between Chunks**: `settings.pageDelayBetweenChunks` (default: 1000ms)

## Error Handling
- Exponential backoff for rate limiting (429 status)
- Retry logic for server errors (5xx status)
- User-friendly error messages with masked API keys
- Fallback display via chrome.scripting API when content script unavailable