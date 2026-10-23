# Triển khai Probability Lab AI lên mạng

Mục tiêu: ai có đường dẫn cũng mở được bằng trình duyệt (điện thoại, máy tính), không cần cài gì và không cần máy của bạn bật.

## 1. Hệ thống gồm những gì khi triển khai

```text
Trình duyệt ──https──▶ 1 container (Node 24)
                        ├─ máy chủ API (Express)  ← gọi Groq bằng GROQ_API_KEY
                        ├─ giao diện đã build (React) do chính máy chủ phục vụ
                        └─ /data/probability-lab.db  (SQLite, CẦN ổ đĩa bền vững)
```

- Chỉ cần **một dịch vụ** và **một ổ đĩa nhỏ** (1 GB là thừa). Không cần máy chủ cơ sở dữ liệu riêng.
- Không có ổ đĩa bền vững thì mỗi lần dịch vụ khởi động lại, mọi phiên, nhóm và bài đã lưu sẽ mất. Vì vậy các nền tảng “miễn phí không có đĩa” chỉ dùng được để chạy thử.
- Không nên chuyển sang Cloudflare Workers: hệ thống dùng SQLite của Node (`node:sqlite`), phải viết lại phần lưu trữ.

## 2. Chuẩn bị (làm một lần)

1. **Khóa Groq**: tạo ở https://console.groq.com/keys. Khóa chỉ để trong biến môi trường của nền tảng, **không** đưa vào mã nguồn hay gửi cho ai.
2. **Đặt hạn mức chi tiêu** trong tài khoản Groq nếu có tùy chọn này, và xem giới hạn tốc độ của gói bạn dùng. Gói miễn phí có giới hạn số yêu cầu mỗi phút, nên nhiều lớp dùng cùng lúc có thể bị từ chối (hệ thống tự chuyển sang bản soạn sẵn và báo rõ lý do).
3. Kiểm tra bản chạy thật trên máy trước khi đưa lên mạng:

```bash
npm install
npm run build
```

```bash
PORT=8080 npm start
```

Rồi mở http://localhost:8080 (một địa chỉ duy nhất, không cần `npm run dev`). Trên Windows PowerShell đặt biến bằng `$env:PORT=8080; npm start`.

## 3. Cách A (khuyên dùng): Fly.io

Fly chạy được Docker kèm ổ đĩa bền vững, có HTTPS miễn phí và tên miền `tên-của-bạn.fly.dev`. Cần tài khoản và thẻ thanh toán; **xem bảng giá hiện hành trước khi đăng ký** vì giá thay đổi. Cấu hình 1 máy nhỏ 512 MB và ổ đĩa 1 GB thường chỉ vài đô la mỗi tháng.

