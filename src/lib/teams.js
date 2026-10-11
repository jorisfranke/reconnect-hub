import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { TEAMS, TEAM_COLORS } from '@/lib/constants';

// Color palette for dynamically created teams
export const TEAM_COLOR_PALETTE = {
  violet: { bg: "bg-violet-100", text: "text-violet-700", border: "border-violet-200", dot: "bg-violet-500" },
  blue: { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500" },
  amber: { bg: "bg-amber-100", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500" },
  rose: { bg: "bg-rose-100", text: "text-rose-700", border: "border-rose-200", dot: "bg-rose-500" },
  emerald: { bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  slate: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200", dot: "bg-slate-500" },
  cyan: { bg: "bg-cyan-100", text: "text-cyan-700", border: "border-cyan-200", dot: "bg-cyan-500" },
  orange: { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-200", dot: "bg-orange-500" },
  pink: { bg: "bg-pink-100", text: "text-pink-700", border: "border-pink-200", dot: "bg-pink-500" },
  indigo: { bg: "bg-indigo-100", text: "text-indigo-700", border: "border-indigo-200", dot: "bg-indigo-500" },
};

export const TEAM_COLOR_OPTIONS = Object.keys(TEAM_COLOR_PALETTE).map(key => ({
  key,
  ...TEAM_COLOR_PALETTE[key],
}));

// Resolve the color set for a team name, preferring a Team entity record's color,
// then the static TEAM_COLORS constant, then slate as fallback.
export function resolveTeamColor(name, teamMap = {}) {
  const record = teamMap[name];
  const paletteKey = record?.color;
  if (paletteKey && TEAM_COLOR_PALETTE[paletteKey]) return TEAM_COLOR_PALETTE[paletteKey];
  if (TEAM_COLORS[name]) return TEAM_COLORS[name];
  return TEAM_COLOR_PALETTE.slate;
}

// Hook: merges Team entity records with the static default TEAMS list.
// Returns { teams, colors, teamRecords, teamMap, refetch }
export function useTeams() {
  const { data: teamRecords = [], refetch } = useQuery({
    queryKey: ['teams'],
    queryFn: () => base44.entities.Team.list(),
  });

  const teamMap = {};
  teamRecords.forEach(r => { teamMap[r.name] = r; });

  // Merge: entity teams first (sorted by order), then any defaults not yet created
  const entityNames = teamRecords
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(r => r.name);
  const teams = Array.from(new Set([...entityNames, ...TEAMS]));

  const colors = {};
  teams.forEach(name => { colors[name] = resolveTeamColor(name, teamMap); });

  return { teams, colors, teamRecords, teamMap, refetch };
}