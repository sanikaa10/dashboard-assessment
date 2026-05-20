import { getDailyStats28 } from "@/lib/queries";

export async function GET() {
  const daily = getDailyStats28();

  // Find the top team per day by connected count
  const rows = daily.map((d) => {
    const entries = Object.entries(d.by_team);
    const topEntry = entries.sort((a, b) => b[1] - a[1])[0];
    const topTeam = topEntry ? topEntry[0] : "";
    const topTeamConnects = topEntry ? topEntry[1] : 0;

    // RFC 4180: fields with commas/quotes must be quoted; quotes escaped as ""
    const escapeCsv = (v: string | number) => {
      const s = String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };

    return [
      escapeCsv(d.date),
      escapeCsv(d.connected_count),
      escapeCsv(d.total_count),
      escapeCsv(topTeam),
      escapeCsv(topTeamConnects),
    ].join(",");
  });

  const csv = ["date,connected_count,total_count,top_team,top_team_connects", ...rows].join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": 'attachment; filename="weekly-digest.csv"',
      "Cache-Control": "no-store",
    },
  });
}
