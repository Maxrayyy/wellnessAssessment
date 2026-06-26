import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const userId = getOrCreateUserId();

  await prisma.user.upsert({
    where: { id: userId }, create: { id: userId }, update: {},
  });

  const subscription = await prisma.subscription.upsert({
    where: { userId },
    create: { userId, status: "PREMIUM" },
    update: { status: "PREMIUM" },
  });

  return NextResponse.json({ ok: true, status: subscription.status });
}
