# Hệ thống Giao việc Y tế

Ứng dụng nội bộ cho bệnh viện: ghi âm cuộc họp, tạo biên bản, giao việc theo khoa/phòng
và theo dõi tiến độ. Giao diện tiếng Việt (mặc định) + tiếng Anh.

- **Công nghệ:** Next.js 16 · TypeScript · Tailwind 4 · Prisma 6 + PostgreSQL (Neon) · Auth.js v5
- **Trạng thái:** đã có đăng nhập, phân quyền và quản trị; module Công việc / Báo cáo /
  Ghi âm – Biên bản đang triển khai.

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
- **Trưởng khoa** — chia nhỏ thành sub-task cho cán bộ trong khoa, nghiệm thu và báo cáo lên.
- **Cán bộ** — xem việc được giao, cập nhật tiến độ, tải tài liệu và bình luận.

Công việc **2 tầng** (*phiếu giao việc* → *sub-task*), nghiệm thu **2 bước** (cán bộ báo
*Chờ duyệt* → trưởng khoa xác nhận *Hoàn thành*), quá hạn tự gắn 🔴.

## Lộ trình

Đăng nhập & phân quyền ✅ · Công việc 🔜 · Báo cáo · Ghi âm – Biên bản · Thông báo
