import segments from "../data/segments.json";

export type SegmentKey = keyof typeof segments;

export interface Season {
  startMonth: number;
  endMonth: number;
  reason: string;
}

export interface MaintenanceItem {
  item: string;
  km: number;
  typicalCostCents: number;
}

export interface Segment {
  label: string;
  rough: boolean;
  firstYearDrop: number;
  monthlyRate: number;
  lateMonthlyRate: number;
  flattensAfterMonths: number;
  season: Season | null;
  maintenance: MaintenanceItem[];
}

const TABLE: Record<SegmentKey, Segment> = segments;

export const SEGMENTS = Object.keys(TABLE) as SegmentKey[];

export function segmentFor(key: SegmentKey): Segment {
  return TABLE[key];
}
