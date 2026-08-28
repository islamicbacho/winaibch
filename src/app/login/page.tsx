import Image from "next/image";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import LoginForm from "./login-form";

export const metadata = { title: "เข้าสู่ระบบ" };

export default async function LoginPage() {
  const session = await getSession();
  if (session) redirect("/");

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-4">
      <div className="hazard absolute inset-x-0 top-0 h-2.5" />
      <div className="hazard-red absolute inset-x-0 bottom-0 h-2.5" />

      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <Image
            src="/logo-bch.png"
            alt="ตราโรงเรียนบาเจาะ"
            width={72}
            height={72}
            className="mx-auto h-18 w-18 object-contain"
          />
          <h1 className="mt-4 text-4xl font-extrabold italic tracking-tight text-white">
            WIN<span className="text-signal">-AIBCH</span>
          </h1>
          <p className="mt-2 text-sm font-medium text-steel">
            ระบบบันทึกการกระทำผิดระเบียบของนักเรียน
            <br />
            โรงเรียนบาเจาะ • ฝ่ายกิจการนักเรียน
          </p>
        </div>

        <div className="clip-corner border border-line bg-panel">
          <div className="hazard h-1.5" />
          <LoginForm />
        </div>

        <p className="mt-6 text-center text-xs text-steel">
          เฉพาะครูสารวัตรผู้ดูแลระบบเท่านั้น
        </p>
      </div>
    </div>
  );
}
