import express from 'express';
import crypto from 'crypto';
import { handleMessage } from './bot.js';

const app = express();
const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'doi_verify_token_nay';
const APP_SECRET = process.env.APP_SECRET || '';

app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));
app.use(express.static('public'));
function verifySignature(req) {
  if (!APP_SECRET) return true;
  const sig = req.headers['x-hub-signature-256'] || '';
  const expected =
    'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(req.rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  } catch {
    return false;
  }
}

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook đã được Meta xác minh.');
    return res.status(200).send(challenge);
  }
  return res.sendStatus(403);
});

app.post('/webhook', (req, res) => {
  if (!verifySignature(req)) {
    console.error('Webhook: sai chữ ký (401) — kiểm tra lại APP_SECRET trên Render.');
    return res.sendStatus(401);
  }
  const body = req.body;
  if (body.object === 'page') {
    for (const entry of body.entry || []) {
      console.log('Webhook: nhận event từ page', entry.id);
      for (const event of entry.messaging || []) {
        handleMessage(event).catch((e) => console.error('Lỗi xử lý:', e.message));
      }
    }
    return res.status(200).send('EVENT_RECEIVED');
  }
  return res.sendStatus(404);
});

app.get('/', (_req, res) => res.send('Chatbot Fanpage đang chạy 🤖'));

app.listen(PORT, () => console.log(`Server chạy ở cổng ${PORT}`));
