import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { searchWorkspace } from "@/repositories/search-repository";

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
    const results = await searchWorkspace(userId, query);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Search API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

