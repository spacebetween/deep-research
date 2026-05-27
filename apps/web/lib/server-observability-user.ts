import { getToken } from 'next-auth/jwt';

export type ObservabilityUser = {
  userId: string | null;
  userEmail: string | null;
  userName: string | null;
};

export const getCurrentObservabilityUser = async (request: Request): Promise<ObservabilityUser> => {
  if (process.env.OBSERVABILITY_ENABLED === 'false') {
    return { userId: null, userEmail: null, userName: null };
  }

  const token = await getToken({ req: request as never, secret: process.env.NEXTAUTH_SECRET });

  return {
    userId: (typeof token?.userId === 'string' ? token.userId : null) ?? token?.sub ?? token?.email ?? null,
    userEmail: token?.email ?? null,
    userName: token?.name ?? null,
  };
};
