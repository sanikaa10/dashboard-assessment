import { NextResponse } from "next/server";
import { getDailyStats28, getTopAgents } from "@/lib/queries";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET() {
  const daily = getDailyStats28();
  const topAgents = getTopAgents(3);

  const now = new Date();
  const windowStart = daily[0]?.date ?? "";
  const windowEnd = daily[daily.length - 1]?.date ?? "";

  return NextResponse.json(
    {
      data: daily,
      top_agents: topAgents.map((a) => ({
        name: a.name,
        team: a.team,
        connected_count: a.connected_count,
      })),
      meta: {
        generated_at: now.toISOString(),
        window_start: windowStart,
        window_end: windowEnd,
      },
    },
    { headers: NO_STORE }
  );
}
