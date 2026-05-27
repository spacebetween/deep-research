export type RequestTimelineRow = {
  completed_at: string;
  status_code: number;
};

export type RequestTimelinePoint = {
  bucketStart: string;
  label: string;
  total: number;
  status2xx: number;
  status3xx: number;
  status4xx: number;
  status5xx: number;
};

const hourMs = 60 * 60 * 1000;

const toHourStart = (date: Date) => {
  const bucket = new Date(date);
  bucket.setUTCMinutes(0, 0, 0);
  return bucket;
};

const formatHourLabel = (date: Date) => {
  const hours = String(date.getUTCHours()).padStart(2, '0');
  return `${hours}:00`;
};

export const buildRequestTimeline = (
  rows: RequestTimelineRow[],
  now = new Date(),
  bucketCount = 24,
): RequestTimelinePoint[] => {
  const currentHour = toHourStart(now);
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const bucket = new Date(currentHour.getTime() - (bucketCount - index - 1) * hourMs);
    return {
      bucketStart: bucket.toISOString(),
      label: formatHourLabel(bucket),
      total: 0,
      status2xx: 0,
      status3xx: 0,
      status4xx: 0,
      status5xx: 0,
    };
  });
  const byStart = new Map(buckets.map(bucket => [bucket.bucketStart, bucket]));

  for (const row of rows) {
    const completedAt = new Date(row.completed_at);
    if (Number.isNaN(completedAt.getTime())) continue;

    const bucketStart = toHourStart(completedAt).toISOString();
    const bucket = byStart.get(bucketStart);
    if (!bucket) continue;

    bucket.total += 1;
    if (row.status_code >= 200 && row.status_code < 300) bucket.status2xx += 1;
    else if (row.status_code >= 300 && row.status_code < 400) bucket.status3xx += 1;
    else if (row.status_code >= 400 && row.status_code < 500) bucket.status4xx += 1;
    else if (row.status_code >= 500) bucket.status5xx += 1;
  }

  return buckets;
};
