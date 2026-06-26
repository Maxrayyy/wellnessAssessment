# 健康测评 (Health Assessment)

一款基于 Next.js 的多步健康测评应用，支持进度恢复、BMI/BMR 计算、订阅制差异化报告和模拟支付。

## 技术栈

| 层次       | 技术                                    |
| ---------- | --------------------------------------- |
| 前端框架   | Next.js 14 (App Router) + React 18      |
| 类型系统   | TypeScript 5 (strict mode)              |
| 数据库     | PostgreSQL 16                           |
| ORM        | Prisma 5                                |
| 测试框架   | Vitest 1                                |
| CI         | GitHub Actions (PostgreSQL service)     |
| 部署       | Vercel (推荐)                           |

## 快速开始

### 前置条件

- Node.js 20+
- PostgreSQL 16+（本地或远程）

### 安装与运行

```bash
# 1. 克隆仓库后安装依赖
npm install

# 2. 配置环境变量
#    复制 .env.example 并根据你的数据库信息修改
cp .env.example .env
#    编辑 .env，设置 DATABASE_URL，例如：
#    DATABASE_URL="postgresql://postgres:password@localhost:5432/wellness"

# 3. 初始化数据库表结构
npx prisma db push

# 4. 启动开发服务器
npm run dev
```

打开 http://localhost:3000 即可访问测评页面。

### 测试

```bash
# 运行全部 34 个测试用例（需要 DATABASE_URL 指向可用数据库）
npm test
```

> **测试依赖数据库**：集成测试和 E2E 测试会操作数据库，请在运行前确保 `DATABASE_URL` 已正确配置。

---

## API 文档

所有 API 基于 Cookie 会话标识用户。首次请求时自动创建 `health_assessment_user_id` cookie，后续请求携带即可。

### 1. 获取进度 (GET /api/assessment)

恢复未完成的测评，或查询已完成测评的状态。

**请求示例：**
```bash
curl https://<your-project>.vercel.app/api/assessment \
  -H "Cookie: health_assessment_user_id=demo-001"
```

**响应示例：**
```json
{
  "ok": true,
  "data": {
    "currentStep": 2,
    "completed": false,
    "data": {
      "gender": "male",
      "goal": null,
      "age": null,
      "height": null,
      "weight": null,
      "targetWeight": null,
      "activityLevel": null
    }
  }
}
```

---

### 2. 分步保存 (PUT /api/assessment)

分 4 步提交测评数据。步骤必须按顺序进行（1→2→3→4）。

**Step 1 — 性别：**
```bash
curl -X PUT https://<your-project>.vercel.app/api/assessment \
  -H "Content-Type: application/json" \
  -H "Cookie: health_assessment_user_id=demo-001" \
  -d '{"step":1,"data":{"gender":"male"}}'
```

**Step 2 — 目标：**
```bash
curl -X PUT https://<your-project>.vercel.app/api/assessment \
  -H "Content-Type: application/json" \
  -H "Cookie: health_assessment_user_id=demo-001" \
  -d '{"step":2,"data":{"goal":"lose_weight"}}'
```

**Step 3 — 身体数据：**
```bash
curl -X PUT https://<your-project>.vercel.app/api/assessment \
  -H "Content-Type: application/json" \
  -H "Cookie: health_assessment_user_id=demo-001" \
  -d '{"step":3,"data":{"age":30,"height":175,"weight":80,"targetWeight":72}}'
```

**Step 4 — 运动习惯（提交后自动标记完成）：**
```bash
curl -X PUT https://<your-project>.vercel.app/api/assessment \
  -H "Content-Type: application/json" \
  -H "Cookie: health_assessment_user_id=demo-001" \
  -d '{"step":4,"data":{"activityLevel":"moderate"}}'
```

**响应示例（每步返回相同结构）：**
```json
{
  "ok": true,
  "currentStep": 2
}
```

---

### 3. 提交计算 (POST /api/assessment/complete)

在 4 步全部完成后，提交计算 BMI、BMR、每日推荐热量、目标日期和预测曲线。

**请求示例：**
```bash
curl -X POST https://<your-project>.vercel.app/api/assessment/complete \
  -H "Cookie: health_assessment_user_id=demo-001"
```

**FREE 用户响应：**
```json
{
  "bmi": 26.1,
  "bmiCategory": "Overweight",
  "recommendedCalories": 2554,
  "targetDate": "2026-09-11",
  "predictionCurve": null,
  "upsell": "订阅以查看完整预测数据"
}
```

