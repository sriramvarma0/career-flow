"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { registerSchema, type RegisterInput } from "@/lib/validators";
import { registerUser } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export function RegisterForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      password: "",
      confirmPassword: "",
      primaryEmail: "",
      primaryPhone: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    const formData = new FormData();
    Object.entries(values).forEach(([key, value]) => formData.set(key, value ?? ""));
    const result = await registerUser(formData);
    setIsSubmitting(false);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message ?? "Account created.");
    router.push("/login");
  });

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Create your JobVault account</CardTitle>
        <CardDescription>Use one email and one phone number. Your email is the primary account reference.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="grid gap-5 md:grid-cols-2" onSubmit={onSubmit}>
          <Field label="Full name" error={errors.fullName?.message}><Input {...register("fullName")} /></Field>
          <Field label="Primary email" error={errors.primaryEmail?.message}><Input type="email" {...register("primaryEmail")} /></Field>
          <Field label="Primary phone" error={errors.primaryPhone?.message}><Input {...register("primaryPhone")} /></Field>
          <Field label="Password" error={errors.password?.message}><Input type="password" {...register("password")} /></Field>
          <Field label="Confirm password" error={errors.confirmPassword?.message}><Input type="password" {...register("confirmPassword")} /></Field>
          <div className="md:col-span-2 flex flex-col gap-4">
            <div className="flex items-center justify-between text-sm">
              <a href="/login" className="text-cyan-300 hover:text-cyan-200">Back to sign in</a>
              <a href="/forgot-password" className="text-slate-300 hover:text-slate-50">Need a reset token?</a>
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>{isSubmitting ? "Creating account..." : "Create account"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
    </div>
  );
}