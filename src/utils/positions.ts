import type { FieldPosition } from '../types';

export const FIELD_POSITIONS: { value: FieldPosition; label: string }[] = [
  { value: 'keeper', label: 'Keeper' },
  { value: 'verdediger_links', label: 'Verdediger links' },
  { value: 'verdediger_centraal', label: 'Verdediger centraal' },
  { value: 'verdediger_rechts', label: 'Verdediger rechts' },
  { value: 'middenvelder', label: 'Middenvelder' },
  { value: 'aanvaller_links', label: 'Aanvaller links' },
  { value: 'spits', label: 'Spits' },
  { value: 'aanvaller_rechts', label: 'Aanvaller rechts' },
];

export const POSITION_LABELS: Record<FieldPosition, string> = FIELD_POSITIONS.reduce(
  (acc, { value, label }) => ({ ...acc, [value]: label }),
  {} as Record<FieldPosition, string>
);