**PREMIUM 用户响应：**
```json
{
  "bmi": 26.1,
  "bmiCategory": "Overweight",
  "recommendedCalories": 2554,
  "targetDate": "2026-09-11",
  "predictionCurve": [
    { "date": "2026-06-26", "predictedWeight": 80 },
    { "date": "2026-07-10", "predictedWeight": 78.1 },
    { "date": "2026-07-24", "predictedWeight": 76.3 },
    { "date": "2026-08-07", "predictedWeight": 74.4 },
    { "date": "2026-08-21", "predictedWeight": 72.5 },
    { "date": "2026-09-04", "predictedWeight": 72 },
    { "date": "2026-09-11", "predictedWeight": 72 }
  ]
}
```

---

### 4. 查看结果 (GET /api/assessment/result)

读取已生成的测评结果。根据订阅状态返回差异化数据。

```bash
# FREE 用户（脱敏，predictionCurve 为 null）
curl https://<your-project>.vercel.app/api/assessment/result \
  -H "Cookie: health_assessment_user_id=demo-001"

# PREMIUM 用户（完整数据）
# 先支付，再请求同个接口
```

---

### 5. 订阅状态 (GET /api/subscription)

查询当前用户的订阅状态。

```bash
curl https://<your-project>.vercel.app/api/subscription \
  -H "Cookie: health_assessment_user_id=demo-001"
```

**响应：**
```json
{
  "status": "FREE"
}
```

---

### 6. 模拟支付 (POST /api/pay)

将用户订阅从 FREE 升级为 PREMIUM（模拟支付回调）。

```bash
curl -X POST https://<your-project>.vercel.app/api/pay \
  -H "Cookie: health_assessment_user_id=demo-001"
```

**响应：**
```json
{
  "ok": true,
  "status": "PREMIUM"
}
```

### 7. 查看完整结果（支付后）

```bash
curl https://<your-project>.vercel.app/api/assessment/result \
  -H "Cookie: health_assessment_user_id=demo-001"
```

返回完整数据（含 `predictionCurve`）。

---

## 已支付测试 sessionId

使用 `demo-001` 作为 `health_assessment_user_id` 进行本地或线上测试时，调用 `/api/pay` 即可将其升级为 PREMIUM。升级后对同一 `demo-001` 的所有后续请求均为 PREMIUM 权限。

如需重置，清除 cookie 或更换用户 ID（如 `demo-002`）即可重新从 FREE 开始。

---

## 数据库 Schema

```
┌──────────────────────────────────────────────────┐
│                     User                          │
├──────────────────────────────────────────────────┤
│ id              String  (UUID, PK)               │
│ created_at      DateTime                          │
│ updated_at      DateTime                          │
├──────────────────────────────────────────────────┤
│ 1 ──────────── has many ──── Assessments          │
│ 1 ──────────── has one  ──── Subscription         │
└──────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│       Assessment        │  │      Subscription        │
├─────────────────────────┤  ├─────────────────────────┤
│ id              (PK)    │  │ id              (PK)    │
│ user_id         (FK)    │  │ user_id         (FK,UNQ)│
│ gender                  │  │ status   FREE|PREMIUM   │
│ goal                    │  │ created_at              │
│ age                     │  │ updated_at              │
│ height                  │  └─────────────────────────┘
│ weight                  │
│ target_weight           │
│ activity_level          │
│ current_step            │
│ completed   boolean     │
│ created_at              │
│ updated_at              │
├─────────────────────────┤
│ 1 ───── has one ──── Result
└─────────────────────────┘
         │
         ▼
┌──────────────────────────────────────────┐
│           AssessmentResult                │
├──────────────────────────────────────────┤
│ id                  (PK)                 │
│ assessment_id       (FK, UNQ)            │
│ bmi                Float                 │
│ bmi_category       String                │
│ recommended_calories  Int                │
│ target_date        DateTime              │
│ prediction_curve   Json?                 │
│ created_at                              │
└──────────────────────────────────────────┘
```

### 关系说明

- **User 1:N Assessment** — 一个用户可以多次测评（保留历史）
- **User 1:1 Subscription** — 每个用户一个订阅记录
- **Assessment 1:1 AssessmentResult** — 每次测评对应一个计算结果

---

## 算法说明

所有算法为纯函数，位于 `src/lib/algorithm.ts`：

