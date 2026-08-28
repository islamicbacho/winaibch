"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { logout } from "@/app/actions/auth";

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

function Icon({ d, extra }: { d: string; extra?: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 shrink-0"
    >
      <path d={d} />
      {extra}
    </svg>
  );
}

const NAV: NavItem[] = [
  {
    href: "/",
    label: "แดชบอร์ด",
    icon: (
      <Icon d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    ),
  },
  {
    href: "/incidents/new",
    label: "บันทึกเหตุการณ์",
    icon: (
      <Icon d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    ),
  },
  {
    href: "/incidents",
    label: "รายการเคส",
    icon: (
      <Icon d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    ),
  },
  {
    href: "/students",
    label: "นักเรียน",
    icon: (
      <Icon d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    ),
  },
  {
    href: "/classes",
    label: "ห้องเรียน",
    icon: (
      <Icon d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
    ),
  },
  {
    href: "/reports",
    label: "รายงาน",
    icon: (
      <Icon d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    ),
  },
  {
    href: "/settings",
    label: "ตั้งค่า",
    icon: (
      <Icon
        d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"
        extra={<path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />}
      />
    ),
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={`group relative flex items-center gap-3 px-4 py-2.5 text-[15px] font-medium transition-colors ${
              active
                ? "bg-panel text-signal"
                : "text-steel hover:bg-panel-2 hover:text-white"
            }`}
          >
            <span
              className={`absolute left-0 top-1/2 h-7 w-1 -translate-y-1/2 bg-signal transition-transform ${
                active ? "scale-y-100" : "scale-y-0"
              }`}
            />
            {item.icon}
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3 px-5 pb-5 pt-6">
      <div className="rounded-full bg-signal/15 p-1 ring-2 ring-signal/70">
        <Image
          src="/logo-bch.png"
          alt="ตราโรงเรียนบาเจาะ"
          width={44}
          height={44}
          className="h-11 w-11 object-contain"
        />
      </div>
      <div>
        <p className="text-2xl font-extrabold italic leading-none tracking-tight text-white">
          WIN<span className="text-signal">-AIBCH</span>
        </p>
        <p className="mt-1 text-xs font-medium text-steel">
          กิจการนักเรียน • โรงเรียนบาเจาะ
        </p>
      </div>
    </div>
  );
}

export default function AppShell({
  name,
  children,
}: {
  name: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <div className="hazard fixed inset-x-0 top-0 z-40 h-1.5" />

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 flex-col border-r border-line bg-panel-2 lg:flex">
        <div className="hazard h-1" />
        <Brand />
        <div className="flex-1 overflow-y-auto pb-4">
          <NavLinks pathname={pathname} />
        </div>
        <div className="border-t border-line p-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{name}</p>
              <p className="text-xs text-steel">ครูสารวัตร • ผู้ดูแลระบบ</p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                className="rounded border border-line px-3 py-1.5 text-xs font-semibold text-steel transition-colors hover:border-alert hover:text-alert"
              >
                ออกจากระบบ
              </button>
            </form>
          </div>
        </div>
      </aside>

      <header className="fixed inset-x-0 top-1.5 z-30 flex h-14 items-center justify-between border-b border-line bg-panel-2 px-4 lg:hidden">
        <button
          type="button"
          aria-label="เปิดเมนู"
          onClick={() => setOpen(true)}
          className="rounded border border-line p-2 text-steel"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5">
            <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" strokeLinecap="round" />
          </svg>
        </button>
        <p className="text-lg font-extrabold italic text-white">
          WIN<span className="text-signal">-AIBCH</span>
        </p>
        <div className="w-9" />
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-line bg-panel-2">
            <div className="hazard h-1" />
            <Brand />
            <div className="flex-1 overflow-y-auto">
              <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
            </div>
            <div className="border-t border-line p-4">
              <form action={logout}>
                <button
                  type="submit"
                  className="w-full rounded border border-line px-3 py-2 text-sm font-semibold text-steel transition-colors hover:border-alert hover:text-alert"
                >
                  ออกจากระบบ
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}

      <main className="px-4 pb-12 pt-20 lg:pl-[19.5rem] lg:pr-8 lg:pt-10">{children}</main>
    </div>
  );
}
