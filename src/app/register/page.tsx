import { RegisterForm } from "@/components/forms/register-form";
import { AuthNavbar } from "@/components/auth-navbar";

export default function RegisterPage() {
  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden lg:h-auto lg:min-h-[100dvh] lg:overflow-visible justify-between">
      <AuthNavbar />
      <main className="flex-1 grid place-items-center px-4 pt-14 pb-2 lg:pt-24 lg:pb-10 w-full">
        <RegisterForm />
      </main>
      <footer className="py-4 border-t border-slate-200/60 bg-slate-50 text-center text-xs text-slate-500 z-10 shrink-0">
        © 2026 CareerFlow Private Limited. A company of SR Group. All rights reserved.
      </footer>
    </div>
  );
}