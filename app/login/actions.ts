"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE_OPTIONS, SESSION_COOKIE, createSessionToken, verifyPassword } from "@/lib/auth";

export async function login(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  const password = String(formData.get("password") ?? "");
  if (!verifyPassword(password)) {
    return { error: "Wrong password." };
  }
  const token = await createSessionToken();
  const store = await cookies();
  store.set(SESSION_COOKIE, token, COOKIE_OPTIONS);
  redirect("/add");
}
