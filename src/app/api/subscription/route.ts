import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateUserId } from "@/lib/session";

export async function GET() {
  const userId = getOrCreateUserId();
  const subscription = await prisma.subscription.findUnique({ where: { userId } });
  return NextResponse.json({ status: subscription?.status ?? "FREE" });
}
