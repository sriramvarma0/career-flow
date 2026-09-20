"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { loginSchema, type LoginInput } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export function LoginForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true);
    const result = await signIn("credentials", {
      redirect: false,
      identifier: values.identifier,
      password: values.password,
    });

    setIsSubmitting(false);

    if (result?.error) {
      toast.error("Invalid email/phone or password.");
      return;
    }

    toast.success("Welcome back.");
    router.push("/dashboard");
    router.refresh();
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Use your primary or secondary email or phone number.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="space-y-2">
            <Label htmlFor="identifier">Email or phone</Label>
            <Input id="identifier" placeholder="name@company.com or +1 555 010 2040" {...register("identifier")} />
            {errors.identifier ? <p className="text-sm text-rose-300">{errors.identifier.message}</p> : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...register("password")} />
            {errors.password ? <p className="text-sm text-rose-300">{errors.password.message}</p> : null}
          </div>

          <div className="flex items-center justify-between gap-3 text-sm">
            <a href="/forgot-password" className="text-cyan-300 hover:text-cyan-200">
              Forgot password?
            </a>
            <a href="/register" className="text-slate-300 hover:text-slate-50">
              Create account
            </a>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}