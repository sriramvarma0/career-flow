import { z } from "zod";
import { applicationSourceValues, applicationStatuses, contactTypes } from "@/types/jobvault";

export const registerSchema = z
  .object({
    fullName: z.string().min(2).max(120),
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
    primaryEmail: z.string().email(),
    primaryPhone: z.string().min(7),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, { message: "Enter a valid email or phone number." })
    .superRefine((val, ctx) => {
      if (!val) return;
      const hasAt = val.includes("@");
      const hasDigits = /[0-9]/.test(val);
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (hasAt) {
        if (!emailRegex.test(val)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Enter a valid email.",
          });
        }
      } else if (hasDigits || val.startsWith("+")) {
        const digits = val.replace(/[^\d]/g, "");
        if (digits.length < 7 || digits.length > 15) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Enter a valid phone number.",
          });
        }
      } else {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Enter a valid email or phone number.",
        });
      }
    }),
  password: z
    .string()
    .min(1, { message: "Enter a valid password." })
    .refine((val) => val.length >= 8, {
      message: "Password must be at least 8 characters.",
    }),
});

export const forgotPasswordSchema = z.object({
  identifier: z.string().min(3),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(16),
    password: z.string().min(8).max(128),
    confirmPassword: z.string().min(8).max(128),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const applicationSchema = z.object({
  id: z.string().optional(),
  companyName: z.string().min(2).max(140),
  jobTitle: z.string().min(2).max(140),
  applicationReferenceId: z.string().min(2).max(140).optional().or(z.literal("")),
  source: z.enum(applicationSourceValues),
  status: z.string().min(1).max(100),
  appliedDate: z.string().optional().or(z.literal("")),
  jobUrl: z.string().url().optional().or(z.literal("")),
  location: z.string().max(160).optional().or(z.literal("")),
  salary: z.string().max(120).optional().or(z.literal("")),
  experience: z.string().max(120).optional().or(z.literal("")),
  appliedPlatform: z.string().max(120).optional().or(z.literal("")),
  jobId: z.string().max(120).optional().or(z.literal("")),
  notes: z.string().max(5000).optional().or(z.literal("")),
});

export const noteSchema = z.object({
  applicationId: z.string().min(10),
  content: z.string().min(2).max(5000),
});

export const profileSchema = z.object({
  fullName: z.string().min(2).max(120),
});

export const contactUpdateSchema = z.object({
  id: z.string().optional(),
  type: z.enum(contactTypes),
  value: z.string().min(3),
  isPrimary: z.coerce.boolean(),
  isVerified: z.coerce.boolean().optional().default(false),
});

export const uploadSchema = z.object({
  applicationId: z.string().min(10),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ApplicationInput = z.infer<typeof applicationSchema>;
export type NoteInput = z.infer<typeof noteSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type ContactUpdateInput = z.infer<typeof contactUpdateSchema>;
export type UploadInput = z.infer<typeof uploadSchema>;