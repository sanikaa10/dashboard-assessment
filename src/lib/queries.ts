// All SQL queries live here. Routes and pages stay thin — no raw SQL outside this file.
import { getDb } from "./db";

export type DailyStats = {
  date: string;
  connected_count: number;
  total_count: number;
  by_team: Record<string, number>;
};

export type AgentStat = {
  id: string;
  name: string;
  team: string;
  connected_count: number;
  total_count: number;
};

export type TeamStat = {
  name: string;
  agent_count: number;
  connected_count: number;
  total_count: number;
};

/** Dana's Monday number: connected calls in the rolling last 7 days. */
export function getConnectedLast7(): number {
  const db = getDb();
  const row = db.prepare(`
    SELECT COUNT(*) as count FROM calls
    WHERE outcome = 'connected'
      AND started_at >= datetime('now', '-7 days')
  `).get() as { count: number };
  return row.count;
}

/** Connected calls in the 7 days before last week — used for WoW delta. */
export function getConnectedPrior7(): number {
  const db = getDb();
  const row = db.prepare(`
    SELECT COUNT(*) as count FROM calls
    WHERE outcome = 'connected'
      AND started_at >= datetime('now', '-14 days')
      AND started_at < datetime('now', '-7 days')
  `).get() as { count: number };
  return row.count;
}

/**
 * 28 days of daily stats, one row per calendar day (zero-filled).
 * Used by /api/weekly-digest and the dashboard.
 */
export function getDailyStats28(): DailyStats[] {
  const db = getDb();

  // Recursive CTE ensures zero-call days appear rather than being omitted
  const rows = db.prepare(`
    WITH RECURSIVE dates(d) AS (
      SELECT date('now', '-27 days')
      UNION ALL
      SELECT date(d, '+1 day') FROM dates WHERE d < date('now')
    )
    SELECT
      d as date,
      COALESCE(s.connected_count, 0) as connected_count,
      COALESCE(s.total_count, 0) as total_count
    FROM dates
    LEFT JOIN (
      SELECT
        date(started_at) as date,
        SUM(CASE WHEN outcome = 'connected' THEN 1 ELSE 0 END) as connected_count,
        COUNT(*) as total_count
      FROM calls
      WHERE started_at >= datetime('now', '-28 days')
      GROUP BY date(started_at)
    ) s ON s.date = d
    ORDER BY d ASC
  `).all() as Array<{ date: string; connected_count: number; total_count: number }>;

  const teamRows = db.prepare(`
    SELECT
      date(c.started_at) as date,
      a.team,
      SUM(CASE WHEN c.outcome = 'connected' THEN 1 ELSE 0 END) as connected_count
    FROM calls c
    JOIN agents a ON a.id = c.agent_id
    WHERE c.started_at >= datetime('now', '-28 days')
    GROUP BY date(c.started_at), a.team
  `).all() as Array<{ date: string; team: string; connected_count: number }>;

  const byTeam: Record<string, Record<string, number>> = {};
  for (const r of teamRows) {
    if (!byTeam[r.date]) byTeam[r.date] = {};
    byTeam[r.date][r.team] = r.connected_count;
  }

  return rows.map((r) => ({ ...r, by_team: byTeam[r.date] ?? {} }));
}

/** Top N agents by connected calls in last 7 days. */
export function getTopAgents(limit = 3): AgentStat[] {
  const db = getDb();
  return db.prepare(`
    SELECT
      a.id, a.name, a.team,
      SUM(CASE WHEN c.outcome = 'connected' THEN 1 ELSE 0 END) as connected_count,
      COUNT(c.id) as total_count
    FROM agents a
    LEFT JOIN calls c ON c.agent_id = a.id
      AND c.started_at >= datetime('now', '-7 days')
    GROUP BY a.id
    ORDER BY connected_count DESC
    LIMIT ?
  `).all(limit) as AgentStat[];
}

/** All agents with both last-7 and prior-7 connected counts — for Monday attention list. */
export function getAllAgentsWithTrend(): Array<AgentStat & { prior_connected: number }> {
  const db = getDb();
  return db.prepare(`
    SELECT
      a.id, a.name, a.team,
      SUM(CASE WHEN c.outcome = 'connected' AND c.started_at >= datetime('now', '-7 days') THEN 1 ELSE 0 END) as connected_count,
      COUNT(CASE WHEN c.started_at >= datetime('now', '-7 days') THEN 1 END) as total_count,
      SUM(CASE WHEN c.outcome = 'connected'
               AND c.started_at >= datetime('now', '-14 days')
               AND c.started_at < datetime('now', '-7 days') THEN 1 ELSE 0 END) as prior_connected
    FROM agents a
    LEFT JOIN calls c ON c.agent_id = a.id
    GROUP BY a.id
    ORDER BY connected_count ASC
  `).all() as Array<AgentStat & { prior_connected: number }>;
}

