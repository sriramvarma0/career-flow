import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SignOutButton } from "@/components/signout-button";

export default async function SettingsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  return (
    <AppShell title="Settings" subtitle="Workspace preferences, session controls, and future integration points.">
      <Card>
        <CardHeader>
          <CardTitle>Session controls</CardTitle>
          <CardDescription>Sign out when you are finished with this workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <SignOutButton />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Roadmap hooks</CardTitle>
          <CardDescription>Built to expand later with email, OCR, reminders, browser extensions, and cloud storage.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm leading-7 text-slate-300">
          The current structure already separates actions, repositories, services, and UI primitives so future integrations can be added without reshaping the app.
        </CardContent>
      </Card>
    </AppShell>
  );
}