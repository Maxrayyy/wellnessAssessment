import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserId } from "@/lib/session";

export async function GET() {
  const userId = getOrCreateUserId();

  const assessment = await prisma.assessment.findFirst({
    where: { userId, completed: true },
    orderBy: { updatedAt: "desc" },
  });
  if (!assessment) {
    return NextResponse.json({ ok: false, error: "尚未完成测评" }, { status: 404 });
  }

  const result = await prisma.assessmentResult.findUnique({
    where: { assessmentId: assessment.id },
  });
  if (!result) {
    return NextResponse.json({ ok: false, error: "测评结果尚未生成" }, { status: 404 });
  }

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
