// ─── Heat Score Formulas ──────────────────────────────────────────────────────
// Spec §4.3

const DECAY_HALF_LIFE_HOURS = 12;

function decay(ageInHours: number): number {
  // Reddit-style time decay: score * (1 / (age + 2))^gravity
  // Using exponential decay: e^(-ln2 / halfLife * age)
  const lambda = Math.LN2 / DECAY_HALF_LIFE_HOURS;
  return Math.exp(-lambda * ageInHours);
}

export function calcTalkHeatScore(params: {
  upvotes: number;
  downvotes: number;
  commentCount: number;
  uniqueParticipants: number;
  createdAt: string;
}): number {
  const ageHours =
    (Date.now() - new Date(params.createdAt).getTime()) / 3_600_000;
  const baseScore =
    (params.upvotes - params.downvotes) * 1.0 +
    params.commentCount * 0.8 +
    params.uniqueParticipants * 1.2;
  return Math.max(0, baseScore * decay(ageHours));
}

export function calcRepoHeatScore(params: {
  deltaStars7d: number;
  deltaForks7d: number;
  commitCount7d: number;
}): number {
  return Math.max(
    0,
    params.deltaStars7d * 2.0 +
      params.deltaForks7d * 1.5 +
      params.commitCount7d * 0.8
  );
}

// Label weights for Issue Heat Score
const LABEL_WEIGHTS: Record<string, number> = {
  rfc: 2.0,
  "type: rfc": 2.0,
  proposal: 1.5,
  discussion: 1.0,
  feature: 0.8,
  "feature request": 0.8,
  enhancement: 0.8,
};

export function calcIssueHeatScore(params: {
  commentCount: number;
  reactionPlus1: number;
  labels: string[];
}): number {
  const labelScore = params.labels
    .map((l) => LABEL_WEIGHTS[l.toLowerCase()] ?? 0)
    .reduce((a, b) => a + b, 0);

  return Math.max(
    0,
    params.commentCount * 1.0 + params.reactionPlus1 * 0.8 + labelScore
  );
}
