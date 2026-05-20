export const revalidate = 0;

import {
  getConnectedLast7,
  getConnectedPrior7,
  getTopAgents,
  getAllAgentsWithTrend,
  getTeamsSummary,
} from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function delta(current: number, prior: number) {
  if (prior === 0) return null;
  const pct = Math.round(((current - prior) / prior) * 100);
  return pct;
}

function DeltaBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <span className="text-muted text-xs">—</span>;
  const up = pct >= 0;
  return (
    <span className={`text-xs font-medium ${up ? "text-green-400" : "text-red-400"}`}>
      {up ? "+" : ""}{pct}% WoW
    </span>
  );
}

export default function Page() {
  const connectedLast7 = getConnectedLast7();
  const connectedPrior7 = getConnectedPrior7();
  const topAgents = getTopAgents(3);
  const allAgents = getAllAgentsWithTrend();
  const teams = getTeamsSummary();

  const wow = delta(connectedLast7, connectedPrior7);

  // Monday attention list: agents declining or low (bottom third by connected, or dropped >20%)
  const attentionAgents = allAgents
    .filter((a) => {
      const dropped = a.prior_connected > 0 && a.connected_count < a.prior_connected * 0.8;
      const low = a.connected_count < 5;
      return dropped || low;
    })
    .sort((a, b) => {
      // Sort by biggest decline first
      const aDrop = a.prior_connected - a.connected_count;
      const bDrop = b.prior_connected - b.connected_count;
      return bDrop - aDrop;
    })
    .slice(0, 5);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 space-y-6">
      {/* Header row */}
      <div>
        <h1 className="text-xl font-semibold">Sales Dashboard</h1>
        <p className="text-sm text-muted mt-1">Rolling 7-day view · live data</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted font-normal">Connected Calls (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{connectedLast7.toLocaleString()}</p>
            <div className="mt-1">
              <DeltaBadge pct={wow} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted font-normal">Prior Week Connected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{connectedPrior7.toLocaleString()}</p>
            <p className="text-xs text-muted mt-1">Days 8–14 ago</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted font-normal">Active Teams</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{teams.length}</p>
            <p className="text-xs text-muted mt-1">{allAgents.length} agents total</p>
          </CardContent>
        </Card>
      </div>

      {/* Monday morning section */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Top performers */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Top Performers This Week</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Team</TableHead>
                  <TableHead className="text-right">Connected</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topAgents.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.name}</TableCell>
                    <TableCell className="text-muted">{a.team}</TableCell>
                    <TableCell className="text-right text-green-400 font-mono">{a.connected_count}</TableCell>
                    <TableCell className="text-right font-mono text-muted">{a.total_count}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Attention list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Monday Morning — Needs Attention</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {attentionAgents.length === 0 ? (
              <p className="text-sm text-muted py-4 text-center">All agents on track this week.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Agent</TableHead>
                    <TableHead className="text-right">This Wk</TableHead>
                    <TableHead className="text-right">Prior Wk</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attentionAgents.map((a) => {
                    const d = delta(a.connected_count, a.prior_connected);
                    return (
                      <TableRow key={a.id}>
                        <TableCell>
                          <div className="font-medium text-sm">{a.name}</div>
                          <div className="text-xs text-muted">{a.team}</div>
                        </TableCell>
                        <TableCell className="text-right font-mono">{a.connected_count}</TableCell>
                        <TableCell className="text-right font-mono text-muted">{a.prior_connected}</TableCell>
                        <TableCell className="text-right">
                          <DeltaBadge pct={d} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Team summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Team Summary — Last 7 Days</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Team</TableHead>
                <TableHead className="text-right">Agents</TableHead>
                <TableHead className="text-right">Connected</TableHead>
                <TableHead className="text-right">Total Calls</TableHead>
                <TableHead className="text-right">Connect Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map((t) => {
                const rate = t.total_count > 0 ? ((t.connected_count / t.total_count) * 100).toFixed(1) : "0.0";
                return (
                  <TableRow key={t.name}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell className="text-right text-muted">{t.agent_count}</TableCell>
                    <TableCell className="text-right font-mono text-green-400">{t.connected_count}</TableCell>
                    <TableCell className="text-right font-mono text-muted">{t.total_count}</TableCell>
                    <TableCell className="text-right font-mono">{rate}%</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </main>
  );
}
