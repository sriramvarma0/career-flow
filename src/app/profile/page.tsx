import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getUserById } from "@/repositories/user-repository";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateProfile } from "@/actions/auth";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await getUserById(session.user.id);

  if (!user) {
    redirect("/login");
  }

  async function handleProfileUpdate(formData: FormData) {
    "use server";
    await updateProfile(formData);
  }

  const primaryEmail = user.contacts.find((c) => c.type === "EMAIL" && c.isPrimary)?.value || "-";
  const primaryPhone = user.contacts.find((c) => c.type === "PHONE" && c.isPrimary)?.value || "-";

  return (
    <AppShell title={user.fullName} subtitle="Update your account details and profile information.">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Account information</CardTitle>
            <CardDescription>Full name, primary email, and primary phone number registered to your local workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={handleProfileUpdate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full name</Label>
                <Input id="fullName" name="fullName" defaultValue={user.fullName} className="rounded-2xl border border-slate-200 bg-white px-4 text-slate-800" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Primary email</Label>
                <Input id="email" value={primaryEmail} disabled className="rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-500 cursor-not-allowed" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Primary phone</Label>
                <Input id="phone" value={primaryPhone} disabled className="rounded-2xl border border-slate-200 bg-slate-50 px-4 text-slate-500 cursor-not-allowed" />
              </div>
              <Button type="submit">Save changes</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}