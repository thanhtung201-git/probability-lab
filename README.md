# Probability Lab AI

Phòng thí nghiệm xác suất thích ứng cho tiết Toán lớp 9. Giáo viên nhập lời giải thích của từng nhóm, AI (Groq) nhận diện ngộ nhận, hệ thống tự dựng thí nghiệm kiểm chứng và trình chiếu kết quả cho cả lớp.

## Chạy thử

Yêu cầu: Node.js 22 trở lên (đã thử với Node 24).

```bash
npm install
```

Tạo file `.env` ở thư mục gốc (sao chép từ `.env.example`) và điền `GROQ_API_KEY`. Nếu để trống, hệ thống vẫn chạy bằng bộ luật từ khóa và đánh dấu mọi kết quả để giáo viên duyệt.

Mở hai cửa sổ terminal:

```bash
npm run dev:server
```

```bash
npm run dev:web
```

Rồi mở http://localhost:5173.

## Đưa lên mạng

Xem [DEPLOY.md](DEPLOY.md): hướng dẫn triển khai một container (máy chủ + giao diện + SQLite) lên Fly.io, Render, Railway hoặc máy chủ ảo, kèm bảo mật và sao lưu.

## Kiểm thử

```bash
npm test
```

```bash
npm run typecheck
```

## Cấu trúc

```text
data/                  thư viện ngộ nhận và tình huống (BẢN NHÁP – cần giáo viên duyệt)
packages/core/         logic thuần: mô phỏng, chẩn đoán bằng luật, hợp nhất, biên dịch thí nghiệm, phản hồi
apps/server/           Express + SQLite (node:sqlite) + Groq
apps/web/              giao diện giáo viên (React + Vite + Chart.js)
```

## Nguyên tắc

- AI chỉ hiểu ngôn ngữ và chọn loại thí nghiệm; mọi con số do bộ mô phỏng tính, tham số thí nghiệm lấy từ tình huống đã duyệt.
- Câu hỏi gợi mở của AI bị loại nếu chứa con số hoặc lộ đáp án; khi đó dùng câu hỏi soạn sẵn.
- Không có AI hoặc AI không chắc chắn: kết quả vào hàng chờ để giáo viên duyệt.
- Chỉ lưu tên nhóm, không lưu thông tin cá nhân học sinh.
