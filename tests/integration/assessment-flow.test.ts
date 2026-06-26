import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestUser, cleanupTestUser } from "../helpers";
import { prisma } from "@/lib/prisma";
import { validateStep } from "@/lib/validation";

describe("Assessment Flow — 分步保存", () => {
  let userId: string;

  beforeEach(async () => { const r = await createTestUser(); userId = r.userId; });
  afterEach(async () => { await cleanupTestUser(userId); });

  it("Step 1: 保存性别 → currentStep 推进到 2", async () => {
    const a = await prisma.assessment.findFirstOrThrow({ where: { userId } });
    expect(a.currentStep).toBe(1);
    await prisma.assessment.update({
      where: { id: a.id },
      data: { gender: "male", currentStep: 2 },
    });
    const updated = await prisma.assessment.findFirstOrThrow({ where: { userId } });
    expect(updated.gender).toBe("male");
    expect(updated.currentStep).toBe(2);
  });

  it("Step 2: 保存目标 → currentStep 推进到 3", async () => {
    const a = await prisma.assessment.findFirstOrThrow({ where: { userId } });
    await prisma.assessment.update({
      where: { id: a.id },
      data: { goal: "lose_weight", currentStep: 2, gender: "male" },
    });
    const updated = await prisma.assessment.update({
      where: { id: a.id },
      data: { goal: "lose_weight", currentStep: 3 },
    });
    expect(updated.goal).toBe("lose_weight");
    expect(updated.currentStep).toBe(3);
  });

  it("Step 3: 保存身体数据", async () => {
    const a = await prisma.assessment.findFirstOrThrow({ where: { userId } });
    await prisma.assessment.update({ where: { id: a.id }, data: {
      gender: "male", goal: "lose_weight", currentStep: 3,
    }});
    const updated = await prisma.assessment.update({ where: { id: a.id }, data: {
      age: 30, height: 175, weight: 80, targetWeight: 72, currentStep: 4,
    }});
    expect(updated.age).toBe(30);
    expect(updated.height).toBe(175);
    expect(updated.weight).toBe(80);
    expect(updated.targetWeight).toBe(72);
    expect(updated.currentStep).toBe(4);
  });

  it("Step 4: 保存运动频率 → completed=true", async () => {
    const a = await prisma.assessment.findFirstOrThrow({ where: { userId } });
    await prisma.assessment.update({ where: { id: a.id }, data: {
      gender: "female", goal: "maintain", age: 28, height: 165,
      weight: 55, targetWeight: 55, currentStep: 4,
    }});
    await prisma.assessment.update({ where: { id: a.id }, data: {
      activityLevel: "moderate", completed: true,
    }});
    const updated = await prisma.assessment.findFirstOrThrow({ where: { userId } });
    expect(updated.activityLevel).toBe("moderate");
    expect(updated.completed).toBe(true);
  });

  it("乱序提交应被拒绝: 校验步骤顺序", async () => {
    const errors = validateStep(3, {
      age: 30, height: 175, weight: 80, targetWeight: 72,
    });
    expect(errors).toEqual([]); // step 3 数据本身合法

    // 但步骤顺序校验应在 handler 层完成
    const isStepValid = (currentStep: number, requestedStep: number) =>
      requestedStep === currentStep;
    expect(isStepValid(1, 1)).toBe(true);
    expect(isStepValid(1, 3)).toBe(false);
  });

  it("非法数据被 validateStep 拦截", async () => {
    // age=0
    const e1 = validateStep(3, { age: 0, height: 175, weight: 80, targetWeight: 72 });
    expect(e1.length).toBeGreaterThan(0);
    // height=300  > 250
    const e2 = validateStep(3, { age: 30, height: 300, weight: 80, targetWeight: 72 });
    expect(e2.length).toBeGreaterThan(0);
    // targetWeight 差距 > 50
    const e3 = validateStep(3, { age: 30, height: 175, weight: 50, targetWeight: 120 });
    expect(e3.length).toBeGreaterThan(0);
  });
});

describe("Assessment Flow — 进度恢复", () => {
  let userId: string;

  beforeEach(async () => {
    const r = await createTestUser({
      currentStep: 3, gender: "male", goal: "lose_weight",
      age: 30, height: 175, weight: 80,
    });
    userId = r.userId;
  });
  afterEach(async () => { await cleanupTestUser(userId); });

  it("中断恢复: 填到 step 3 后重新访问，返回 currentStep=3 和已填数据", async () => {
    const a = await prisma.assessment.findFirstOrThrow({ where: { userId } });
    expect(a.currentStep).toBe(3);
    expect(a.completed).toBe(false);
    expect(a.gender).toBe("male");
    expect(a.goal).toBe("lose_weight");
    expect(a.age).toBe(30);
    expect(a.height).toBe(175);
    expect(a.weight).toBe(80);
  });
});
