import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user?: DefaultSession['user'] & {
      id?: string | null;
    };
  }

  interface Profile {
    tid?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    tid?: string;
    userId?: string;
  }
}
