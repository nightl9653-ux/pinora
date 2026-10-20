# Pinora · Dayfive

每天五题地图点选。正式域名：`https://dayfive.one`（路径规划：`/pi` 地图，`/fa` 面相，`/im` 移民）。

和艺术站 / Jobs 同一套：**Next.js → Vercel → Spaceship 接域名**。

## 本地

```bash
npm install
npm run dev
```

打开 http://localhost:5173

未配置 Supabase 时，成绩存在内存里（刷新进程会丢）。

## Supabase（生产必做）

1. 新建项目（或复用现有）
2. SQL 编辑器执行 `supabase/pinora.sql`（建 `pinora_players` / `pinora_rounds`）
3. Settings → API 复制：
   - Project URL → `SUPABASE_URL`
   - `service_role`（保密）→ `SUPABASE_SERVICE_ROLE_KEY`

## Vercel（和艺术站一样）

1. 把本仓库推到 GitHub
2. [vercel.com](https://vercel.com) → **Add New Project** → 选这个仓库（Framework 选 Next.js）
3. **Environment Variables**（Production / Preview 都建议填）：
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy，记下默认域名（如 `pinora-xxx.vercel.app`）

## Spaceship 接 dayfive.one

1. 打开 [Spaceship](https://www.spaceship.com) → Domains → `dayfive.one`
2. 优先用 **Connect / Vercel**：选上一步的 Vercel 项目，按向导写 DNS
3. 若手动 DNS，在 Vercel → Project → Settings → Domains 添加 `dayfive.one` 与 `www.dayfive.one`，再按提示到 Spaceship DNS 加：
   - `A` / `CNAME`（以 Vercel 面板显示为准，常见是 `@` → Vercel IP，`www` → `cname.vercel-dns.com`）
4. 等 DNS 生效后，在 Vercel Domains 看到 Valid 即可

本地不写域名；生产环境变量只放在 Vercel，不要提交 `.env`。

## 检查

```bash
npm run check
npm run build
```
