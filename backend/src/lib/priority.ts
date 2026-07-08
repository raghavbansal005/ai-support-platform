export const PRIORITY_WEIGHT: Record<string, number> = {
  URGENT: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

/** Sorts most-severe first. Falls back gracefully for unknown values. */
export function sortByPriorityDesc<T extends { priority: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => (PRIORITY_WEIGHT[b.priority] ?? 0) - (PRIORITY_WEIGHT[a.priority] ?? 0));
}
