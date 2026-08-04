"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  COOKIE_OPTIONS,
  SESSION_COOKIE,
  createSessionToken,
  verifyPassword,
} from "@/lib/auth";

export interface LoginState {
  error?: string;
}

export async function login(
  _prev: LoginState,
  formData: FormData
): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");

  if (!verifyPassword(password)) {
    return { error: "Wrong password." };
  }

  const token = await createSessionToken();
  // cookies() is async in Next 16.
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, COOKIE_OPTIONS);

  redirect("/add");
}

export async function logout() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
