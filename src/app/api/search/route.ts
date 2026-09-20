import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/infrastructure/database/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim() ?? "";

  if (!query) {
    return NextResponse.json({ applications: [], documents: [], notes: [] });
  }

  const userId = session.user.id;

  try {
    const [applications, documents, notes] = await Promise.all([
      // Search Applications
      prisma.application.findMany({
        where: {
          userId,
          OR: [
            { companyName: { contains: query } },
            { jobTitle: { contains: query } },
          ],
        },
        select: {
          id: true,
          companyName: true,
          jobTitle: true,
          status: true,
        },
        take: 5,
      }),
      // Search Documents
      prisma.document.findMany({
        where: {
          application: { userId },
          OR: [
            { originalFileName: { contains: query } },
            { tags: { contains: query } },
          ],
        },
        select: {
          id: true,
          originalFileName: true,
          applicationId: true,
          tags: true,
        },
        take: 5,
      }),
      // Search Notes
      prisma.applicationNote.findMany({
        where: {
          application: { userId },
          content: { contains: query },
        },
        select: {
          id: true,
          content: true,
          applicationId: true,
          createdAt: true,
        },
        take: 5,
      }),
    ]);

    return NextResponse.json({ applications, documents, notes });
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
