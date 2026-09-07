import type { GoalType } from '../types';

export const GOAL_TYPES: { value: GoalType; label: string }[] = [
  { value: 'collectieve_aanval', label: 'Collectieve aanval' },
  { value: 'individuele_actie', label: 'Individuele actie' },
  { value: 'hoekschop', label: 'Hoekschop' },
  { value: 'vrije_trap', label: 'Vrije trap' },
  { value: 'penalty', label: 'Penalty' },
  { value: 'counter', label: 'Counter' },
  { value: 'rebound', label: 'Rebound' },
  { value: 'kopbal', label: 'Kopbal' },
  { value: 'owngoal', label: 'Owngoal' },
];

export const GOAL_TYPE_LABELS: Record<GoalType, string> = GOAL_TYPES.reduce(
  (acc, { value, label }) => ({ ...acc, [value]: label }),
  {} as Record<GoalType, string>
);
