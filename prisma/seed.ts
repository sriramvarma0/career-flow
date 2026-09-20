import { prisma } from "@/infrastructure/database/prisma";
import { hashPassword } from "@/lib/password";
import { normalizeContactValue } from "@/lib/utils";

async function main() {
  const passwordHash = await hashPassword("Password123!");

  const user = await prisma.user.upsert({
    where: { id: "cmseedjobvaultuser" },
    update: {},
    create: {
      id: "cmseedjobvaultuser",
      fullName: "Avery Carter",
      passwordHash,
      contacts: {
        create: [
          {
            type: "EMAIL",
            value: "avery@careerflow.dev",
            normalizedValue: normalizeContactValue("avery@careerflow.dev", "EMAIL"),
            isPrimary: true,
            isVerified: true,
          },
          {
            type: "PHONE",
            value: "+1 555 010 2040",
            normalizedValue: normalizeContactValue("+1 555 010 2040", "PHONE"),
            isPrimary: true,
            isVerified: true,
          },
        ],
      },
    },
  });

  const applications = [
    {
      companyName: "Northstar Analytics",
      jobTitle: "Senior Frontend Engineer",
      applicationReferenceId: "NSA-1042",
      source: "LinkedIn",
      status: "Interview",
      location: "Remote",
      salary: "$180,000",
      experience: "5+ years",
      appliedPlatform: "LinkedIn",
      jobId: "JOB-NSA-992",
      notes: "Hiring manager call completed. Waiting for panel scheduling.",
    },
    {
      companyName: "Orbit Financial",
      jobTitle: "Product Engineer",
      applicationReferenceId: "ORB-2219",
      source: "Referral",
      status: "Assessment",
      location: "New York, NY",
      salary: "$165,000",
      experience: "3-5 years",
      appliedPlatform: "Referral Direct Link",
      jobId: "JOB-ORB-103",
      notes: "Take-home assessment due Friday.",
    },
    {
      companyName: "Bluefin Health",
      jobTitle: "Full Stack Developer",
      applicationReferenceId: "BLF-7781",
      source: "CompanyWebsite",
      status: "Offer",
      location: "Chicago, IL",
      salary: "$172,500",
      experience: "2+ years",
      appliedPlatform: "Workday",
      jobId: "JOB-BLF-294",
      notes: "Offer received, awaiting signature.",
    },
  ] as const;

  for (const application of applications) {
    await prisma.application.create({
      data: {
        userId: user.id,
        companyName: application.companyName,
        jobTitle: application.jobTitle,
        applicationReferenceId: application.applicationReferenceId,
        source: application.source,
        status: application.status,
        appliedDate: new Date(),
        location: application.location,
        salary: application.salary,
        experience: application.experience,
        appliedPlatform: application.appliedPlatform,
        jobId: application.jobId,
        notes: application.notes,
        statusHistory: {
          create: {
            previousStatus: null,
            newStatus: application.status,
          },
        },
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });