import Link from "next/link";
import { cn } from "@/lib/utils";

type SidebarItemProps = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  active: boolean;
  collapsed?: boolean;
};

export function SidebarItem({ href, label, icon: Icon, active, collapsed = false }: SidebarItemProps) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition",
        active
          ? "bg-blue-600 !text-white shadow-sm"
          : "text-slate-600 hover:bg-blue-50 hover:text-blue-700",
        collapsed ? "justify-center px-2" : "",
      )}
      title={label}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active ? "!text-white" : "text-slate-400 group-hover:text-blue-600")} />
      {!collapsed ? <span>{label}</span> : null}
    </Link>
  );
}