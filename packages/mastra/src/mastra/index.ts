import { createMastra } from '../runtime';

const MASTRA_URL_LOGGED_FLAG = '__DEEP_RESEARCH_MASTRA_URL_LOGGED__';

const toValidPort = (value: number | string | undefined): number | undefined => {
  const port = Number(value);
  return Number.isInteger(port) && port > 0 ? port : undefined;
};

const logMastraServerUrl = (url: string) => {
  const globalState = globalThis as typeof globalThis & { [MASTRA_URL_LOGGED_FLAG]?: boolean };

  if (globalState[MASTRA_URL_LOGGED_FLAG]) {
    return;
  }

  globalState[MASTRA_URL_LOGGED_FLAG] = true;
  console.info(`[mastra] Server URL: ${url}`);
};

export const mastra = createMastra();

const serverConfig = mastra.getServer();
const host = serverConfig?.host ?? process.env.HOST ?? 'localhost';
const port = toValidPort(serverConfig?.port ?? process.env.PORT) ?? 4111;
const protocol = serverConfig?.https ? 'https' : 'http';

logMastraServerUrl(`${protocol}://${host}:${port}`);
