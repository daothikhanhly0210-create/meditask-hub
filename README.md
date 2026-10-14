# HRMS Nội bộ — Internal HR & Task Management

Quản lý nhân sự & công việc nội bộ: ghi âm cuộc họp → biên bản, giao việc theo phòng
ban, theo dõi tiến độ. Giao diện tiếng Việt (mặc định) + tiếng Anh.

> **Trạng thái:** Phase 1 đã xong (đăng nhập, phân quyền, quản trị người dùng & phòng
> ban). Các module Công việc / Báo cáo / Ghi âm – Biên bản đang triển khai (xem *Lộ trình*).

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
| Admin | `admin@admin.company.local` |
| Giám đốc | `boss@boss.company.local` |
| Thư ký | `secretary@secretary.company.local` |
| Trưởng phòng | `head@head.company.local` |
| Nhân viên | `employee@employee.company.local` |

## Phân quyền (thiết kế đã chốt)

| Chức năng | Admin | Giám đốc | Thư ký | Trưởng phòng | Nhân viên |
|---|:-:|:-:|:-:|:-:|:-:|
| Quản lý tài khoản & phòng ban | ✅ | – | – | – | – |
| Báo cáo toàn công ty | ✅ | ✅ | ✅ | – | – |
| Báo cáo phòng mình | – | – | – | ✅ | – |
| Giao việc (phạm vi) | – | toàn hệ thống | toàn hệ thống | trong phòng | – |
| Nhận việc, cập nhật % + trạng thái | – | ✅ | ✅ | ✅ | ✅ |
| Duyệt hoàn thành (việc mình giao) | – | ✅ | ✅ | ✅ | – |
| Tải lên / ban hành ghi âm – biên bản | – | – | ✅ | – | – |

Quy tắc: 1 công việc = 1 người nhận · `MỚI → ĐANG LÀM → CHỜ DUYỆT → HOÀN THÀNH`
(+ `CẦN LÀM LẠI`) · quá hạn tự gắn 🔴 · mọi thay đổi lưu nhật ký.

> Hiện mới áp dụng: quản lý người dùng & phòng ban (Admin), bảng điều khiển, hồ sơ cá
> nhân. Phần còn lại thuộc B1–B5 dưới đây.

## Lộ trình

| | Nội dung |
|---|---|
| ✅ **Phase 1** | Đăng nhập, phân quyền, quản trị |
| 🔜 **B1** | Phân quyền theo vai trò + phạm vi, menu theo vai trò |
| ⏳ **B2** | Công việc: giao việc, duyệt 2 bước, cảnh báo quá hạn |
| ⏳ **B3** | Báo cáo: toàn công ty / phòng |
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

> Gói Vercel **Hobby** chỉ dành cho mục đích cá nhân/phi thương mại — dùng nội bộ công
> ty nên cân nhắc gói Pro hoặc tự host VPS.

## Ghi chú

- **Ổ FAT32 (E:)** không hỗ trợ symlink → dùng **Webpack** (không Turbopack);
  `scripts/patch-next-fat32.cjs` tự vá sau `npm install`. Chuyển sang NTFS/Linux có thể bỏ.
- Đừng chạy `npm run build` và `npm run dev` cùng lúc (chúng dùng chung thư mục `.next`).
- **Bảo mật:** đổi `AUTH_SECRET` trước khi lên production; tài khoản demo chỉ hiện khi
  `NODE_ENV !== "production"`; phân quyền được kiểm tra ở **cả** `proxy.ts` và server action.
- **Kế hoạch tăng cường (chưa làm):** chặn Google (`robots.txt` + `noindex`), giới hạn
  đăng nhập sai, lớp chặn phía trước bằng Cloudflare Access.
