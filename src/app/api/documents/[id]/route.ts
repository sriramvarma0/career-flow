import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/infrastructure/database/prisma";
import { getStorageProvider } from "@/infrastructure/storage";

function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'pdf': return 'application/pdf';
    case 'png': return 'image/png';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'gif': return 'image/gif';
    case 'txt': return 'text/plain; charset=utf-8';
    case 'doc': return 'application/msword';
    case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'xls': return 'application/vnd.ms-excel';
    case 'xlsx': return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    case 'zip': return 'application/zip';
    case 'json': return 'application/json';
    case 'html': return 'text/html; charset=utf-8';
    case 'mp4': return 'video/mp4';
    case 'webm': return 'video/webm';
    default: return 'application/octet-stream';
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { id } = await params;

  // Find document and verify ownership
  const document = await prisma.document.findFirst({
    where: {
      id,
      application: {
        userId: session.user.id,
      },
    },
  });

  if (!document) {
    return new Response("Document not found", { status: 404 });
  }

  const storage = getStorageProvider();

  if (!(await storage.exists(document.storageKey))) {
    return new Response("File not found in storage", { status: 404 });
  }

  try {
    const fileData = await storage.download(document.storageKey);
    const contentType = fileData.contentType || getMimeType(document.originalFileName);
    const download = request.nextUrl.searchParams.get("download") === "true";
    const disposition = download ? "attachment" : "inline";

    const body = fileData.stream instanceof Buffer
      ? new Uint8Array(fileData.stream)
      : fileData.stream;

    return new Response(body as BodyInit, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        ...(fileData.contentLength ? { "Content-Length": fileData.contentLength.toString() } : {}),
        "Content-Disposition": `${disposition}; filename="${encodeURIComponent(document.originalFileName)}"`,
      },
    });
  } catch (error) {
    console.error("Error retrieving file from storage provider:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
