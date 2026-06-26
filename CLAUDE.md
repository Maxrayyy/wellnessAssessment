# CLAUDE.md — 健康测评系统

## 运行环境

- **Node.js**: v20.20.1
- **包管理器**: npm 10.8.2
- **Shell**: zsh (WSL2, Linux 6.18)
- **数据库**: Supabase PostgreSQL（通过 Prisma 连接）
- **部署**: Vercel

## 技术架构

```
Next.js 14 (App Router) + TypeScript
  ├── 前端: src/app/page.tsx (多步测评表单 + 结果页)
  ├── API Routes: src/app/api/
  │   ├── assessment/        → GET(进度恢复) + PUT(分步保存)
  │   ├── assessment/complete/ → POST(提交并计算)
  │   ├── assessment/result/   → GET(差异化返回)
  │   ├── subscription/      → GET(查询订阅)
  │   └── pay/               → POST(模拟支付)
  ├── Lib: src/lib/
  │   ├── prisma.ts          → Prisma 客户端单例
  │   ├── algorithm.ts       → 健康评估算法(纯函数)
  │   ├── validation.ts      → 数据校验
  │   └── session.ts         → Cookie session 工具
  └── Types: src/types/index.ts

Prisma ORM → Supabase PostgreSQL
  ├── User
  ├── Assessment
  ├── AssessmentResult
  └── Subscription

Vitest → 测试三层: 单元 / 集成 / E2E
```

## SDD 驱动开发（Spec-Driven Development）

本项目采用 **文档驱动实现** 的工作方式。所有设计决策、API 契约、数据模型均先写入文档，再驱动代码：

- **设计文档**: `docs/superpowers/specs/` — 系统架构、Schema、API 设计、算法、测试策略
- **实现计划**: `docs/superpowers/plans/` — 任务分解、文件路径、接口契约、步骤级代码

**流程**: 设计文档 → 实现计划 → 按 Task 逐项实现 → 测试验证 → 提交

在开始任何编码前，须确认对应设计已在文档中体现。

## 文档同步规则（重要）

**每次代码变更后必须同步更新 `docs/` 中的相关文档**，包括但不限于：

| 变更类型 | 需更新的文档 |
|----------|-------------|
| 新增/修改 API 端点 | `specs/*-design.md` 的 API 设计章节 |
| 数据库 Schema 变更 | `specs/*-design.md` 的 Schema 章节 + `plans/*-plan.md` 的对应 Task |
| 算法/业务规则变更 | `specs/*-design.md` 的算法章节 |
| Human 做出的决策/方向变更 | `specs/*-design.md` 对应章节 + 新增 `docs/decisions/` 记录 |
| Bug 修复 | `docs/bugs/` 记录原因与教训 |
| 新增/删除测试用例 | `plans/*-plan.md` 的测试策略 |

**Bug 教训格式** (`docs/bugs/YYYY-MM-DD-<简述>.md`):
```markdown
# <bug 简述>

**日期**: YYYY-MM-DD
**根因**: <为什么会发生>
**修复**: <怎么修的>
**教训**: <以后怎么避免>
```

## Git 提交规范

### 提交信息

- **语言**: 中文
- **格式**: 约定式提交
  - `feat: <描述>` — 新功能
  - `fix: <描述>` — 修复 bug
  - `chore: <描述>` — 杂项（依赖、配置、脚手架）
  - `docs: <描述>` — 文档变更
  - `refactor: <描述>` — 重构（不改变功能）
  - `test: <描述>` — 仅测试相关
- **禁止**: 不要在 commit message 中加 `Co-Authored-By` 或任何署名

### 提交节奏

- 每完成一个 Task 或独立阶段提交一次
- 每完成一个重要步骤（如"算法实现+测试通过"）提交一次
- 便于审查和回退，粒度宜小不宜大

### Push 策略

- push 超时 15 秒
- 超时或失败 → 停止，提示 human 手动 `git push`
- 不要反复重试

## 项目文件结构

```
wellnessAssessment/
├── prisma/schema.prisma
├── src/
│   ├── app/
│   │   ├── api/...
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── lib/...
│   └── types/index.ts
├── tests/
│   ├── setup.ts
│   ├── helpers.ts
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/
│   ├── superpowers/
│   │   ├── specs/    → 设计文档
│   │   └── plans/    → 实现计划
│   ├── decisions/    → 决策记录
│   └── bugs/         → bug 教训
├── vitest.config.ts
├── package.json
├── tsconfig.json
└── README.md
```
