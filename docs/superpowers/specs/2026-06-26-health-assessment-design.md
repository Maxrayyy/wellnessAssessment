# 健康测评系统 — 设计文档

**日期**: 2026-06-26
**状态**: 已确认

---

## 一、项目概述

设计并开发一个健康测评系统的核心后端架构。用户通过分步表单填写性别、目标、身体数据、运动频率，后端计算 BMI、推荐摄入量、目标预测日期，并通过模拟订阅体系实现差异化结果返回。

## 二、技术选型

| 决策 | 选项 | 原因 |
|------|------|------|
| 前端框架 | Next.js App Router + TypeScript | 需求指定，与 Vercel 深度集成 |
| 后端 | Next.js API Routes | 与前端同仓，route handlers 即 API |
| 数据库 | Supabase (PostgreSQL) + Prisma ORM | 免费、云托管、标准 PG，Prisma 提供类型安全 |
| 用户识别 | Cookie Session (userId) | 后端可控，无需引入额外 session 库 |
| 部署 | Vercel | Next.js 官方平台，零配置，自动 HTTPS |
| 测试 | Vitest | TypeScript 原生支持，速度快，API 兼容 Jest |

## 三、数据库 Schema

### ER 关系

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│    User      │────→│   Assessment     │────→│  AssessmentResult    │
├──────────────┤     ├──────────────────┤     ├─────────────────────┤
│ id (uuid PK) │     │ id (uuid PK)     │     │ id (uuid PK)        │
│ created_at   │     │ user_id (uuid FK)│     │ assessment_id (FK)  │
│ updated_at   │     │ gender           │     │ bmi (float)         │
└──────────────┘     │ goal             │     │ bmi_category (str)  │
       │             │ age (int)        │     │ recommended_calories│
       │             │ height (float)   │     │ target_date (date)  │
       │             │ weight (float)   │     │ prediction_curve (j)│
       │             │ target_weight    │     │ created_at          │
       │             │ activity_level   │     └─────────────────────┘
       │             │ current_step (1-4)│
       │             │ completed (bool) │
       │             └──────────────────┘
       │
       │          ┌──────────────────┐
       └─────────→│  Subscription    │
                  ├──────────────────┤
                  │ id (uuid PK)     │
                  │ user_id (uuid FK,│
                  │   unique)        │
                  │ status (enum)    │
                  │ created_at       │
                  │ updated_at       │
                  └──────────────────┘
```

### 字段说明

- **User.id**: UUID，首次访问时生成，通过 cookie 传递
- **Assessment.current_step**: 1=性别, 2=目标, 3=身体数据, 4=运动频率
- **Assessment.completed**: 全部填写完成后为 true
- **AssessmentResult.prediction_curve**: JSON 类型，存储预测曲线数据数组（付费可见内容）
- **Subscription.status**: 枚举 `FREE` | `PREMIUM`，默认 `FREE`

### 设计要点

- 三张表各司其职：身份、测评数据、订阅状态分离
- `current_step` 字段实现分步保存和进度恢复
- `prediction_curve` 用 JSON 存，灵活且不需要额外的曲线表
- Subscription 的 user_id 设为 unique，保证一个用户只有一条订阅记录

## 四、API 设计

### 端点总览

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/assessment` | 获取当前进度和已填数据 |
| `PUT` | `/api/assessment` | 分步保存（body 含 step + 数据） |
| `POST` | `/api/assessment/complete` | 提交全部数据，触发计算 |
| `GET` | `/api/assessment/result` | 获取计算结果（差异化返回） |
| `GET` | `/api/subscription` | 查询当前订阅状态 |
| `POST` | `/api/pay` | 模拟支付，FREE → PREMIUM |

### 请求/响应结构

**PUT /api/assessment**

```json
// 请求
{ "step": 2, "data": { "goal": "lose_weight" } }

// 响应 200
{ "ok": true, "currentStep": 2 }
// 响应 400
{ "error": "缺少必填字段: goal" }
```

**POST /api/assessment/complete**

```json
// 响应 200 (FREE)
{
  "bmi": 24.3,
  "bmiCategory": "Normal",
  "recommendedCalories": 1850,
  "targetDate": "2026-09-15",
  "predictionCurve": null,
  "upsell": "订阅以查看完整预测数据"
}

// 响应 200 (PREMIUM) — predictionCurve 为完整数组
{
  "bmi": 24.3,
  "bmiCategory": "Normal",
  "recommendedCalories": 1850,
  "targetDate": "2026-09-15",
  "predictionCurve": [
    { "date": "2026-07-01", "predictedWeight": 78.5 },
    { "date": "2026-07-15", "predictedWeight": 76.8 }
  ]
}
```

### 权限拦截

- `GET /api/assessment/result` 和 `POST /api/assessment/complete` 读取用户 cookie 中的 userId → 查 subscription 状态 → FREE 返回脱敏，PREMIUM 返回完整