| 算法             | 公式                                                         |
| ---------------- | ------------------------------------------------------------ |
| BMI              | `体重(kg) / (身高(m))²`                                      |
| BMI 分类          | `< 18.5 偏瘦 / 18.5-24.9 正常 / 25-29.9 超重 / ≥ 30 肥胖`  |
| BMR (男性)       | `10 × 体重 + 6.25 × 身高 − 5 × 年龄 + 5`                   |
| BMR (女性)       | `10 × 体重 + 6.25 × 身高 − 5 × 年龄 − 161`                 |
| 每日推荐热量     | `BMR × 活动系数` (sedentary 1.2 / light 1.375 / moderate 1.55 / active 1.725) |
| 目标日期         | `|目标体重−当前体重| × 7700 ÷ 500 天` (日亏空 500 kcal)     |
| 预测曲线         | 从当前体重到目标体重的线性插值，最多 30 个采样点             |

---

## 测试覆盖说明

### 测试总数：34

| 分组                   | 数量 | 覆盖内容                                                     |
| ---------------------- | ---- | ------------------------------------------------------------ |
| 算法单元测试           | 20   | BMI/BMI分类/BMR/每日热量/目标日期/预测曲线 各项的常规值和边界值 |
| 集成测试（分步保存）   | 7    | 4步保存和进度推进、中断恢复、乱序拦截、数据验证拦截          |
| 集成测试（鉴权差异化） | 3    | FREE脱敏/PREMIUM完整/DB有数据但接口过滤                       |
| E2E 测试               | 4    | 初始FREE状态、/pay后PREMIUM、FREE→PREMIUM完整闭环、多次/pay幂等 |

### 为什么这样覆盖

- **算法测试**：健康指标计算是核心业务逻辑，边界值（极端身高体重、BMR性别差异）必须保证精确
- **集成测试**：验证状态机（步骤推进）、数据持久化和恢复逻辑
- **鉴权测试**：FREE/PREMIUM 差异化返回是商业逻辑核心，必须覆盖 DB 有数据但 API 过滤的场景
- **E2E 测试**：支付闭环覆盖了完整业务链路：FREE 查看 → 支付 → PREMIUM 查看

### 未覆盖及原因

- **前端组件渲染测试**：测评 UI 为一次性交互，变化频繁，手工验证效率更高。关键路径（4步流转+支付弹窗）在 E2E 测试中通过 API 层间接覆盖
- **负载/性能测试**：MVP 阶段非必要，API 层无阻塞 I/O 操作
- **跨浏览器 E2E**：同前端组件测试原因
- **第三方支付集成测试**：`POST /api/pay` 为模拟回调，无真实第三方依赖

---

## 部署

### Vercel（推荐）

1. 在 [Vercel Dashboard](https://vercel.com) 中点击 **New Project**
2. 选择 **Import Git Repository**，导入当前仓库
3. 在 **Environment Variables** 中设置：
   - `DATABASE_URL` — 指向你的 PostgreSQL 数据库（推荐 [Supabase](https://supabase.com) 免费 tier）
4. 点击 **Deploy**
5. 部署完成后，Vercel 会提供一个 `<your-project>.vercel.app` 域名

### 环境变量

| 变量名         | 必填 | 说明                   |
| -------------- | ---- | ---------------------- |
| `DATABASE_URL` | 是   | PostgreSQL 连接字符串  |

### 验证部署

```bash
curl https://<your-project>.vercel.app/api/subscription
# → {"status":"FREE"}
```

按 [API 文档](#api-文档) 中的 cURL 示例，替换 `<URL>` 为你的部署地址进行完整测试。

> `<URL>` 占位符需要替换为实际部署地址，例如 `https://wellness-assessment.vercel.app`。

---

## AI 使用复盘

本项目全程使用 Claude (Claude Code CLI) 作为开发助手，采用 TDD 与 SpecDD 混合模式：

### 已落实

- **TDD 模式**：Task 4 算法模块采用先写测试再实现的方式，算法准确率通过 20 个测试用例验证
- **SpecDD 任务拆分**：9 个 Task 按依赖顺序（类型→算法→API→前端→CI）递进，每个 Task 产出可验证
- **代码生成质量**：API route 层、Prisma schema、校验逻辑均由 Claude 生成，手动调整极少
- **测试生成**：34 个测试用例全部由 Claude 生成，覆盖边界值和业务场景

### 人工决策

- `POST /api/assessment/complete` 同时完成计算和写入，而非分离两步，简化前端逻辑
- 前端 inline style 而非 Tailwind，减少依赖并保持单文件可读性
- 测试使用 Vitest 而非 Jest，与 Next.js 兼容性更好，配置更轻量
- 模拟支付而非集成 Stripe，聚焦 MVP 核心链路验证

### 改进空间

- 可引入更严格的 API 响应类型校验（如 zod 运行时验证）
- 预测曲线可加入非线性模型（如 Mifflin-St Jeor 方程）
- 前端可添加 loading skeleton 和错误重试状态
