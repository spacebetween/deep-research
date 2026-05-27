import type { Account, AuthOptions, Profile } from 'next-auth';
import AzureADProvider from 'next-auth/providers/azure-ad';

const requiredEnv = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required for Microsoft Entra sign-in.`);
  }
  return value;
};

const tenantId = requiredEnv('AZURE_AD_TENANT_ID');

type EntraIdTokenClaims = {
  tid?: string;
  oid?: string;
};

const decodeIdTokenClaims = (account?: Account | null): EntraIdTokenClaims => {
  const idToken = account?.id_token;
  if (!idToken) return {};

  const [, payload] = idToken.split('.');
  if (!payload) return {};

  try {
    return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as EntraIdTokenClaims;
  } catch {
    return {};
  }
};

const profileTenantId = (profile?: Profile): string | null => {
  const tenant = profile && 'tid' in profile ? profile.tid : null;
  return typeof tenant === 'string' ? tenant : null;
};

export const authOptions: AuthOptions = {
  providers: [
    AzureADProvider({
      clientId: requiredEnv('AZURE_AD_CLIENT_ID'),
      clientSecret: requiredEnv('AZURE_AD_CLIENT_SECRET'),
      tenantId,
      authorization: {
        params: {
          scope: 'openid profile email',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      const tokenTenantId = decodeIdTokenClaims(account).tid ?? profileTenantId(profile);
      return Boolean(tenantId && tokenTenantId === tenantId);
    },
    async jwt({ token, account, profile }) {
      const tokenClaims = decodeIdTokenClaims(account);
      const tokenTenantId = tokenClaims.tid ?? profileTenantId(profile);
      if (tokenTenantId) {
        token.tid = tokenTenantId;
      }
      token.userId = tokenClaims.oid ?? token.sub;
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId ?? token.sub ?? null;
        session.user.name = session.user.name ?? token.name ?? null;
        session.user.email = session.user.email ?? token.email ?? null;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
};
