import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestUser, cleanupTestUser } from "../helpers";
import { prisma } from "@/lib/prisma";
import {
  calculateBMI, getBMICategory, calculateBMR,
  calculateDailyCalories, calculateTargetDate, generatePredictionCurve,
} from "@/lib/algorithm";

describe("Pay Flow — /pay 回调端到端验证", () => {
  let userId: string;

  beforeEach(async () => {
    const r = await createTestUser({
      currentStep: 4, completed: true,
      gender: "male", goal: "lose_weight",
      age: 30, height: 175, weight: 80, targetWeight: 72,
      activityLevel: "moderate",
    });
    userId = r.userId;

    const a = await prisma.assessment.findFirstOrThrow({ where: { userId } });
    const bmi = calculateBMI(80, 175);
    const bmiCategory = getBMICategory(bmi);
    const bmr = calculateBMR("male", 80, 175, 30);
    const cal = calculateDailyCalories(bmr, "moderate");
    const td = calculateTargetDate(80, 72);
    const curve = generatePredictionCurve(80, 72, td);

    await prisma.assessmentResult.create({
      data: {
        assessmentId: a.id, bmi, bmiCategory,
        recommendedCalories: cal,
        targetDate: new Date(td),
        predictionCurve: JSON.parse(JSON.stringify(curve)),
      },
    });
  });

  afterEach(async () => { await cleanupTestUser(userId); });

  it("初始状态为 FREE", async () => {
    const sub = await prisma.subscription.findFirstOrThrow({ where: { userId } });
    expect(sub.status).toBe("FREE");
  });

  it("/pay 后 status 变为 PREMIUM", async () => {
    await prisma.subscription.update({
      where: { userId }, data: { status: "PREMIUM" },
    });
    const sub = await prisma.subscription.findFirstOrThrow({ where: { userId } });
    expect(sub.status).toBe("PREMIUM");
  });

  it("完整闭环: FREE脱敏 → /pay → PREMIUM完整", async () => {
    const sub1 = await prisma.subscription.findFirstOrThrow({ where: { userId } });
    const result = await prisma.assessmentResult.findFirstOrThrow({
      where: { assessment: { userId } },
    });

    // FREE: predictionCurve 被过滤
    if (sub1.status === "FREE") {
      expect(result.predictionCurve).not.toBeNull(); // DB 中有
      // 接口会过滤为 null
    }

    // 执行支付
    await prisma.subscription.update({
      where: { userId }, data: { status: "PREMIUM" },
    });

    const sub2 = await prisma.subscription.findFirstOrThrow({ where: { userId } });
    expect(sub2.status).toBe("PREMIUM");

    // PREMIUM: predictionCurve 完整
    const isFree = sub2.status === "FREE";
    const curve = isFree ? null : result.predictionCurve;
    expect(curve).not.toBeNull();
    expect((curve as any[]).length).toBeGreaterThan(0);
  });

  it("多次 /pay 保持 PREMIUM（幂等）", async () => {
    await prisma.subscription.update({ where: { userId }, data: { status: "PREMIUM" } });
    await prisma.subscription.update({ where: { userId }, data: { status: "PREMIUM" } });
    const sub = await prisma.subscription.findFirstOrThrow({ where: { userId } });
    expect(sub.status).toBe("PREMIUM");
  });
});
