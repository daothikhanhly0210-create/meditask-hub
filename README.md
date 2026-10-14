# HRMS Nội bộ — Internal HR & Task Management

Hệ thống quản lý nhân sự & công việc nội bộ: ghi âm cuộc họp, chuyển thành biên bản,
giao việc theo phòng ban và theo dõi tiến độ.

Internal HR & task management system: meeting recording, minutes, department-based
task assignment and progress tracking.

> **Trạng thái / Status:** Phase 1 đã hoàn thành (đăng nhập, phân quyền, quản trị người
> dùng và phòng ban). Các module **Công việc – Báo cáo – Ghi âm/Biên bản** đang được
> triển khai theo [Lộ trình](#lộ-trình--roadmap) bên dưới.

---

## Mục tiêu / Goals

- 🎙️ Ghi âm cuộc họp ngay trên trình duyệt → biên bản.
- 🧩 Giao việc theo phòng ban; nhân viên cập nhật tiến độ, người giao **duyệt 2 bước**.
- 📊 Theo dõi tiến độ, cảnh báo 🔴 quá hạn, báo cáo theo phòng ban và toàn công ty.
- 🌐 Giao diện tiếng Việt (mặc định) + nút chuyển sang tiếng Anh.

## Công nghệ / Tech stack

| Thành phần | Công nghệ |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| UI | Tailwind CSS 4, component nội bộ theo phong cách shadcn/ui |
| CSDL / Database | Prisma 6 + PostgreSQL (Neon) |
| Xác thực / Auth | Auth.js (NextAuth v5) — Credentials + JWT |
| i18n | Tiếng Việt mặc định, nút chuyển VI/EN |
| Email | nodemailer (tùy chọn, dùng ở giai đoạn *Thông báo*) |
| Bundler | Webpack (xem *Ghi chú môi trường* bên dưới) |

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
cp .env.example .env          # macOS/Linux
copy .env.example .env        # Windows

# 3. Sinh Prisma client + tạo bảng + nạp dữ liệu mẫu
npm run db:generate
npm run db:deploy
npm run db:seed

# 4. Chạy dev server
npm run dev
```

Mở http://localhost:3000

> **Rút gọn:** `npm run db:setup` = `db:deploy` + `db:seed` (dùng cho lần chạy đầu).

### CSDL: một dự án, hai nhánh / One project, two branches

Dự án dùng **một dự án Neon** với **hai nhánh** để dữ liệu thử không lẫn dữ liệu thật:

| Nhánh | Dùng cho | Dữ liệu |
|---|---|---|
| `dev` | Máy cá nhân (`.env`) | Có 5 tài khoản demo |
| `production` | Web thật (`.env.prod.local`, Vercel) | Chỉ 1 tài khoản admin |

- `.env` — trỏ vào nhánh **`dev`** (đã bị `.gitignore`, không đẩy lên GitHub).
- `.env.prod.local` — chứa chuỗi kết nối nhánh **`production`** (cũng bị bỏ qua khi
  commit; chỉ dùng khi chạy lệnh migration/seed thủ công cho production).

## Tài khoản demo / Demo accounts

Chỉ tồn tại ở **nhánh `dev`**. Mật khẩu chung / shared password: **`Demo@12345`**

Mỗi vai trò dùng một đuôi email riêng (nhìn đuôi là biết vai trò) /
Each role has its own email domain:

| Vai trò / Role | Email |
|---|---|
| Quản trị viên / Admin | `admin@admin.company.local` |
| Giám đốc / Boss | `boss@boss.company.local` |
| Thư ký / Secretary | `secretary@secretary.company.local` |
| Trưởng phòng / Dept Head | `head@head.company.local` |
| Nhân viên / Employee | `employee@employee.company.local` |

> Tài khoản demo **chỉ hiển thị trên trang đăng nhập khi `NODE_ENV !== "production"`**.

## Phân quyền / Roles & permissions

### Quyền đang áp dụng (Phase 1)

| Chức năng | Admin | Giám đốc | Thư ký | Trưởng phòng | Nhân viên |
|---|:-:|:-:|:-:|:-:|:-:|
| Quản lý người dùng | ✅ | – | – | – | – |
| Quản lý phòng ban | ✅ | – | – | – | – |
| Bảng điều khiển & hồ sơ cá nhân | ✅ | ✅ | ✅ | ✅ | ✅ |

### Thiết kế đã thống nhất (đang triển khai — xem B1…B3 của lộ trình)

| Chức năng | Admin | Giám đốc | Thư ký | Trưởng phòng | Nhân viên |
|---|:-:|:-:|:-:|:-:|:-:|
| Quản lý tài khoản & phòng ban | ✅ | – | – | – | – |
| Báo cáo **toàn công ty** (kèm chi tiết từng phòng) | ✅ | ✅ | ✅ | – | – |
| Báo cáo **phòng mình** | – | – | – | ✅ | – |
| **Giao việc** | – | ✅ toàn hệ thống | ✅ toàn hệ thống | ✅ chỉ nhân viên trong phòng | – |
| Tự tạo việc cho mình | – | ✅ | ✅ | ✅ | – |
| Xem việc **mình nhận** | – | ✅ | ✅ | ✅ | ✅ |
| Cập nhật **% + trạng thái**, báo hoàn thành | – | ✅ | ✅ | ✅ | ✅ |
| **Duyệt / từ chối** hoàn thành | – | ✅ việc mình giao | ✅ việc mình giao | ✅ việc mình giao | – |
| Tải lên / ban hành **ghi âm – biên bản** | – | – | ✅ | – | – |
| Xem biên bản đã ban hành | *do Thư ký chọn* | *do Thư ký chọn* | ✅ | *do Thư ký chọn* | *do Thư ký chọn* |

**Quy tắc chung:**

- Mỗi công việc = **1 người nhận**; một người có thể nhận nhiều việc.
- Trạng thái: `MỚI → ĐANG LÀM → CHỜ DUYỆT → HOÀN THÀNH` (và `CẦN LÀM LẠI` khi bị từ chối).
- Quá hạn mà chưa hoàn thành → tự gắn nhãn 🔴 **QUÁ HẠN**.
- Mọi thay đổi đều ghi vào **nhật ký (audit)**.

## Lộ trình / Roadmap

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| **Phase 1** | Đăng nhập, phân quyền (RBAC), quản trị người dùng & phòng ban, VI/EN | ✅ Hoàn thành |
| **B1** | Chuẩn hóa phân quyền theo vai trò + **phạm vi** (toàn công ty / phòng / cá nhân); menu theo vai trò | 🔜 Tiếp theo |
| **B2** | Module **Công việc**: giao việc, nhận việc, % + trạng thái, duyệt 2 bước, cảnh báo quá hạn | ⏳ |
| **B3** | Module **Báo cáo**: toàn công ty / từng phòng / phòng mình | ⏳ |
| **B4** | Module **Ghi âm – Biên bản**: tải lên, ban hành, chọn người xem, tách việc (miễn phí) | ⏳ |
| **B5** | **Thông báo** trong app + email | ⏳ |

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
      admin/users/     # Quản lý người dùng
      admin/departments/  # Quản lý phòng ban
      dashboard/       # Bảng điều khiển
      profile/         # Hồ sơ cá nhân
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
| `npm run vercel-build` | Build cho Vercel: generate + migrate + build (Vercel tự gọi) |
| `npm run typecheck` | Kiểm tra TypeScript |
| `npm run lint` | Kiểm tra ESLint |
| `npm run db:generate` | Sinh Prisma client |
| `npm run db:migrate` | Tạo migration mới khi dev |
| `npm run db:deploy` | Áp migration lên CSDL (production/Vercel) |
| `npm run db:seed` | Nạp dữ liệu mẫu (có tài khoản demo) |
| `npm run db:seed:prod` | Nạp dữ liệu production (1 admin, không có demo) |
| `npm run db:studio` | Mở Prisma Studio |
| `npm run db:reset` | Xóa & tạo lại CSDL |
| `npm run db:setup` | `db:deploy` + `db:seed` (chạy lần đầu) |
| `node scripts/patch-next-fat32.cjs` | Vá Next.js cho ổ FAT32 (tự chạy sau `npm install`, tự bỏ qua trên Linux/Vercel) |

## Triển khai lên Vercel / Deploy to Vercel

1. Push code lên GitHub.
2. Vercel → **Add New → Project → Import** repo.
3. Thêm **Environment Variables** (Production + Preview):

   | Biến | Giá trị |
   |---|---|
   | `DATABASE_URL` | chuỗi **pooled** của nhánh Neon `production` (có `-pooler`) |
   | `DIRECT_URL` | chuỗi **direct** của nhánh Neon `production` (không `-pooler`) |
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
- Phân quyền được kiểm tra ở **cả** `proxy.ts` (route guard) và **server action**
  (`requirePermission`) — không bao giờ tin dữ liệu từ client.

**Kế hoạch tăng cường (chưa triển khai):**

- Chặn công cụ tìm kiếm: thêm `robots.txt` + thẻ `noindex` (đây là app nội bộ).
- Giới hạn đăng nhập sai (khóa tạm sau N lần) để chống dò mật khẩu.
- Lớp chặn phía trước bằng **Cloudflare Access** (miễn phí cho công ty nhỏ) để người
  ngoài không tới được cả trang đăng nhập.
