const express = require('express');
const cors = require('cors');
const axios = require('axios');
const morgan = require('morgan');
const winston = require('winston');
const path = require('path');
const fs = require('fs');
const dns = require('dns').promises; // promisesバージョンを使用

// ロガーの設定
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(logsDir, 'combined.log') }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

const app = express();
const PORT = process.env.PORT || 3000;

// ミドルウェア
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// DNSの設定を確認（修正版）
app.get('/dns-check', async (req, res) => {
  try {
    const hostname = req.query.hostname || 'openrouter.ai';
    logger.info(`DNSの解決を確認中: ${hostname}`);
    
    try {
      // DNS.promises.lookupを使用
      const { address, family } = await dns.lookup(hostname);
      logger.info(`DNS解決成功: ${hostname} -> ${address} (IPv${family})`);
      res.status(200).json({ 
        hostname, 
        address, 
        family: `IPv${family}` 
      });
    } catch (dnsError) {
      logger.error(`DNS解決エラー: ${hostname}`, { error: dnsError });
      res.status(500).json({ 
        error: `DNS解決エラー: ${hostname}`, 
        details: dnsError.message,
        code: dnsError.code
      });
    }
  } catch (error) {
    logger.error('DNSチェックエラー', { error });
    res.status(500).json({ 
      error: 'DNSチェックエラー', 
      details: error.message,
      code: error.code
    });
  }
});

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// OpenRouter APIプロキシエンドポイント
app.post('/api/openrouter', async (req, res) => {
  const { apiKey, model, messages } = req.body;
  
  if (!apiKey) {
    return res.status(400).json({ error: 'OpenRouter APIキーが必要です' });
  }
  
  if (!model) {
    return res.status(400).json({ error: 'モデル名が必要です' });
  }
  
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messagesは配列である必要があります' });
  }
  
  try {
    // DNSの解決を確認
    logger.info('OpenRouter APIリクエスト開始', { model });
    logger.info('DNSの解決を確認中: openrouter.ai');
    
    // DNSの解決を試みる
    try {
      const { address, family } = await dns.lookup('openrouter.ai');
      logger.info(`DNS解決成功: openrouter.ai -> ${address} (IPv${family})`);
    } catch (dnsError) {
      logger.error('DNSの解決に失敗しました。代替のIPアドレスを使用します。', { error: dnsError });
      // DNSの解決に失敗した場合は、代替のIPアドレスを使用する
      // 注意: これは一時的な対応策です
    }
    
    // 正しいURLを使用
    const apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
    logger.info(`OpenRouter APIリクエスト送信先: ${apiUrl}`);
    
    const response = await axios.post(apiUrl, {
      model,
      messages
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'X-Title': 'LLM Translation Plugin'
      },
      timeout: 30000, // 30秒のタイムアウト
      proxy: false // プロキシを使用しない
    });
    
    logger.info('OpenRouter API成功レスポンス');
    res.status(200).json(response.data);
  } catch (error) {
    handleApiError(error, res, 'OpenRouter');
  }
});

// Anthropic APIプロキシエンドポイント
app.post('/api/anthropic', async (req, res) => {
  const { apiKey, model, system, messages, max_tokens } = req.body;
  
  if (!apiKey) {
    return res.status(400).json({ error: 'Anthropic APIキーが必要です' });
  }
  
  if (!model) {
    return res.status(400).json({ error: 'モデル名が必要です' });
  }
  
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messagesは配列である必要があります' });
  }
  
  try {
    logger.info('Anthropic APIリクエスト開始', { model });
    
    const response = await axios.post('https://api.anthropic.com/v1/messages', {
      model,
      system,
      messages,
      max_tokens: max_tokens || 1024
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      timeout: 30000 // 30秒のタイムアウト
    });
    
    logger.info('Anthropic API成功レスポンス');
    res.status(200).json(response.data);
  } catch (error) {
    handleApiError(error, res, 'Anthropic');
  }
});

// OpenRouter APIキー検証エンドポイント
app.post('/api/verify/openrouter', async (req, res) => {
  const { apiKey } = req.body;
  
  if (!apiKey) {
    return res.status(400).json({ error: 'APIキーが必要です' });
  }
  
  try {
    logger.info('OpenRouter APIキー検証開始');
    
    // 正しいURLを使用
    const response = await axios.get('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Title': 'LLM Translation Plugin'
      },
      timeout: 10000 // 10秒のタイムアウト
    });
    
    logger.info('OpenRouter APIキー検証成功');
    res.status(200).json({
      isValid: true,
      message: 'APIキーは有効です',
      models: response.data.data ? response.data.data.length : 'データ形式が不明'
    });
  } catch (error) {
    handleApiError(error, res, 'OpenRouter APIキー検証');
  }
});

