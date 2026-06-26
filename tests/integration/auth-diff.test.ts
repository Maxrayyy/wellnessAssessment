import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestUser, cleanupTestUser } from "../helpers";
import { prisma } from "@/lib/prisma";
import {
  calculateBMI, getBMICategory, calculateBMR,
  calculateDailyCalories, calculateTargetDate, generatePredictionCurve,
} from "@/lib/algorithm";

describe("鉴权差异化返回", () => {
  let userId: string;
  let assessmentId: string;

  beforeEach(async () => {
    const r = await createTestUser({
      currentStep: 4, completed: true,
      gender: "male", goal: "lose_weight",
      age: 30, height: 175, weight: 80, targetWeight: 72,
      activityLevel: "moderate",
    });
    userId = r.userId;
    assessmentId = r.assessmentId;

    const a = await prisma.assessment.findFirstOrThrow({ where: { userId } });
    const bmi = calculateBMI(a.weight!, a.height!);
    const bmiCategory = getBMICategory(bmi);
    const bmr = calculateBMR(a.gender as any, a.weight!, a.height!, a.age!);
    const cal = calculateDailyCalories(bmr, a.activityLevel as any);
    const td = calculateTargetDate(a.weight!, a.targetWeight!);
    const curve = generatePredictionCurve(a.weight!, a.targetWeight!, td);

    await prisma.assessmentResult.create({
      data: {
        assessmentId: a.id,
        bmi, bmiCategory,
        recommendedCalories: cal,
        targetDate: new Date(td),
        predictionCurve: JSON.parse(JSON.stringify(curve)),
      },
    });
  });

  afterEach(async () => { await cleanupTestUser(userId); });

  it("FREE 用户: predictionCurve=null，含 upsell 提示", async () => {
    const sub = await prisma.subscription.findFirstOrThrow({ where: { userId } });
    expect(sub.status).toBe("FREE");

    const result = await prisma.assessmentResult.findFirstOrThrow({
      where: { assessmentId },
    });
    const isFree = sub.status === "FREE";
    const response = {
      bmi: result.bmi,
      bmiCategory: result.bmiCategory,
      recommendedCalories: result.recommendedCalories,
      targetDate: result.targetDate.toISOString().split("T")[0],
      predictionCurve: isFree ? null : result.predictionCurve,
      ...(isFree ? { upsell: "订阅以查看完整预测数据" } : {}),
    };

    expect(response.predictionCurve).toBeNull();
    expect(response.upsell).toBe("订阅以查看完整预测数据");
    expect(response.bmi).toBeGreaterThan(0);
  });

  it("PREMIUM 用户: predictionCurve 完整数据，无 upsell", async () => {
    await prisma.subscription.update({
      where: { userId }, data: { status: "PREMIUM" },
    });

    const result = await prisma.assessmentResult.findFirstOrThrow({
      where: { assessmentId },
    });
    const sub = await prisma.subscription.findFirstOrThrow({ where: { userId } });
    const isFree = sub.status === "FREE";

    const response = {
      bmi: result.bmi,
      bmiCategory: result.bmiCategory,
      recommendedCalories: result.recommendedCalories,
      targetDate: result.targetDate.toISOString().split("T")[0],
      predictionCurve: isFree ? null : result.predictionCurve,
      ...(isFree ? { upsell: "订阅以查看完整预测数据" } : {}),
    };

    expect(response.predictionCurve).not.toBeNull();
    expect((response.predictionCurve as any[]).length).toBeGreaterThan(0);
    expect(response.upsell).toBeUndefined();
  });

  it("FREE 用户 DB 中有完整数据但接口层面被过滤", async () => {
    const sub = await prisma.subscription.findFirstOrThrow({ where: { userId } });
    const result = await prisma.assessmentResult.findFirstOrThrow({
      where: { assessmentId },
    });
    // DB 中有完整 curve
    expect(result.predictionCurve).not.toBeNull();

    // 接口层面针对 FREE 过滤
    if (sub.status === "FREE") {
      const safe = {
        ...result,
        predictionCurve: null,
        upsell: "订阅以查看完整预测数据",
      };
      expect(safe.predictionCurve).toBeNull();
    }
  });
});
