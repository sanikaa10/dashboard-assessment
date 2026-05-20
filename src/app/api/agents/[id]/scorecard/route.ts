import { NextResponse } from "next/server";
import { getAgentScorecard } from "@/lib/queries";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scorecard = getAgentScorecard(id);

  if (!scorecard) {
    return NextResponse.json(
      { error: "agent_not_found", id },
      { status: 404, headers: NO_STORE }
    );
  }

  const now = new Date();
  const days = scorecard.last_14_days;

  return NextResponse.json(
    {
      agent: scorecard.agent,
      last_14_days: days,
      totals: scorecard.totals,
      meta: {
        generated_at: now.toISOString(),
        window_start: days[0]?.date ?? "",
        window_end: days[days.length - 1]?.date ?? "",
      },
    },
    { headers: NO_STORE }
  );
}
