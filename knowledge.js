// Nạp menu + thông tin shop từ thư mục knowledge/
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function formatVND(n) {
  return Number(n).toLocaleString('vi-VN') + 'đ';
}

export function getMenuText() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'knowledge', 'menu.json'), 'utf8');
    const menu = JSON.parse(raw);
    if (!menu.items || menu.items.length === 0) return '(chưa có món nào)';
    const groups = { met: 'MẸT XÔI GÀ MIX VỊ', ban_le: 'BÁN LẺ' };
    const order = ['met', 'ban_le'];
    return order
      .map((g) => {
        const items = menu.items.filter((m) => (m.nhom || 'ban_le') === g);
        if (!items.length) return '';
        const lines = items.map(
          (m) => `- ${m.ten} - ${formatVND(m.gia)}${m.mo_ta ? ` (${m.mo_ta})` : ''}`
        );
        return `${groups[g]}:\n${lines.join('\n')}`;
      })
      .filter(Boolean)
      .join('\n\n');
  } catch (e) {
    console.error('Không đọc được menu.json:', e.message);
    return '(chưa có món nào)';
  }
}

export function getShopInfo() {
  try {
    return fs.readFileSync(path.join(__dirname, 'knowledge', 'shop-info.md'), 'utf8');
  } catch (e) {
    console.error('Không đọc được shop-info.md:', e.message);
    return '';
  }
}
