import type { AuthOptions } from 'next-auth';
import AzureADProvider from 'next-auth/providers/azure-ad';

const tenantId = process.env.AZURE_AD_TENANT_ID ?? '';

export const authOptions: AuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID ?? '',
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET ?? '',
      tenantId,
      authorization: {
        params: {
          scope: 'openid profile email',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      const profileTenantId = typeof profile?.tid === 'string' ? profile.tid : null;
      return Boolean(tenantId && profileTenantId === tenantId);
    },
    async jwt({ token, profile }) {
      if (typeof profile?.tid === 'string') {
        token.tid = profile.tid;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
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
