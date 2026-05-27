import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions, missingAzureAdEnvironmentVariables } from '../../../../lib/auth';

const nextAuthHandler = NextAuth(authOptions);

const handler = (
  request: Parameters<typeof nextAuthHandler>[0],
  context: Parameters<typeof nextAuthHandler>[1],
) => {
  const missing = missingAzureAdEnvironmentVariables();
  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Microsoft Entra sign-in is not configured. Missing: ${missing.join(', ')}` },
      { status: 500 },
    );
  }

  return nextAuthHandler(request, context);
};

export { handler as GET, handler as POST };