## 五、健康评估算法

### BMI

```
BMI = weight(kg) / (height(m) × height(m))
```

分类：<18.5 Underweight, 18.5–24.9 Normal, 25.0–29.9 Overweight, ≥30.0 Obese

### 推荐日摄入量（Mifflin-St Jeor BMR × 活动系数）

```
男性 BMR = 10 × weight + 6.25 × height - 5 × age + 5
女性 BMR = 10 × weight + 6.25 × height - 5 × age - 161
```

活动系数：sedentary=1.2, light=1.375, moderate=1.55, active=1.725

### 目标预测日期

```
每日卡路里差 = 500（减重缺口 / 增重盈余）
预测天数 = |目标体重 - 当前体重| × 7700 / 500
预测日期 = today + 预测天数
```

### 边界校验规则

| 字段 | 合法范围 | 非法时返回 |
|------|----------|-----------|
| age | 18–100 | 400 |
| height | 100–250 cm | 400 |
| weight | 30–300 kg | 400 |
| target_weight | 30–300 kg | 400 |
| 逻辑校验 | \|target_weight - weight\| ≤ 50 kg | 400 "目标体重不合理" |

### 预测曲线生成

基于目标日期和体重差，生成每日线性插值数据点，作为 `prediction_curve` JSON 数组存储。

## 六、测试策略

### 6.1 单元测试 — 健康评估算法

- 正常场景：多组不同参数的输入，验证 BMI/BMR/target_date 计算正确
- BMI 边界：身高 100/250cm，体重 30/300kg 刚好在边界合法
- 非法输入：age=10/200、height=0、weight=-1，验证返回 400 和清晰错误信息
- 逻辑异常：target_weight 差 80kg，验证被拦截

### 6.2 集成测试 — 分步保存 + 进度恢复

- 正常流程：依次 PUT step 1→2→3→4，验证 current_step 递进
- 中断恢复：填到 step 3 后模拟 GET，验证返回 current_step=3 和已填数据
- 乱序提交：跳过 step 2 直接提交 step 3，验证返回错误
- 重复提交：已完成的 step 再次提交，验证幂等处理

### 6.3 鉴权差异化测试

- FREE 用户 GET /result：prediction_curve 为 null，含 upsell 提示
- PREMIUM 用户 GET /result：prediction_curve 为完整数据数组
- 字段白名单校验：确保 FREE 响应不含任何不应暴露的字段

### 6.4 端到端测试 — /pay 闭环

- POST /pay → 验证 subscription.status 变为 PREMIUM
- 同一用户 /pay 前 GET /result 脱敏，/pay 后完整
- 整个流程：填表 → 完成 → 查看脱敏结果 → /pay → 查看完整结果

### 6.5 数据验证测试

- 每个 PUT 接口验证非法 body（缺字段、类型错误、空字符串、超限值）
- 验证所有异常返回 400 而非 500

## 七、项目结构

```
wellnessAssessment/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── assessment/
│   │   │   │   ├── route.ts          # GET (进度) + PUT (分步保存)
│   │   │   │   ├── complete/
│   │   │   │   │   └── route.ts      # POST (提交+计算)
│   │   │   │   └── result/
│   │   │   │       └── route.ts      # GET (差异化结果)
│   │   │   ├── subscription/
│   │   │   │   └── route.ts          # GET (查询订阅)
│   │   │   └── pay/
│   │   │       └── route.ts          # POST (模拟支付)
│   │   ├── page.tsx                  # 测评前端页面
│   │   └── layout.tsx
│   ├── lib/
│   │   ├── prisma.ts                 # Prisma 客户端单例
│   │   ├── algorithm.ts             # 健康评估算法（纯函数）
│   │   ├── validation.ts            # 数据校验工具
│   │   └── session.ts               # Cookie session 工具
│   └── types/
│       └── index.ts                  # TypeScript 类型定义
├── tests/
│   ├── unit/
│   │   └── algorithm.test.ts
│   ├── integration/
│   │   ├── assessment-flow.test.ts
│   │   └── auth-diff.test.ts
│   └── e2e/
│       └── pay-flow.test.ts
├── vitest.config.ts
├── package.json
├── tsconfig.json
└── README.md
```

## 八、部署架构

```
  [Vercel] — 运行 Next.js 应用
      │
      ├──→ [Supabase] — PostgreSQL 数据库
      │        ├── User 表
      │        ├── Assessment 表
      │        ├── AssessmentResult 表
      │        └── Subscription 表
      │
      └──→ 用户浏览器
              ├── Cookie: userId=<uuid>
              └── localStorage: (前端状态缓存，可选)
```

部署步骤：
1. `git push` 到 GitHub
2. Vercel 关联仓库自动部署
3. 在 Vercel Dashboard 设置环境变量（DATABASE_URL 等）
4. 访问 `https://<project>.vercel.app` 即可演示

---

*文档版本: 1.0 — 所有章节已与用户逐项确认*