// Anthropic APIキー検証エンドポイント
app.post('/api/verify/anthropic', async (req, res) => {
  const { apiKey } = req.body;
  
  if (!apiKey) {
    return res.status(400).json({ error: 'APIキーが必要です' });
  }
  
  try {
    logger.info('Anthropic APIキー検証開始');
    
    const response = await axios.get('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      timeout: 10000 // 10秒のタイムアウト
    });
    
    logger.info('Anthropic APIキー検証成功');
    res.status(200).json({
      isValid: true,
      message: 'APIキーは有効です',
      models: response.data.models ? response.data.models.length : 'データ形式が不明'
    });
  } catch (error) {
    handleApiError(error, res, 'Anthropic APIキー検証');
  }
});

// Anthropicモデル一覧取得エンドポイント
app.post('/api/models/anthropic', async (req, res) => {
  const { apiKey } = req.body;
  
  if (!apiKey) {
    return res.status(400).json({ error: 'APIキーが必要です' });
  }
  
  try {
    logger.info('Anthropicモデル一覧取得開始');
    
    const response = await axios.get('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      timeout: 10000 // 10秒のタイムアウト
    });
    
    logger.info('Anthropicモデル一覧取得成功');
    res.status(200).json({
      models: response.data.models || []
    });
  } catch (error) {
    handleApiError(error, res, 'Anthropicモデル一覧取得');
  }
});

// エラーハンドリング関数
function handleApiError(error, res, apiName) {
  logger.error(`${apiName} APIエラー`, { 
    message: error.message,
    stack: error.stack
  });
  
  if (error.code === 'ENOTFOUND') {
    logger.error(`${apiName} DNS解決エラー: ${error.hostname}`, { error });
    return res.status(500).json({
      error: {
        message: `${apiName} DNS解決エラー: ${error.hostname}`,
        details: 'ホスト名を解決できません。ネットワーク接続とDNS設定を確認してください。',
        code: 'ENOTFOUND'
      }
    });
  }
  
  if (error.code === 'ETIMEDOUT') {
    logger.error(`${apiName} タイムアウトエラー`, { error });
    return res.status(500).json({
      error: {
        message: `${apiName} タイムアウトエラー`,
        details: 'リクエストがタイムアウトしました。ネットワーク接続を確認してください。',
        code: 'ETIMEDOUT'
      }
    });
  }
  
  if (error.response) {
    // APIからのレスポンスがある場合
    const statusCode = error.response.status;
    const errorData = error.response.data;
    
    logger.error(`${apiName} APIエラーレスポンス`, { 
      status: statusCode,
      data: errorData
    });
    
    res.status(statusCode).json({
      error: {
        message: `${apiName} APIエラー: ${errorData.error?.message || errorData.error || 'APIエラー'}`,
        details: errorData,
        status: statusCode
      }
    });
  } else if (error.request) {
    // リクエストは送信されたがレスポンスがない場合
    logger.error(`${apiName} APIリクエストエラー: レスポンスなし`, { error: error.message });
    res.status(500).json({
      error: {
        message: `${apiName} APIリクエストエラー: レスポンスがありません`,
        details: 'ネットワーク接続を確認してください',
        code: error.code
      }
    });
  } else {
    // リクエスト設定中のエラー
    logger.error(`${apiName} APIリクエスト設定エラー`, { error: error.message });
    res.status(500).json({
      error: {
        message: `${apiName} APIリクエスト設定エラー: ${error.message}`,
        details: error.stack,
        code: error.code
      }
    });
  }
}

// サーバー起動
app.listen(PORT, () => {
  logger.info(`サーバーが起動しました: http://localhost:${PORT}`);
  
  // 起動時にDNSの解決をテスト
  dns.lookup('openrouter.ai')
    .then(({ address, family }) => {
      logger.info(`起動時のDNS解決成功: openrouter.ai -> ${address} (IPv${family})`);
    })
    .catch(err => {
      logger.error('起動時のDNS解決エラー: openrouter.ai', { error: err });
    });
  
  dns.lookup('api.anthropic.com')
    .then(({ address, family }) => {
      logger.info(`起動時のDNS解決成功: api.anthropic.com -> ${address} (IPv${family})`);
    })
    .catch(err => {
      logger.error('起動時のDNS解決エラー: api.anthropic.com', { error: err });
    });
});