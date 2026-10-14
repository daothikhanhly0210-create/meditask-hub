# HRMS Nội bộ — Internal HR & Task Management

Hệ thống quản lý nhân sự & công việc nội bộ: ghi âm cuộc họp, tự động chuyển thành
biên bản, phân công công việc theo phòng ban và theo dõi tiến độ.

Internal HR & task management system: meeting recording, automatic minutes,
department-based task assignment and progress tracking.

> **Trạng thái / Status:** Phase 1 — Đăng nhập, phân quyền (RBAC) và Quản trị.
> Các tính năng ghi âm, biên bản và giao việc sẽ được bổ sung ở các giai đoạn sau.

---

## Công nghệ / Tech stack

| Thành phần | Công nghệ |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| UI | Tailwind CSS 4, component nội bộ theo phong cách shadcn/ui |
| CSDL / Database | Prisma 6 + PostgreSQL (Neon; dùng chung cho dev và prod) |
| Xác thực / Auth | Auth.js (NextAuth v5) — Credentials + JWT |
| i18n | Tiếng Việt mặc định, có nút chuyển VI/EN |
| Email | nodemailer (tùy chọn, dùng ở Phase 4) |
| Bundler | Webpack (xem phần *Ghi chú môi trường* bên dưới) |

## Yêu cầu / Requirements

- Node.js 20+ (khuyến nghị 22/24)
- npm

## Ghi chú môi trường / Environment notes

Dự án này hiện nằm trên ổ đĩa **FAT32** (E:). FAT32 **không hỗ trợ junction/symlink**,
nên **Turbopack không chạy được** (Turbopack tạo junction cho các package
`serverExternalPackages`). Vì vậy dự án dùng **Webpack**:

- `npm run dev` → `next dev --webpack`
- `npm run build` → `next build --webpack`
- Tailwind CSS v4 chạy qua PostCSS (`postcss.config.mjs`).

Ngoài ra, `fs.readlink()` trên FAT32 trả về `EISDIR` thay vì `EINVAL`, khiến bước
*trace* của Next.js lỗi khi build production. Script `scripts/patch-next-fat32.cjs`
(mở rộng các kiểm tra lỗi để chấp nhận `EISDIR`) được chạy tự động qua `postinstall`,
nên `npm install` sẽ tự vá. Nếu bạn cài lại `next`, chỉ cần chạy lại:

```bash
node scripts/patch-next-fat32.cjs
```

> Khi chuyển sang ổ NTFS (hoặc Docker/Linux), có thể bỏ patch này và chuyển lại
> Turbopack để build nhanh hơn. Trên **Vercel** (Linux), script `vercel-build` hiện
> cũng dùng `--webpack` để giống hệt bản build đã kiểm thử ở máy; sau khi xác nhận
> Turbopack chạy tốt có thể bỏ cờ này để build nhanh hơn.

**Lưu ý khi chạy dev:** đừng chạy `npm run build` và `npm run dev` cùng lúc (chúng
dùng chung thư mục `.next`). Trên ổ FAT32 chậm, lần biên dịch đầu tiên đôi khi lỗi
`SyntaxError: Unexpected end of JSON input` (đọc manifest khi đang ghi). Cách xử lý:

```powershell
# Dừng dev server, xóa cache rồi chạy lại
Remove-Item -Recurse -Force .next
npm run dev
```

Sau khi đã biên dịch xong, ứng dụng chạy bình thường.

## Cài đặt & chạy / Setup & run

```bash
# 1. Cài dependencies
npm install

# 2. Tạo file .env từ mẫu rồi dán chuỗi kết nối PostgreSQL vào
#    DATABASE_URL (pooled) và DIRECT_URL (direct) — xem .env.example
cp .env.example .env

# 3. Sinh Prisma client + tạo bảng trên CSDL
npm run db:generate
npm run db:deploy

# 4. Nạp dữ liệu mẫu (phòng ban + tài khoản demo)
npm run db:seed

# 5. Chạy dev server
npm run dev
```

Mở http://localhost:3000

> CSDL dùng chung cho cả dev và prod: tạo một dự án **Neon** (PostgreSQL miễn phí),
> tách nhánh `dev` và `main` để dữ liệu thử không lẫn dữ liệu thật.

## Tài khoản demo / Demo accounts

Mật khẩu chung / shared password: **`Demo@12345`**

Mỗi vai trò dùng một đuôi email riêng (nhìn đuôi là biết vai trò) /
Each role has its own email domain:

| Vai trò / Role | Email |
|---|---|
| Quản trị viên / Admin | `admin@admin.company.local` |
| Sếp / Boss | `boss@boss.company.local` |
| Thư ký / Secretary | `secretary@secretary.company.local` |
| Trưởng phòng / Dept Head | `head@head.company.local` |
| Nhân viên / Employee | `employee@employee.company.local` |

