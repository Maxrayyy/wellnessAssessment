import { cookies } from "next/headers";

const SESSION_KEY = "health_assessment_user_id";

export function getOrCreateUserId(): string {
  const cookieStore = cookies();
  const existing = cookieStore.get(SESSION_KEY);

  if (existing?.value) return existing.value;

  const userId = crypto.randomUUID();
  cookieStore.set(SESSION_KEY, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return userId;
}
