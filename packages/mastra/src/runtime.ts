import { Observability, DefaultExporter, CloudExporter, SensitiveDataFilter } from '@mastra/observability';
import { Mastra } from '@mastra/core/mastra';
import { PostgresStore } from '@mastra/pg';
import { LibSQLStore } from '@mastra/libsql';
import { dirname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { researchWorkflow } from './workflows/researchWorkflow';
import { learningExtractionAgent } from './agents/learningExtractionAgent';
import { evaluationAgent } from './agents/evaluationAgent';
import { reportAgent } from './agents/reportAgent';
import { researchAgent } from './agents/researchAgent';
import { webSummarizationAgent } from './agents/webSummarizationAgent';
import { generateReportWorkflow } from './workflows/generateReportWorkflow';
import { peopleResearchAgent } from './agents/peopleResearchAgent';

let mastraInstance: Mastra | null = null;

const createStorage = () => {
  const connectionString = process.env.DATABASE_URL;

  if (connectionString) {
    return new PostgresStore({
      id: 'mastra-storage',
      connectionString,
    });
  }

  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    throw new Error('DATABASE_URL is required in production to initialize Mastra Postgres storage');
  }

  const localDbPath = resolve(process.cwd(), '.mastra-dev', 'mastra.db');
  mkdirSync(dirname(localDbPath), { recursive: true });

  return new LibSQLStore({
    id: 'mastra-storage',
    url: `file:${localDbPath}`,
  });
};

export const createMastra = (): Mastra => {
  return new Mastra({
    storage: createStorage(),
    agents: {
      researchAgent,
      reportAgent,
      evaluationAgent,
      learningExtractionAgent,
      webSummarizationAgent,
      peopleResearchAgent,
    },
    workflows: { generateReportWorkflow, researchWorkflow },
    observability: new Observability({
      configs: {
        default: {
          serviceName: 'mastra',
          exporters: [new DefaultExporter(), new CloudExporter()],
          spanOutputProcessors: [new SensitiveDataFilter()],
        },
      },
    }),
  });
};

export const getMastra = (): Mastra => {
  if (mastraInstance) {
    return mastraInstance;
  }

  mastraInstance = createMastra();
  return mastraInstance;
};
