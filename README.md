# Hệ thống Giao việc Y tế — Medical Task Management

Giao việc nội bộ cho bệnh viện: ghi âm cuộc họp → biên bản, giao việc theo khoa/phòng,
theo dõi tiến độ. Giao diện tiếng Việt (mặc định) + tiếng Anh.

> **Trạng thái:** Phase 1 đã xong (đăng nhập, phân quyền, quản trị người dùng & khoa/
> phòng). Các module Công việc / Báo cáo / Ghi âm – Biên bản đang triển khai (xem *Lộ trình*).

**Công nghệ:** Next.js 16 (App Router) · TypeScript · Tailwind 4 · Prisma 6 + PostgreSQL
(Neon) · Auth.js v5 · Webpack.

## Chạy dự án

```bash
npm install
copy .env.example .env    # macOS/Linux: cp .env.example .env
# dán DATABASE_URL (pooled) + DIRECT_URL (direct) của Neon vào .env
npm run db:setup          # tạo bảng + nạp dữ liệu mẫu
npm run dev               # http://localhost:3000
```

CSDL dùng **1 dự án Neon, 2 nhánh**: `dev` (máy cá nhân, `.env`) và `production` (web
thật, `.env.prod.local` + biến môi trường Vercel).

## Tài khoản demo (chỉ ở nhánh `dev`)

Mật khẩu chung: **`Demo@12345`** — mỗi vai trò một đuôi email riêng.

| Vai trò | Email |
|---|---|
| Quản trị viên | `admin@admin.company.local` |
| Ban Giám đốc | `director@director.company.local` |
| Thư ký | `secretary@secretary.company.local` |
| Trưởng khoa | `head@head.company.local` |
| Cán bộ | `staff@staff.company.local` |

Dữ liệu mẫu gồm 5 khoa/phòng (Admin sửa được): Khoa Khám bệnh, Phòng Kế hoạch tổng
hợp, Phòng Tổ chức cán bộ, Khoa Dược, Khoa Xét nghiệm.

## Phân quyền (thiết kế đã chốt)

| Chức năng | Admin | Ban GĐ | Thư ký | Trưởng khoa | Cán bộ |
|---|:-:|:-:|:-:|:-:|:-:|
| Quản lý tài khoản & khoa/phòng | ✅ | – | – | – | – |
| Xem báo cáo **chi tiết** toàn viện | 🚫 | ✅ | ✅ | – | – |
| Xem báo cáo chi tiết khoa/phòng mình | – | – | – | ✅ | – |
| Tạo **Phiếu giao việc**, giao cho trưởng khoa | – | ✅ | ✅ | – | – |
| Chia nhỏ thành **sub-task** trong khoa mình | – | – | – | ✅ | – |
| Thêm người theo dõi (Follower) | – | ✅ | – | – | – |
| Nhận việc & cập nhật tiến độ | – | – | – | ✅ | ✅ |
| Nghiệm thu việc của cán bộ (2 bước) | – | – | – | ✅ | – |
| Ghi âm / ban hành biên bản | – | – | ✅ | – | – |
| Chỉ xem việc được giao/phối hợp | – | – | – | – | ✅ |

Cấu trúc công việc **2 tầng**: *Phiếu giao việc* (Ban Giám đốc → nhiều trưởng khoa) →
*sub-task* (trưởng khoa → cán bộ). Một sub-task có **1 người chính + nhiều người phối
hợp**. Nghiệm thu **2 bước**: cán bộ báo *Chờ duyệt* → trưởng khoa nghiệm thu *Hoàn
thành*. Trạng thái `ĐANG LÀM → CHỜ DUYỆT → HOÀN THÀNH` · quá hạn tự gắn 🔴 · mọi thay
đổi lưu nhật ký.

> Hiện mới áp dụng: quản lý người dùng & khoa/phòng (Admin), bảng điều khiển, hồ sơ cá
> nhân. Ma trận quyền ở trên đã có trong mã nguồn (`src/lib/rbac.ts`); các trang Công
> việc / Báo cáo / Biên bản thuộc B1–B5 dưới đây.

## Lộ trình

| | Nội dung |
|---|---|
| ✅ **Phase 1** | Đăng nhập, phân quyền, quản trị |
| ✅ **B1** | Vai trò & ma trận quyền theo phạm vi (Admin / Ban GĐ / Thư ký / Trưởng khoa / Cán bộ) |
| 🔜 **B2** | Công việc: phiếu giao việc, sub-task, nghiệm thu 2 bước, cảnh báo quá hạn |
| ⏳ **B3** | Báo cáo: toàn viện / khoa, xếp hạng cán bộ, xu hướng tuần–tháng |
| ⏳ **B4** | Ghi âm – Biên bản |
| ⏳ **B5** | Thông báo (trong app + email) |

## Scripts

| Lệnh | Mô tả |
|---|---|
| `npm run dev` / `npm run build` | Chạy dev / build production (Webpack) |
| `npm run vercel-build` | Vercel tự gọi: generate + migrate + build |
| `npm run typecheck` / `npm run lint` | Kiểm tra TypeScript / ESLint |
| `npm run db:setup` | `db:deploy` + `db:seed` (chạy lần đầu) |
| `npm run db:deploy` / `npm run db:seed` | Áp migration / nạp dữ liệu mẫu |
| `npm run db:seed:prod` | Tạo 1 admin production (dùng `ADMIN_EMAIL` / `ADMIN_PASSWORD`) |
| `npm run db:studio` / `npm run db:reset` | Prisma Studio / tạo lại CSDL |

## Triển khai Vercel

1. Push lên GitHub → Vercel **Import** repo.
2. Thêm biến môi trường (Production + Preview):
   `DATABASE_URL`, `DIRECT_URL` (nhánh `production`), `AUTH_SECRET`, `AUTH_TRUST_HOST=true`.
3. `vercel-build` tự chạy `prisma migrate deploy` khi deploy.
4. Nạp admin **một lần** (chạy cục bộ, trỏ vào CSDL prod):
   `$env:ADMIN_EMAIL="..."; $env:ADMIN_PASSWORD="..."; npm run db:seed:prod`

> Gói Vercel **Hobby** chỉ dành cho mục đích cá nhân/phi thương mại — dùng nội bộ bệnh
> viện nên cân nhắc gói Pro hoặc tự host VPS.

## Ghi chú

- **Ổ FAT32 (E:)** không hỗ trợ symlink → dùng **Webpack** (không Turbopack);
  `scripts/patch-next-fat32.cjs` tự vá sau `npm install`. Chuyển sang NTFS/Linux có thể bỏ.
- Đừng chạy `npm run build` và `npm run dev` cùng lúc (chúng dùng chung thư mục `.next`).
- **Bảo mật:** đổi `AUTH_SECRET` trước khi lên production; tài khoản demo chỉ hiện khi
  `NODE_ENV !== "production"`; phân quyền được kiểm tra ở **cả** `proxy.ts` và server action.
- **Kế hoạch tăng cường (chưa làm):** chặn Google (`robots.txt` + `noindex`), giới hạn
  đăng nhập sai, lớp chặn phía trước bằng Cloudflare Access.