/** All teams with 7-day connected + total counts. */
export function getTeamsSummary(): TeamStat[] {
  const db = getDb();
  return db.prepare(`
    SELECT
      a.team as name,
      COUNT(DISTINCT a.id) as agent_count,
      SUM(CASE WHEN c.outcome = 'connected' THEN 1 ELSE 0 END) as connected_count,
      COUNT(c.id) as total_count
    FROM agents a
    LEFT JOIN calls c ON c.agent_id = a.id
      AND c.started_at >= datetime('now', '-7 days')
    GROUP BY a.team
    ORDER BY connected_count DESC
  `).all() as TeamStat[];
}

/** One agent's 14-day history + totals. Returns null if agent not found. */
export function getAgentScorecard(agentId: string) {
  const db = getDb();

  const agent = db.prepare(
    `SELECT id, name, team, hire_date FROM agents WHERE id = ?`
  ).get(agentId) as { id: string; name: string; team: string; hire_date: string } | undefined;

  if (!agent) return null;

  const daily = db.prepare(`
    WITH RECURSIVE dates(d) AS (
      SELECT date('now', '-13 days')
      UNION ALL
      SELECT date(d, '+1 day') FROM dates WHERE d < date('now')
    )
    SELECT
      d as date,
      COALESCE(s.connected_count, 0) as connected_count,
      COALESCE(s.total_count, 0) as total_count
    FROM dates
    LEFT JOIN (
      SELECT
        date(started_at) as date,
        SUM(CASE WHEN outcome = 'connected' THEN 1 ELSE 0 END) as connected_count,
        COUNT(*) as total_count
      FROM calls
      WHERE agent_id = ?
        AND started_at >= datetime('now', '-14 days')
      GROUP BY date(started_at)
    ) s ON s.date = d
    ORDER BY d ASC
  `).all(agentId) as Array<{ date: string; connected_count: number; total_count: number }>;

  const last7 = db.prepare(`
    SELECT
      SUM(CASE WHEN outcome = 'connected' THEN 1 ELSE 0 END) as connected,
      COUNT(*) as total
    FROM calls
    WHERE agent_id = ?
      AND started_at >= datetime('now', '-7 days')
  `).get(agentId) as { connected: number; total: number };

  const prior7 = db.prepare(`
    SELECT SUM(CASE WHEN outcome = 'connected' THEN 1 ELSE 0 END) as connected
    FROM calls
    WHERE agent_id = ?
      AND started_at >= datetime('now', '-14 days')
      AND started_at < datetime('now', '-7 days')
  `).get(agentId) as { connected: number };

  return {
    agent,
    last_14_days: daily,
    totals: {
      connected_last_7: last7.connected,
      connected_prior_7: prior7.connected,
      // Rate is 0 when no calls exist (avoids divide-by-zero)
      connect_rate_last_7: last7.total > 0 ? last7.connected / last7.total : 0,
    },
  };
}

/** One team's 7-day roll-up. Returns null if team has no agents. */
export function getTeamSummary(teamName: string) {
  const db = getDb();

  const agents = db.prepare(`
    SELECT
      a.id, a.name,
      SUM(CASE WHEN c.outcome = 'connected' THEN 1 ELSE 0 END) as connected_count,
      COUNT(c.id) as total_count
    FROM agents a
    LEFT JOIN calls c ON c.agent_id = a.id
      AND c.started_at >= datetime('now', '-7 days')
    WHERE a.team = ?
    GROUP BY a.id
    ORDER BY connected_count DESC
  `).all(teamName) as Array<{ id: string; name: string; connected_count: number; total_count: number }>;

  if (agents.length === 0) return null;

  const connected = agents.reduce((s, a) => s + a.connected_count, 0);
  const total = agents.reduce((s, a) => s + a.total_count, 0);

  return {
    team: { name: teamName, agent_count: agents.length },
    last_7_days: {
      connected_count: connected,
      total_count: total,
      connect_rate: total > 0 ? connected / total : 0,
    },
    agents,
  };
}
