# Vercel 部署 Prisma + Next.js 构建失败

**日期**: 2026-06-26
**影响范围**: Vercel 生产构建，3 次部署失败

## 现象

Vercel `npm run build` 在 `Collecting page data` 阶段报错：

```
Error: Failed to collect page data for /api/assessment/complete
clientVersion: '5.22.0', errorCode: undefined
```

`errorCode: undefined` 是 Prisma 无法连接数据库的标志。

## 根因分析（共 4 个问题）

### 根因 1（主要）: `prisma` CLI 在 devDependencies 中

Vercel 构建时 `NODE_ENV=production`，`npm install` 只安装 `dependencies`，不会安装 `devDependencies`。`prisma` CLI 在 `devDependencies` 中，因此 `prisma generate` 命令不可用，Prisma 客户端未被生成。

**修复**: 将 `prisma` 从 `devDependencies` 移到 `dependencies`。

### 根因 2: `build` 脚本未显式执行 `prisma generate`

虽然添加了 `postinstall: prisma generate`，但 `build` 脚本直接执行 `next build`，在 Vercel 环境中 postinstall 的执行时机和顺序可能不完全可靠。

**修复**: 将 `build` 改为 `prisma generate && next build`，显式保证 Prisma 客户端在构建前生成。

### 根因 3: Supabase Pooler 与 Prisma prepared statements 冲突

Supabase 的连接池基于 PgBouncer（transaction 模式），不支持 Prisma 默认的 prepared statements。连接池模式下执行 prepared statements 会返回协议错误。

**修复**: 在 DATABASE_URL 末尾添加 `?pgbouncer=true&connection_limit=1`，告知 Prisma 禁用 prepared statements 并将连接数限制为 1（serverless 友好）。

### 根因 4: 缺少 Vercel 兼容的 Prisma 二进制目标

Next.js 在构建时可能触发 API route 的模块加载。没有 `force-dynamic` 的情况下，Vercel 的 Amazon Linux 2 环境缺少正确的 Prisma engine 二进制文件。

**修复**:
- 在 `schema.prisma` 添加 `binaryTargets = ["native", "rhel-openssl-3.0.x"]`
- 在所有 API route 添加 `export const dynamic = "force-dynamic"`

## 最终修复清单

| # | 文件 | 改动 |
|---|------|------|
| 1 | `package.json` | `prisma` 移到 `dependencies`；`build` 改为 `prisma generate && next build` |
| 2 | `.env` | DATABASE_URL 加 `?pgbouncer=true&connection_limit=1` |
| 3 | `prisma/schema.prisma` | 添加 `binaryTargets = ["native", "rhel-openssl-3.0.x"]` |
| 4 | 5 个 `route.ts` | 每个添加 `export const dynamic = "force-dynamic"` |

## 教训

1. **Vercel ≠ 本地**: Vercel 生产构建只装 `dependencies`，所有构建期需要的工具（`prisma`、`tsc` 等）必须放在 `dependencies`
2. **连接池需要适配**: Supabase pooler（PgBouncer）需要 `?pgbouncer=true` 参数，这是 Prisma + Supabase 的必备配置
3. **排查顺序**: 本地 `npm run build` 成功不代表 Vercel 能过，差异在于环境变量、依赖安装范围、操作系统二进制目标
4. **搜索优于猜测**: 遇到 Vercel 构建错误时应先搜索 "Vercel + Prisma + Next.js build error" 而非逐项试错
