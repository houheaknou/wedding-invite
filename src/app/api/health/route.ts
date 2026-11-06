import { prisma } from "@/lib/db";

// Container health check (Dockerfile HEALTHCHECK): the app answers and can reach the database.
// Says nothing else about the system.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ status: "db_unreachable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
