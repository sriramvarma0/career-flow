import Link from "next/link";
import { BriefcaseBusiness } from "lucide-react";

export function AuthNavbar() {
  return (
    <nav className="absolute top-0 left-0 right-0 z-50 w-full bg-transparent py-4">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 w-fit hover:opacity-90 transition group">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-blue-600 text-white shadow-sm shadow-blue-500/10 group-hover:scale-[1.02] transition">
            <BriefcaseBusiness className="h-4.5 w-4.5" />
          </div>
          <span className="text-lg font-bold tracking-tight text-slate-900">CareerFlow</span>
        </Link>
      </div>
    </nav>
  );
}
