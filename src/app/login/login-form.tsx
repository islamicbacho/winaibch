"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/auth";

export default function LoginForm() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={action} className="space-y-5 p-7">
      <div>
        <label htmlFor="username" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-steel">
          ชื่อผู้ใช้
        </label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          autoFocus
          placeholder="username"
          className="w-full rounded border border-line bg-night px-4 py-3 text-white placeholder:text-steel/50 focus:border-signal focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-steel">
          รหัสผ่าน
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="••••••••"
          className="w-full rounded border border-line bg-night px-4 py-3 text-white placeholder:text-steel/50 focus:border-signal focus:outline-none"
        />
      </div>

      {state?.error && (
        <p className="rounded border border-alert/40 bg-alert/10 px-4 py-2.5 text-sm font-medium text-alert">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="clip-corner w-full bg-signal py-3 text-base font-extrabold text-night transition hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "กำลังตรวจสอบ..." : "เข้าปฏิบัติงาน"}
      </button>
    </form>
  );
}
