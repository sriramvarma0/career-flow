import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { ApplicationForm } from "@/components/forms/application-form";

export default async function NewApplicationPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <AppShell title="Create application" subtitle="Capture the company, role, status, and notes as soon as you apply.">
      <ApplicationForm mode="create" />
    </AppShell>
  );
}