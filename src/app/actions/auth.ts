"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import {
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  createSessionToken,
  verifyPassword,
} from "@/lib/auth";

export type LoginState = {
  error?: string;
};

export async function login(_state: LoginState, formData: FormData): Promise<LoginState> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" };
  }

  const user = await db.user.findUnique({ where: { username } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return { error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง" };
  }

  const token = createSessionToken({
    uid: user.id,
    name: user.name,
    exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });

  redirect("/");
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
