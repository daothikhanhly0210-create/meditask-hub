# Hệ thống Giao việc Y tế

Ứng dụng nội bộ cho bệnh viện: ghi âm cuộc họp, tạo biên bản, giao việc theo khoa/phòng
và theo dõi tiến độ. Giao diện tiếng Việt (mặc định) + tiếng Anh.

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
- **Trưởng khoa** — chia nhỏ thành sub-task cho cán bộ trong khoa, nghiệm thu và báo cáo lên.
- **Cán bộ** — xem việc được giao, cập nhật tiến độ, tải tài liệu và bình luận.

## Cấu trúc công việc (2 tầng)

1. **Phiếu giao việc** — Ban Giám đốc/Thư ký tạo và giao cho một hoặc nhiều khoa/phòng.
   Mã phiếu tự sinh theo mẫu `PGV-NĂM-STT` (VD `PGV-2026-001`).
2. **Sub-task** — trưởng khoa chia nhỏ phiếu, giao cho **1 cán bộ chính + nhiều người phối hợp**.

Mỗi phiếu và mỗi sub-task đều có **bình luận** và **tệp đính kèm** (tối đa 20 MB).
Giám đốc có thể thêm **người theo dõi** cho phiếu; trưởng khoa **báo cáo hoàn thành** khoa mình.

Vòng đời: `MỚI → ĐANG LÀM → CHỜ DUYỆT → HOÀN THÀNH` (kèm % tiến độ) · quá hạn tự gắn 🔴 ·
nghiệm thu **2 bước** (cán bộ báo *Chờ duyệt* → trưởng khoa xác nhận *Hoàn thành*) ·
khi mọi khoa nghiệm thu xong, phiếu **tự chuyển Hoàn thành**.

## Lộ trình

- [x] **B0–B1** — Đăng nhập, phân quyền, quản trị; vai trò theo phạm vi (Admin / Ban Giám đốc / Thư ký / Trưởng khoa / Cán bộ)
- [x] **B2** — Công việc: phiếu giao việc → sub-task, nghiệm thu 2 bước, bình luận, tệp đính kèm, người theo dõi, cảnh báo quá hạn
- [ ] **B3** — Báo cáo: toàn viện / khoa, xếp hạng cán bộ, xu hướng
- [ ] **B4** — Ghi âm – Biên bản
- [ ] **B5** — Thông báo (trong app + email)