1. Cài công cụ `flyctl` (https://fly.io/docs/flyctl/install/) rồi đăng nhập:

```bash
fly auth login
```

2. Mở `fly.toml`, đổi dòng `app = "probability-lab-ten-cua-ban"` thành một tên riêng chưa ai dùng (chỉ chữ thường, số và dấu gạch ngang). Nếu muốn máy chủ gần Việt Nam, giữ `primary_region = "sin"` (Singapore).
3. Tạo ứng dụng và ổ đĩa (tên ổ đĩa phải là `plab_data`, cùng vùng với ứng dụng):

```bash
fly launch --no-deploy --copy-config
```

```bash
fly volumes create plab_data --size 1 --region sin
```

4. Cất các bí mật (thay bằng giá trị thật):

```bash
fly secrets set GROQ_API_KEY=gsk_xxx
```

Tùy chọn, nếu muốn chỉ người có mật khẩu mới vào được:

```bash
fly secrets set PLAB_BASIC_AUTH=giaovien:mat-khau-cua-ban
```

5. Triển khai:

```bash
fly deploy
```

6. Mở trang:

```bash
fly open
```

Kiểm tra nhanh: `https://tên-của-bạn.fly.dev/healthz` phải trả về `{"ok":true}`, và dòng ghi trạng thái AI ở đầu trang phải hiện “Groq”.

Muốn cập nhật sau này: sửa mã rồi chạy lại `fly deploy`. Dữ liệu trong `/data` được giữ nguyên.

**Lưu ý:** ổ đĩa của Fly chỉ gắn được vào **một** máy, nên đừng tăng số máy (`fly scale count`). Một máy nhỏ chịu được cả lớp học vì mỗi thao tác rất nhẹ.

## 4. Cách B: Render hoặc Railway

Cả hai đọc được `Dockerfile` có sẵn trong thư mục này.

- **Render**: tạo *Web Service* từ kho mã (GitHub), chọn *Docker*; thêm *Disk* gắn vào `/data` (cần gói trả phí); thêm biến môi trường `GROQ_API_KEY` (và `PLAB_BASIC_AUTH` nếu cần). Đặt đường kiểm tra sức khỏe là `/healthz`.
- **Railway**: tạo dự án từ GitHub, thêm *Volume* gắn vào `/data`, thêm các biến môi trường như trên.

Trong cả hai trường hợp phải có biến `DB_PATH=/data/probability-lab.db` (đã đặt sẵn trong `Dockerfile`).

## 5. Cách C: máy chủ ảo (VPS) tự quản

Phù hợp khi bạn quen dòng lệnh. Trên máy Linux đã cài Docker:

```bash
docker build -t plab .
```

```bash
docker run -d --name plab --restart unless-stopped -p 8080:8080 -v plab_data:/data -e GROQ_API_KEY=gsk_xxx plab
```

Đặt phía trước một proxy HTTPS như Caddy (tự lấy chứng chỉ miễn phí), ví dụ file `Caddyfile`:

```text
ten-mien-cua-ban.vn {
    reverse_proxy localhost:8080
}
```

## 6. Bảo mật và vận hành

| Việc | Cách làm |
|---|---|
| Lộ khóa Groq | Chỉ để trong biến môi trường; file `.env` đã nằm trong `.gitignore` và `.dockerignore`. Nếu nghi bị lộ thì tạo khóa mới và thu hồi khóa cũ. |
| Bị lạm dụng khóa | Hệ thống đã giới hạn số lần gọi AI mỗi phút cho mỗi địa chỉ IP (mặc định 60, đổi bằng biến `PLAB_GIOI_HAN_AI`). Nên thêm hạn mức chi tiêu bên Groq. |
| Chỉ cho người được mời | Đặt `PLAB_BASIC_AUTH=ten:matkhau`: trình duyệt sẽ hỏi mật khẩu trước khi vào. Đây là mật khẩu chung, không phải tài khoản riêng từng người. |
| Dữ liệu học sinh | Hệ thống chỉ lưu tên nhóm (“Nhóm 1”) và câu trả lời, đã lọc thông tin cá nhân; nên dặn giáo viên không nhập họ tên học sinh. |
| Sao lưu | Tải file cơ sở dữ liệu về định kỳ, ví dụ trên Fly: `fly ssh sftp get /data/probability-lab.db`. Có thể kèm hai file `-wal` và `-shm` nếu có. |
| Xem lỗi | `fly logs` (Fly) hoặc nhật ký của nền tảng. Dòng bắt đầu bằng `[groq]` cho biết vì sao AI không trả lời được. |

**Chưa có trong hệ thống:** tài khoản đăng nhập riêng cho từng giáo viên, phân quyền, và tự xóa dữ liệu cũ. Nếu nhiều trường cùng dùng một bản triển khai, mọi giáo viên sẽ thấy chung các bài đã lưu.

## 7. Danh sách kiểm tra trước ngày chấm

- [ ] `npm test` và `npm run typecheck` đều đạt.
- [ ] Mở đường dẫn công khai bằng điện thoại, vào đủ các tab: Phòng thí nghiệm, Tiết học với AI, Thêm bài toán.
- [ ] Tạo thử một phiên, cho một nhóm làm đủ 3 bước, xem thẻ giải thích hiện “AI giải thích”.
- [ ] Dán thử một đề vào tab “Thêm bài toán” và bấm “AI đọc đề”.
- [ ] Đặt `min_machines_running = 1` (Fly) để lần mở đầu tiên không phải chờ khởi động.
- [ ] Sao lưu một bản cơ sở dữ liệu sạch sau khi đã chuẩn bị xong dữ liệu mẫu.
- [ ] Ghi đường dẫn và mật khẩu (nếu có) ở nơi dễ tìm cho ban giám khảo.
