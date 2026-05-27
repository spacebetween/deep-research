export type CaptureMode = 'off' | 'summary' | 'full';

export type ObservabilityPolicy = {
  enabled: boolean;
  captureMessages: CaptureMode;
  captureResults: CaptureMode;
  captureFullContent: boolean;
  retentionDays: number;
};

type EnvLike = Record<string, string | undefined>;

const validCaptureModes = new Set<CaptureMode>(['off', 'summary', 'full']);

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (!value) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

const parseCaptureMode = (value: string | undefined, fallback: CaptureMode): CaptureMode => {
  if (!value) return fallback;
  return validCaptureModes.has(value as CaptureMode) ? (value as CaptureMode) : fallback;
};

const parseRetentionDays = (value: string | undefined) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 30;
};

export const getObservabilityPolicy = (env: EnvLike = process.env): ObservabilityPolicy => {
  const isProduction = env.NODE_ENV === 'production';

  return {
    enabled: parseBoolean(env.OBSERVABILITY_ENABLED, !isProduction),
    captureMessages: parseCaptureMode(env.OBSERVABILITY_CAPTURE_MESSAGES, isProduction ? 'summary' : 'full'),
    captureResults: parseCaptureMode(env.OBSERVABILITY_CAPTURE_RESULTS, isProduction ? 'summary' : 'full'),
    captureFullContent: parseBoolean(env.OBSERVABILITY_CAPTURE_FULL_CONTENT, false),
    retentionDays: parseRetentionDays(env.OBSERVABILITY_RETENTION_DAYS),
  };
};

export const normalizeClientId = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  return /^[A-Za-z0-9_-]{1,128}$/.test(normalized) ? normalized : null;
};

export const summarizeText = (value: string | null | undefined, maxLength = 240): string | null => {
  if (!value) return null;
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (!normalized) return null;
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength)}...`;
};
