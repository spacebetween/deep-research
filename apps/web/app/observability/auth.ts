export const isObservabilityAuthorized = (secret: string | undefined) => {
  if (process.env.NODE_ENV !== 'production' && !process.env.OBSERVABILITY_ADMIN_SECRET) {
    return true;
  }

  return Boolean(process.env.OBSERVABILITY_ADMIN_SECRET && secret === process.env.OBSERVABILITY_ADMIN_SECRET);
};

export const withSecret = (path: string, secret: string | undefined) => {
  if (!secret) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}secret=${encodeURIComponent(secret)}`;
};
