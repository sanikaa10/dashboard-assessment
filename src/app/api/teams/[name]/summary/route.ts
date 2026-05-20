import { NextResponse } from "next/server";
import { getTeamSummary } from "@/lib/queries";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(_req: Request, { params }: { params: Promise<{ name: string }> }) {
  // Team names arrive URL-encoded (e.g. "West%20Coast" → "West Coast")
  const { name } = await params;
  const teamName = decodeURIComponent(name);
  const summary = getTeamSummary(teamName);

  if (!summary) {
    return NextResponse.json(
      { error: "team_not_found", name: teamName },
      { status: 404, headers: NO_STORE }
    );
  }

  const now = new Date();
  const windowEnd = now.toISOString().slice(0, 10);
  const windowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  return NextResponse.json(
    {
      ...summary,
      meta: {
        generated_at: now.toISOString(),
        window_start: windowStart,
        window_end: windowEnd,
      },
    },
    { headers: NO_STORE }
  );
}
