// server.js (改进版)
const express = require('express');
const axios = require('axios');
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();

// 安全中间件
app.use(helmet());

// 只允许来自你域名的请求（部署后替换成你的域名）
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://your-production-domain.com' // 替换
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl) or from allowed list
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.indexOf(origin) !== -1) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'));
    }
  }
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// 简单限流：每 10 分钟每 IP 60 次（按需调整）
const apiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { status: 'error', message: '请求过多，请稍后再试' }
});
app.use('/api/', apiLimiter);

// 从环境变量读取，避免硬编码到代码库
const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY || 'REPLACE_WITH_ENV_VAR';

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 生成回音的 API（服务器端代理）
app.post('/api/generate-capsule', async (req, res) => {
  try {
    const { input } = req.body;
    if (!input || input.trim().length === 0) {
      return res.status(400).json({ status: 'error', message: '缺少 input 字段' });
    }

    // 你可以在这里做额外保护（内容长度、脏词过滤、速率控制等）
    console.log(`[${new Date().toISOString()}] request len=${input.length}`);

    const thirdPartyResp = await axios.post(
      'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      {
        model: "glm-4",
        messages: [{
          role: "user",
          content: `请你扮演5年后的用户本人，基于用户当前的状态和心情，给现在的他/她写一封温暖、鼓励的完整信件。\n\n用户当前的想法是："${input}"\n\n写作要求：\n1. 身份：你是【5年后的用户】，用第一人称"我"来写\n2. 口吻：亲切、真诚、充满希望，像朋友间的私密信件  \n3. 内容：回应当前情绪，分享积极变化，给予温暖祝福\n4. 长度：250-350字，自然流畅\n5. 格式：使用自然的段落分隔，不要使用序号\n\n现在请开始写信：`
        }],
        temperature: 0.8,
        max_tokens: 800
      },
      {
        headers: {
          'Authorization': `Bearer ${ZHIPU_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    // 兼容不同第三方返回结构
    const letter = thirdPartyResp?.data?.choices?.[0]?.message?.content || thirdPartyResp?.data?.text || '';

    if (!letter) {
      throw new Error('第三方返回空结果');
    }

    res.json({
      status: 'success',
      letter,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('generate-capsule error:', err.message || err);

    // 温和降级 -> 返回 fallback（但 status 仍用 success 以便前端显示）
    const fallback = `亲爱的现在的我：\n\n我是未来的你。看到你的分享，我想说：你正在做的每一步都会有意义。给自己一些耐心和温柔，未来会慢慢展开。\n\n—— 未来的你`;

    res.status(200).json({
      status: 'success',
      mode: 'fallback',
      letter: fallback
    });
  }
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '6_index.html'));
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '6_index.html'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Internal server error:', err);
  res.status(500).json({
    status: 'error',
    message: '服务器内部错误'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}:${PORT}`);
});
