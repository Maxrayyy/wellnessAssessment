import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserId } from "@/lib/session";
import { validateStep } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET() {
  const userId = getOrCreateUserId();

  let assessment = await prisma.assessment.findFirst({
    where: { userId, completed: false },
  });

  if (!assessment) {
    const completed = await prisma.assessment.findFirst({
      where: { userId, completed: true },
      orderBy: { updatedAt: "desc" },
    });

    if (completed) {
      return NextResponse.json({ ok: true, data: {
        currentStep: completed.currentStep,
        completed: true,
        data: pickData(completed),
      }});
    }

    await prisma.user.upsert({ where: { id: userId }, create: { id: userId }, update: {} });
    assessment = await prisma.assessment.create({ data: { userId } });
    await prisma.subscription.upsert({
      where: { userId }, create: { userId, status: "FREE" }, update: {},
    });
  }

  return NextResponse.json({ ok: true, data: {
    currentStep: assessment.currentStep,
    completed: assessment.completed,
    data: pickData(assessment),
  }});
}

export async function PUT(request: NextRequest) {
  const userId = getOrCreateUserId();

  let body: { step?: number; data?: unknown };
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: "请求体不是有效的 JSON" }, { status: 400 });
  }

  const { step, data } = body;
  if (typeof step !== "number" || step < 1 || step > 4) {
    return NextResponse.json({ ok: false, error: "无效的步骤编号" }, { status: 400 });
  }

  const errors = validateStep(step, data);
  if (errors.length > 0) {
    return NextResponse.json(
      { ok: false, error: errors.map((e) => e.message).join("; ") },
      { status: 400 },
    );
  }

  const assessment = await prisma.assessment.findFirst({
    where: { userId, completed: false },
  });
  if (!assessment) {
    return NextResponse.json({ ok: false, error: "没有进行中的测评" }, { status: 400 });
  }

  if (step !== assessment.currentStep) {
    return NextResponse.json(
      { ok: false, error: `请先完成第 ${assessment.currentStep} 步` },
      { status: 400 },
    );
  }

  const updateData: Record<string, unknown> = {};
  if (step === 1) updateData.gender = (data as any).gender;
  else if (step === 2) updateData.goal = (data as any).goal;
  else if (step === 3) {
    const d = data as any;
    updateData.age = Number(d.age);
    updateData.height = Number(d.height);
    updateData.weight = Number(d.weight);
    updateData.targetWeight = Number(d.targetWeight);
  } else if (step === 4) {
    updateData.activityLevel = (data as any).activityLevel;
    updateData.completed = true;
  }
  updateData.currentStep = step < 4 ? step + 1 : step;

  await prisma.assessment.update({
    where: { id: assessment.id },
    data: updateData as any,
  });

  return NextResponse.json({ ok: true, currentStep: updateData.currentStep });
}

function pickData(a: any) {
  return {
    gender: a.gender, goal: a.goal, age: a.age, height: a.height,
    weight: a.weight, targetWeight: a.targetWeight, activityLevel: a.activityLevel,
  };
}
