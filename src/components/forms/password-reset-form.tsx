"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requestPasswordReset, resetPassword } from "@/actions/auth";
import { toast } from "sonner";

export function ForgotPasswordForm() {
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(formData: FormData) {
    setLoading(true);
    const result = await requestPasswordReset(formData);
    setLoading(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    if (result.data?.token) {
      setToken(result.data.token);
      toast.success("Reset token generated.");
      return;
    }

    toast.success(result.message ?? "Reset request received.");
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Reset password</CardTitle>
        <CardDescription>Enter a registered email or phone number to create a reset token.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="identifier">Email or phone</Label>
            <Input id="identifier" name="identifier" required />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Generating..." : "Generate token"}</Button>
        </form>
        {token ? (
          <div className="mt-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-100">
            Reset token: <span className="break-all font-mono text-xs">{token}</span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ResetPasswordForm() {
  const [loading, setLoading] = useState(false);

  async function onSubmit(formData: FormData) {
    setLoading(true);
    const result = await resetPassword(formData);
    setLoading(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message ?? "Password updated.");
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Use reset token</CardTitle>
        <CardDescription>Paste the token from your request and choose a new password.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={onSubmit} className="space-y-4">
          <Field label="Token" name="token" />
          <Field label="New password" name="password" type="password" />
          <Field label="Confirm password" name="confirmPassword" type="password" />
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Updating..." : "Update password"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({ label, name, type = "text" }: { label: string; name: string; type?: string }) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required />
    </div>
  );
}