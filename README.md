# MediTask Hub

**MediTask Hub (MTH)** — ứng dụng nội bộ cho bệnh viện: ghi âm cuộc họp, tạo biên bản, giao việc theo
khoa/phòng và theo dõi tiến độ. Hỗ trợ tiếng Việt (mặc định) và tiếng Anh. Giao diện tiếng Việt (mặc định) + tiếng Anh.

**Công nghệ:** Next.js 16 · TypeScript · Tailwind 4 · Prisma 6 + PostgreSQL (Neon) · Auth.js v5

## Chạy dự án

```bash
npm install
copy .env.example .env   # rồi dán DATABASE_URL + DIRECT_URL của Neon vào .env
npm run db:setup         # tạo bảng + dữ liệu mẫu
npm run dev              # http://localhost:3000
```

## Vai trò

- **Quản trị viên** — quản lý tài khoản và khoa/phòng; không tham gia giao việc.
- **Ban Giám đốc** — tạo phiếu giao việc cho trưởng khoa, xem báo cáo toàn viện, thêm người theo dõi.
- **Thư ký** — như Ban Giám đốc, thêm quyền quản lý ghi âm – biên bản.
- **Trưởng khoa** — chia nhỏ thành sub-task cho cán bộ trong khoa và nghiệm thu kết quả.
- **Cán bộ** — nhận việc, bắt đầu làm, báo hoàn thành, tải tài liệu và bình luận.

## Cấu trúc công việc (2 tầng)

1. **Phiếu giao việc** — Ban Giám đốc/Thư ký tạo và giao cho một hoặc nhiều khoa/phòng.
   Mã phiếu tự sinh theo mẫu `PGV-NĂM-STT` (VD `PGV-2026-001`).
2. **Sub-task** — trưởng khoa chia nhỏ phiếu, giao cho **1 cán bộ chính + nhiều người phối hợp**.

Mỗi phiếu và mỗi sub-task đều có **bình luận** và **tệp đính kèm** (tối đa 20 MB).
Giám đốc có thể thêm **người theo dõi** cho phiếu; khoa không cần thực hiện được **đóng kèm lý do** (và mở lại nếu lỡ tay).

Vòng đời: `MỚI → ĐANG LÀM → CHỜ DUYỆT → HOÀN THÀNH` · quá hạn tự gắn 🔴 ·
nghiệm thu **2 bước** (cán bộ báo *Chờ duyệt* → trưởng khoa xác nhận *Hoàn thành*).

**Tiến độ suy ra tự động, không nhập tay:** MỚI 0% · ĐANG LÀM 50% · CHỜ DUYỆT 90% · HOÀN THÀNH 100%.
Tiến độ cán bộ/khoa/phiếu lần lượt là trung bình việc của cán bộ, của khoa và của toàn phiếu.
Ban Giám đốc bấm vào từng khoa để xem **ai chưa xong và còn thiếu việc gì**. Khi mọi việc đã
nghiệm thu (hoặc khoa đã đóng), phiếu **tự chuyển Hoàn thành**.

## Báo cáo

Trang **Báo cáo** tổng hợp tiến độ theo khoa/phòng, **xếp hạng cán bộ**, liệt kê **việc quá hạn**
và cho **xuất CSV**; lọc theo khoảng ngày và khoa/phòng. Ban Giám đốc xem toàn viện, trưởng khoa
chỉ xem khoa mình, quản trị viên chỉ xem số liệu tổng hợp (không có nội dung công việc).

## Ghi âm – Biên bản

Trang **Cuộc họp** số hóa buổi họp theo mã `BB-YYYY-NNN`: ghi lại **thành phần tham dự** (chọn
cán bộ trong hệ thống hoặc nhập tên tự do), soạn **biên bản** bằng Markdown (tóm tắt, nội dung,
kết luận), và lập **đầu việc** ngay trong biên bản. Mỗi đầu việc chuyển thành **phiếu giao việc**
cho một khoa/phòng chỉ bằng một cú nhấp — trưởng khoa nhận phiếu rồi chia nhỏ cho cán bộ như B2.

Quy trình biên bản: `NHÁP → CÓ BIÊN BẢN → ĐÃ DUYỆT`. Thư ký soạn và trình duyệt, Ban Giám đốc
duyệt và có thể mở lại để sửa. Biên bản xuất ra **Word (.docx)**, **PDF** (nhúng font Unicode nên
hiển thị đủ dấu tiếng Việt) hoặc **gửi email** kèm cả hai tệp.

Phạm vi xem: Ban Giám đốc và Thư ký thấy mọi cuộc họp; trưởng khoa và cán bộ chỉ thấy cuộc họp
mình tham dự hoặc có đầu việc thuộc khoa mình.

## Bảo mật

- Tài khoản do quản trị viên tạo (hoặc vừa được đặt lại mật khẩu) **bắt buộc tự đổi mật khẩu** ở lần
  đăng nhập đầu tiên; trước khi đổi xong chỉ vào được trang cá nhân.
- **Chống dò mật khẩu:** sai 5 lần thì tạm khoá tài khoản 15 phút; một địa chỉ IP thử sai 30 lần
  cũng bị khoá 15 phút (ngưỡng cao hơn vì cả bệnh viện thường đi qua một IP NAT). Bộ đếm lưu trong
  cơ sở dữ liệu nên áp dụng cho mọi máy chủ Vercel, và một lần đăng nhập đúng sẽ xoá bộ đếm.
- Mọi phản hồi kèm tiêu đề bảo mật: HSTS, chặn nhúng iframe, chặn đoán MIME, giới hạn quyền trình duyệt.
- Phiên đăng nhập là JWT ký bằng `AUTH_SECRET` **riêng cho từng môi trường** (đổi `AUTH_SECRET` là
  đăng xuất toàn bộ). Khoá bí mật chỉ nằm trong biến môi trường — xem `.env.example`.

## Lộ trình

- [x] **B0–B1** — Đăng nhập, phân quyền, quản trị; vai trò theo phạm vi (Admin / Ban Giám đốc / Thư ký / Trưởng khoa / Cán bộ)
- [x] **B2** — Công việc: phiếu giao việc → sub-task, nghiệm thu 2 bước, tiến độ tự động theo trạng thái, đóng/mở khoa, bình luận, tệp đính kèm, người theo dõi, cảnh báo quá hạn
- [x] **B3** — Báo cáo: toàn viện / khoa, xếp hạng cán bộ, việc quá hạn, xuất CSV
- [x] **B4a** — Ghi âm – Biên bản (phần biên bản): cuộc họp, thành phần, biên bản, đầu việc → phiếu giao việc, xuất Word/PDF, gửi email
- [ ] **B4b** — Ghi âm trên trình duyệt + chuyển giọng nói thành văn bản và biên bản tự động (Groq hoặc Whisper chạy nội bộ)
- [ ] **B5** — Thông báo (trong app + email)
