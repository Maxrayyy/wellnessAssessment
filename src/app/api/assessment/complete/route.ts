import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserId } from "@/lib/session";
import {
  calculateBMI, getBMICategory, calculateBMR,
  calculateDailyCalories, calculateTargetDate, generatePredictionCurve,
} from "@/lib/algorithm";

export async function POST() {
  const userId = getOrCreateUserId();

  const assessment = await prisma.assessment.findFirst({
    where: { userId, completed: true },
    orderBy: { updatedAt: "desc" },
  });
  if (!assessment) {
    return NextResponse.json({ ok: false, error: "请先完成所有测评步骤" }, { status: 400 });
  }

  const existing = await prisma.assessmentResult.findUnique({
    where: { assessmentId: assessment.id },
  });
  if (existing) return buildResponse(userId, existing);

  const gender = assessment.gender as "male" | "female";
  const al = assessment.activityLevel as "sedentary" | "light" | "moderate" | "active";

  const bmi = calculateBMI(assessment.weight!, assessment.height!);
  const bmiCategory = getBMICategory(bmi);
  const bmr = calculateBMR(gender, assessment.weight!, assessment.height!, assessment.age!);
  const calories = calculateDailyCalories(bmr, al);
  const targetDate = calculateTargetDate(assessment.weight!, assessment.targetWeight!);
  const curve = generatePredictionCurve(assessment.weight!, assessment.targetWeight!, targetDate);

  const result = await prisma.assessmentResult.create({
    data: {
      assessmentId: assessment.id,
      bmi, bmiCategory,
      recommendedCalories: calories,
      targetDate: new Date(targetDate),
      predictionCurve: JSON.parse(JSON.stringify(curve)),
    },
  });

  return buildResponse(userId, result);
}

async function buildResponse(userId: string, result: any) {
  const subscription = await prisma.subscription.findUnique({ where: { userId } });
  const isFree = !subscription || subscription.status === "FREE";

  const response: Record<string, unknown> = {
    bmi: result.bmi,
    bmiCategory: result.bmiCategory,
    recommendedCalories: result.recommendedCalories,
    targetDate: result.targetDate instanceof Date
      ? result.targetDate.toISOString().split("T")[0]
      : result.targetDate,
    predictionCurve: isFree ? null : result.predictionCurve,
  };
  if (isFree) response.upsell = "订阅以查看完整预测数据";
  return NextResponse.json(response);
}
