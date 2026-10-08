// Test nội bộ: không cần token/key thật.
// Chạy: npm test
import { spawn } from 'child_process';
import { resolveToken } from './bot.js';

const PORT = 3456;
const VERIFY_TOKEN = 'test_token_123';

const server = spawn('node', ['server.js'], {
  env: { ...process.env, PORT: String(PORT), VERIFY_TOKEN },
  cwd: new URL('.', import.meta.url).pathname,
});

await new Promise((r) => setTimeout(r, 1500));
const base = `http://localhost:${PORT}`;
let pass = 0, fail = 0;
const check = (name, ok) => { console.log(`${ok ? '✅' : '❌'} ${name}`); ok ? pass++ : fail++; };

// 1. Webhook verify đúng token
{
  const r = await fetch(`${base}/webhook?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=abc123`);
  check('Xác minh webhook đúng token', r.status === 200 && (await r.text()) === 'abc123');
}
// 2. Webhook verify sai token -> 403
{
  const r = await fetch(`${base}/webhook?hub.mode=subscribe&hub.verify_token=sai&hub.challenge=abc123`);
  check('Từ chối token sai (403)', r.status === 403);
}
// 3. Tin nhắn echo của chính Page -> bị bỏ qua, vẫn trả 200
{
  const r = await fetch(`${base}/webhook`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ object: 'page', entry: [{ messaging: [{ sender: { id: '1' }, message: { is_echo: true, text: 'hello' } }] }] }),
  });
  check('Bỏ qua tin nhắn echo', r.status === 200);
}
// 4. Tin nhắn khách nhưng thiếu API key -> không crash, trả 200
{
  const r = await fetch(`${base}/webhook`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ object: 'page', entry: [{ messaging: [{ sender: { id: '999' }, message: { text: 'giá bao nhiêu' } }] }] }),
  });
  check('Thiếu key không làm sập server', r.status === 200);
}
// 5. Sai object -> 404
{
  const r = await fetch(`${base}/webhook`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ object: 'user' }),
  });
  check('Từ chối object lạ (404)', r.status === 404);
}

server.kill();

// 6. resolveToken: chọn đúng token theo từng Page
check('Chưa cấu hình -> rỗng', resolveToken('123') === '');
process.env.PAGE_TOKENS = JSON.stringify({ pageA: 'tokA', pageB: 'tokB' });
check('Multi-page: đúng token pageA', resolveToken('pageA') === 'tokA');
check('Multi-page: đúng token pageB', resolveToken('pageB') === 'tokB');
check('Multi-page: page lạ bị từ chối', resolveToken('pageX') === '');
delete process.env.PAGE_TOKENS;
process.env.PAGE_ACCESS_TOKEN = 'tokChung';
check('Chế độ 1 page: fallback token chung', resolveToken('bat_ky_page') === 'tokChung');
delete process.env.PAGE_ACCESS_TOKEN;

console.log(`\nKết quả: ${pass} đạt, ${fail} lỗi`);
process.exit(fail ? 1 : 0);
