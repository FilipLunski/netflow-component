export type Granularity = "1m" | "5m" | "30m" | "1h" | "12h" | "1d";
export type Metric = "count" | "volume";

export const granularityMap = {
  "1m": { unit: "minute", binSize: 1, minutes: 1, maxSpan: 120 },
  "5m": { unit: "minute", binSize: 5, minutes: 5, maxSpan: 144 },
  "30m": { unit: "minute", binSize: 30, minutes: 30, maxSpan: 48 },
  "1h": { unit: "hour", binSize: 1, minutes: 60, maxSpan: 48 },
  "12h": { unit: "hour", binSize: 12, minutes: 720, maxSpan: 60 },
  "1d": { unit: "day", binSize: 1, minutes: 1440, maxSpan: 120 },
};
