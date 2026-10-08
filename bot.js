// Xử lý tin nhắn Messenger + gọi AI trả lời + bàn giao cho nhân viên khi cần
// Hỗ trợ NHIỀU Fanpage chung 1 server, chung 1 menu.
import { getMenuText, getShopInfo } from './knowledge.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const ORDER_TOOL_URL = process.env.ORDER_TOOL_URL || '';
const SHOP_NAME = process.env.SHOP_NAME || 'Shop';
const PAGE_INBOX_APP_ID = '263902037430900'; // ID cố định của Hộp thư Page

// Tìm token của Page gửi tin nhắn đến.
// - Nếu có PAGE_TOKENS (dạng JSON {"id_page":"token",...}): bắt buộc khớp đúng page.
// - Ngược lại dùng PAGE_ACCESS_TOKEN chung (chế độ 1 page như cũ).
export function resolveToken(pageId) {
  try {
    const map = JSON.parse(process.env.PAGE_TOKENS || '{}');
    if (map[pageId]) return map[pageId];
    if (Object.keys(map).length > 0) return ''; // đã cấu hình multi-page nhưng page này chưa có token
  } catch {
    /* bỏ qua JSON lỗi, dùng fallback bên dưới */
  }
  return process.env.PAGE_ACCESS_TOKEN || '';
}

// Nhớ hội thoại gần nhất của từng khách, tách riêng theo từng Page.
const conversations = new Map();
const MAX_HISTORY = 10;

function getHistory(pageId, psid) {
  const key = `${pageId}:${psid}`;
  if (!conversations.has(key)) conversations.set(key, []);
  return conversations.get(key);
}

function buildSystemPrompt() {
  const orderLine = ORDER_TOOL_URL
    ? `Link đặt món của shop: ${ORDER_TOOL_URL}`
    : 'Link đặt món: (nhân viên sẽ gửi link đặt món cho khách)';
  return `Bạn là nhân viên tư vấn của "${SHOP_NAME}" trên Fanpage Facebook, đang chat với khách hàng qua Messenger.

THÔNG TIN SHOP:
${getShopInfo()}

MENU (tên - giá):
${getMenuText()}

${orderLine}

QUY TẮC:
- Trả lời NGẮN GỌN như chat thật (1-3 câu), thân thiện, lễ phép, dùng "Dạ", "ạ".
- CHỈ dùng thông tin shop/menu ở trên. Không bịa giá, món hay chính sách không có trong thông tin.
- Khách hỏi món/giá: trả lời đúng theo menu.
- Khách muốn đặt món/chốt đơn: gửi link đặt món ở trên và hướng dẫn bấm vào chọn món giúp shop.
- Khi KHÔNG biết câu trả lời, khách tỏ ra khó chịu, hoặc khách yêu cầu gặp người ("gặp nhân viên", "tư vấn viên", "người thật"...): trả lời "Dạ để em chuyển anh/chị qua bạn nhân viên hỗ trợ tiếp nhé ạ" và KẾT THÚC câu trả lời bằng thẻ [HANDOFF] (thẻ này hệ thống dùng để chuyển hội thoại, khách không nhìn thấy).
- Không bao giờ nói mình là AI/robot, không mô tả cách hệ thống hoạt động.`;
}

async function callAI(history) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: buildSystemPrompt() }] },
        contents: history.map((m) => ({
          role: m.role === 'bot' ? 'model' : 'user',
          parts: [{ text: m.text }],
        })),
        generationConfig: { temperature: 0.7, maxOutputTokens: 1000 },
      }),
    }
  );
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API lỗi ${res.status}: ${err.slice(0, 200)}`);
  }
  const data = await res.json();
  const text = (data?.candidates?.[0]?.content?.parts || [])
    .map((p) => p.text || '')
    .join('')
    .trim();
  return text;
}

async function graphAPI(token, path, body) {
  const res = await fetch(`https://graph.facebook.com/v21.0${path}?access_token=${token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error('Graph API lỗi:', res.status, err.slice(0, 300));
  }
  return res.ok;
}

const sendText = (token, psid, text) =>
  graphAPI(token, '/me/messages', {
    recipient: { id: psid },
    messaging_type: 'RESPONSE',
    message: { text },
  });

const senderAction = (token, psid, action) =>
  graphAPI(token, '/me/messages', { recipient: { id: psid }, sender_action: action });

// Chuyển hội thoại về Hộp thư của Page để nhân viên tiếp quản
const handoffToHuman = (token, psid) =>
  graphAPI(token, '/me/pass_thread_control', {
    recipient: { id: psid },
    target_app_id: PAGE_INBOX_APP_ID,
  });

export async function handleMessage(event) {
  // Bỏ qua tin nhắn do chính Page/bot gửi (chống lặp vô hạn)
  if (event.message?.is_echo) return;

  const pageId = event.recipient?.id;
  const psid = event.sender?.id;
  const text = event.message?.text?.trim();
  if (!pageId || !psid || !text) return; // chỉ xử lý tin nhắn chữ

  const token = resolveToken(pageId);
  if (!token || !GEMINI_API_KEY) {
    console.error(`Thiếu token của Page ${pageId} hoặc GEMINI_API_KEY trong biến môi trường.`);
    return;
  }

  const history = getHistory(pageId, psid);
  history.push({ role: 'user', text });
  while (history.length > MAX_HISTORY) history.shift();

  // Hiện "đang nhập..." cho tự nhiên
  await senderAction(token, psid, 'mark_seen');
  await senderAction(token, psid, 'typing_on');

  let reply = '';
  try {
    reply = await callAI(history);
  } catch (e) {
    console.error('Lỗi gọi AI:', e.message);
    reply = 'Dạ shop đang đông khách, anh/chị đợi em một chút nhé ạ.';
  }
  if (!reply) reply = 'Dạ anh/chị cần em hỗ trợ gì thêm ạ?';

  const needHandoff = reply.includes('[HANDOFF]');
  reply = reply.replace('[HANDOFF]', '').trim();

  history.push({ role: 'bot', text: reply });
  while (history.length > MAX_HISTORY) history.shift();

  await senderAction(token, psid, 'typing_off');
  await sendText(token, psid, reply);

  if (needHandoff) {
    await handoffToHuman(token, psid);
    console.log(`Đã chuyển hội thoại của ${psid} (Page ${pageId}) cho nhân viên.`);
  }
}
