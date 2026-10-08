# HƯỚNG DẪN CÀI ĐẶT CHATBOT AI CHO FANPAGE

Mất khoảng 30-45 phút. Làm theo đúng thứ tự 6 bước. Mục nào không rõ thì hỏi Muse.

---

## Bước 1 — Lấy API key Gemini (miễn phí, 5 phút)

1. Vào https://aistudio.google.com/apikey (đăng nhập tài khoản Google).
2. Bấm **Create API key** → copy chuỗi key (dạng `AIza...`).
3. Giữ key này cẩn thận, lát điền vào bước 3.

> Gói miễn phí của Google đủ cho shop vài trăm tin nhắn mỗi ngày.

## Bước 2 — Tạo Meta App và lấy token Fanpage (15 phút)

1. Vào https://developers.facebook.com → đăng nhập tài khoản Facebook **là admin của Fanpage**.
2. **My Apps → Create App** → đặt tên (VD: `Chatbot Shop`) → chọn loại **Business** → tạo.
3. Trong trang quản trị app, tìm mục **Add Product** → thêm **Messenger**.
4. Vào **Messenger → Settings**:
   - Mục **Access Tokens** → bấm **Add or Remove Pages** → chọn Fanpage của shop → cấp quyền → bấm **Generate Token** → copy **Page Access Token**.
   - Vẫn trong trang này, copy **App Secret** ở mục **App settings → Basic** (bấm Show để hiện).
5. Tự đặt một chuỗi **Verify Token** (VD: `shop_toi_2026_bimat`) — ghi nhớ để dùng ở bước 3 và 4.

## Bước 3 — Đưa code lên mạng bằng Render (miễn phí, 10 phút)

1. Tạo tài khoản tại https://render.com (đăng nhập bằng GitHub cho nhanh).
2. Đẩy thư mục `chatbot-fanpage` này lên GitHub (tạo repo mới, upload toàn bộ file).
   - Nếu chưa biết dùng GitHub: vào https://github.com/new tạo repo → dùng nút **uploading an existing file** để tải cả thư mục lên.
3. Trong Render: **New → Web Service** → chọn repo vừa tạo.
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - Gói **Free** là đủ.
4. Sang tab **Environment**, thêm các biến (lấy từ `.env.example`):
   - `PAGE_ACCESS_TOKEN` = token ở bước 2
   - `APP_SECRET` = app secret ở bước 2
   - `VERIFY_TOKEN` = chuỗi tự đặt ở bước 2
   - `GEMINI_API_KEY` = key ở bước 1
   - `SHOP_NAME` = tên shop
   - `ORDER_TOOL_URL` = link công cụ chốt đơn (có sau)
5. Bấm **Deploy**. Khi xong, Render cho một địa chỉ dạng `https://chatbot-shop.onrender.com` — copy lại.

## Bước 4 — Nối webhook vào Meta App (5 phút)

1. Quay lại https://developers.facebook.com → app đã tạo → **Messenger → Settings**.
2. Mục **Webhooks** → **Add Callback URL**:
   - **Callback URL:** `https://chatbot-shop.onrender.com/webhook` (địa chỉ ở bước 3 + `/webhook`)
   - **Verify Token:** đúng chuỗi đã đặt ở bước 2.
   - Bấm **Verify and Save** — phải hiện dấu tích xanh mới đúng.
3. Bấm **Add Subscriptions** (hoặc Manage) → tích chọn **`messages`** → Save.

## Bước 5 — Test thử

1. Dùng tài khoản Facebook khác (không phải admin) nhắn tin vào Fanpage: "chân gà giá bao nhiêu".
2. Bot phải trả lời trong vài giây, đúng giá trong menu.
3. Nhắn "gặp nhân viên" → bot báo chuyển và hội thoại hiện lại cho nhân viên trong Hộp thư.

## Bước 6 — Nạp menu thật của shop

1. Mở file `knowledge/menu.json` → thay toàn bộ món ví dụ bằng món thật (tên, giá VND, mô tả ngắn).
2. Mở file `knowledge/shop-info.md` → điền tên shop, giờ mở cửa, phí ship, chính sách...
3. Đẩy lên GitHub lại → Render tự deploy lại trong 1-2 phút.

---

## Dùng cho nhiều Fanpage (chung 1 menu)

1. Trong Meta App (**Messenger → Settings**), ở mục **Access Tokens**, bấm **Add or Remove Pages** và thêm **tất cả** các Fanpage → **Generate Token** cho từng Page, copy từng token.
2. Lấy **ID** của từng Page: vào Fanpage → **Cài đặt** → **Thông tin Trang** → **ID Trang**.
3. Trong Render (**Environment**), thêm biến:
   - `PAGE_TOKENS` = `{"id_page_1":"token_1","id_page_2":"token_2"}` (thay bằng ID và token thật)
   - Có thể xóa `PAGE_ACCESS_TOKEN` cho gọn, hoặc giữ làm dự phòng.
4. Trong Meta App (**Webhooks**), ở phần subscriptions của từng Page, tích chọn **`messages`** cho tất cả các Page.
5. Test: nhắn vào từng Page, bot phải trả lời bằng đúng Page đó.

> Menu dùng chung cho mọi Page. Muốn mỗi chi nhánh một menu riêng thì báo em, em tách thêm.

## Lưu ý quan trọng

- **Kiểm duyệt app (App Review):** lúc mới tạo, app ở chế độ thử nghiệm — chỉ admin/tester nhắn bot mới trả lời. Muốn bot trả lời **mọi khách thật**, phải vào **App Review** trong dashboard và xin duyệt quyền `pages_messaging`. Meta thường duyệt trong vài ngày nếu điền đúng mục đích (trả lời khách hàng tự động).
- **Gói Free của Render** sẽ "ngủ" khi 15 phút không ai nhắn — tin nhắn đầu tiên sau đó bot trả lời chậm ~30 giây, các tin sau bình thường.
- **Đừng chia sẻ** Page Access Token và App Secret cho ai. Lộ token thì vào Meta App bấm reset token ngay.
- Muốn đổi cách bot nói chuyện: sửa file `bot.js` (phần QUY TẮC trong `buildSystemPrompt`) rồi deploy lại.
