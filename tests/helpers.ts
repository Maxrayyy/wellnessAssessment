import { prisma } from "@/lib/prisma";

export async function createTestUser(options?: {
  currentStep?: number; completed?: boolean;
  gender?: string; goal?: string;
  age?: number; height?: number; weight?: number; targetWeight?: number;
  activityLevel?: string;
}) {
  const user = await prisma.user.create({ data: {} });
  const assessment = await prisma.assessment.create({
    data: {
      userId: user.id,
      currentStep: options?.currentStep ?? 1,
      completed: options?.completed ?? false,
      gender: options?.gender,
      goal: options?.goal as any,
      age: options?.age,
      height: options?.height,
      weight: options?.weight,
      targetWeight: options?.targetWeight,
      activityLevel: options?.activityLevel as any,
    },
  });
  await prisma.subscription.create({ data: { userId: user.id } });
  return { userId: user.id, assessmentId: assessment.id };
}

export async function cleanupTestUser(userId: string) {
  await prisma.assessmentResult.deleteMany({ where: { assessment: { userId } } });
  await prisma.assessment.deleteMany({ where: { userId } });
  await prisma.subscription.deleteMany({ where: { userId } });
  await prisma.user.deleteMany({ where: { id: userId } });
}