## Phân quyền / Roles & permissions

| Quyền / Capability | Admin | Boss | Secretary | Dept Head | Employee |
|---|:-:|:-:|:-:|:-:|:-:|
| Quản lý người dùng / Manage users | ✅ | – | – | – | – |
| Quản lý phòng ban / Manage departments | ✅ | – | – | – | – |
| Báo cáo toàn công ty / Company reports | ✅ | ✅ | ✅ | – | – |
| Ghi âm & biên bản / Recording & minutes | – | – | ✅ | – | – |
| Giao việc / Assign tasks | – | – | – | ✅ | – |
| Hoàn thành việc / Complete tasks | – | – | – | – | ✅ |

## Cấu trúc thư mục / Project structure

```
prisma/
  schema.prisma        # Mô hình dữ liệu / data model
  seed.ts              # Dữ liệu mẫu (dev) / demo seed data
  seed-prod.ts         # Dữ liệu production (1 admin) / production seed
  migrations/          # Migration PostgreSQL
src/
  app/
    (app)/             # Khu vực yêu cầu đăng nhập / authenticated area
      admin/users      # Quản lý người dùng
      admin/departments# Quản lý phòng ban
      dashboard
      profile
    login/             # Trang đăng nhập
    api/auth/          # NextAuth route handler
  auth.ts              # Cấu hình NextAuth (Node)
  auth.config.ts       # Cấu hình dùng chung (edge-safe)
  proxy.ts             # Bảo vệ route / route guard (Next.js 16 thay cho middleware.ts)
  components/          # UI + app shell + i18n provider
  i18n/                # Từ điển VI/EN
  lib/                 # prisma, rbac, session, utils, mail, audit
  server/actions/      # Server actions
```

## Scripts

| Lệnh | Mô tả |
|---|---|
| `npm run dev` | Chạy dev server (Webpack) |
| `npm run build` | Build production (Webpack) |
| `npm run vercel-build` | Build cho Vercel: migrate + generate + build (Vercel tự gọi) |
| `npm run typecheck` | Kiểm tra TypeScript |
| `npm run db:generate` | Sinh Prisma client |
| `npm run db:migrate` | Tạo migration mới khi dev |
| `npm run db:deploy` | Áp migration lên CSDL (production/Vercel) |
| `npm run db:seed` | Nạp dữ liệu mẫu (có tài khoản demo) |
| `npm run db:seed:prod` | Nạp dữ liệu production (1 admin, không có demo) |
| `npm run db:studio` | Mở Prisma Studio |
| `npm run db:reset` | Xóa & tạo lại CSDL |
| `npm run db:setup` | Migration + seed (chạy lần đầu) |
| `node scripts/patch-next-fat32.cjs` | Vá Next.js cho ổ FAT32 (tự chạy sau `npm install`, tự bỏ qua trên Linux/Vercel) |

## Triển khai lên Vercel / Deploy to Vercel

1. Push code lên GitHub (repo private).
2. Vercel → **Add New → Project → Import** repo.
3. Thêm **Environment Variables** (Production + Preview):

   | Biến | Giá trị |
   |---|---|
   | `DATABASE_URL` | chuỗi **pooled** của Neon (có `-pooler`) |
   | `DIRECT_URL` | chuỗi **direct** của Neon (không `-pooler`) |
   | `AUTH_SECRET` | chuỗi ngẫu nhiên mạnh (xem lệnh trong `.env.example`) |
   | `AUTH_TRUST_HOST` | `true` |

4. `vercel-build` (đã có trong `package.json`) tự chạy `prisma migrate deploy` khi deploy.
5. Sau lần deploy đầu, nạp dữ liệu production **một lần** (chạy cục bộ, trỏ vào CSDL prod):

   ```powershell
   $env:ADMIN_EMAIL="admin@admin.company.local"
   $env:ADMIN_PASSWORD="<mật khẩu mạnh>"
   npm run db:seed:prod
   ```

> Vercel gói **Hobby (miễn phí)** theo điều khoản chỉ dành cho mục đích cá nhân/phi
> thương mại. Dùng nội bộ công ty nên cân nhắc gói Pro hoặc tự host VPS.

## Ghi chú bảo mật / Security notes

- Đổi `AUTH_SECRET` trước khi triển khai production.
- Tài khoản demo chỉ hiển thị khi `NODE_ENV !== "production"`.
- Production dùng `npm run db:seed:prod` để tạo **một** admin (mật khẩu lấy từ biến
  môi trường), không tạo tài khoản demo.
- Phân quyền được kiểm tra ở **cả** middleware và server action.
