"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BellRing,
  BookOpen,
  CircleX,
  FileText,
  LayoutDashboard,
  Lightbulb,
  MessageSquareText,
  Settings,
  UserCircle2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type SidebarItemConfig = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const sections: Array<{ title: string; items: SidebarItemConfig[] }> = [
  {
    title: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/applications", label: "Applications", icon: FileText },
      { href: "/documents", label: "Documents", icon: MessageSquareText },
      { href: "/notes", label: "Notes", icon: Lightbulb },
    ],
  },
  {
    title: "Tracking",
    items: [
      { href: "/interviews", label: "Interviews", icon: BookOpen },
      { href: "/offers", label: "Offers", icon: Award },
      { href: "/rejections", label: "Rejections", icon: CircleX },
      { href: "/reminders", label: "Reminders", icon: BellRing },
    ],
  },
  {
    title: "Account",
    items: [
      { href: "/profile", label: "Profile", icon: UserCircle2 },
      { href: "/settings", label: "Settings", icon: Settings },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-64px)] w-[260px] shrink-0 border-r border-slate-200 bg-white lg:block">
      <div className="flex h-full flex-col overflow-y-auto px-4 py-5">
        <div className="rounded-3xl border border-blue-100 bg-blue-50/60 p-4">
          <p className="text-sm font-semibold text-slate-900">Workspace</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">Navigation, tracking, and account access in one place.</p>
        </div>

        <div className="mt-5 space-y-5">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="px-3 text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">{section.title}</p>
              <div className="mt-2 space-y-1.5">
                {section.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl px-3.5 py-3 text-sm font-medium transition",
                        active
                          ? "bg-blue-600 !text-white shadow-sm shadow-blue-200"
                          : "text-slate-600 hover:bg-blue-50 hover:text-blue-700",
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", active ? "!text-white" : "text-slate-400")} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
