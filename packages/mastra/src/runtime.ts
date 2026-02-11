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
import { recruiterCriteriaAgent } from './agents/recruiterCriteriaAgent';
import { candidateSummaryAgent } from './agents/candidateSummaryAgent';
import { recruiterWorkflowCriteriaAgent } from './agents/recruiterWorkflowCriteriaAgent';
import { recruiterWorkflowPeopleResearchAgent } from './agents/recruiterWorkflowPeopleResearchAgent';
import { recruiterWorkflowCandidateSummaryAgent } from './agents/recruiterWorkflowCandidateSummaryAgent';
import { recruiterCandidateWorkflow } from './workflows/recruiterCandidateWorkflow';
import { linkedinCandidateSourcingAgent } from './agents/linkedinCandidateSourcingAgent';

let mastraInstance: Mastra | null = null;

const getDatabaseConnectionString = (): string | undefined => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const database = process.env.AZURE_POSTGRESQL_DATABASE;
  const host = process.env.AZURE_POSTGRESQL_HOST;
  const password = process.env.AZURE_POSTGRESQL_PASSWORD;
  const user = process.env.AZURE_POSTGRESQL_USER;
  const port = process.env.AZURE_POSTGRESQL_PORT || '5432';

  if (!database || !host || !password || !user) {
    return undefined;
  }

  const sslRaw = process.env.AZURE_POSTGRESQL_SSL ?? '';
  const sslEnabled = ['1', 'true', 'yes', 'require'].includes(sslRaw.toLowerCase());
  const encodedUser = encodeURIComponent(user);
  const encodedPassword = encodeURIComponent(password);
  const encodedDatabase = encodeURIComponent(database);
  const sslQuery = sslEnabled ? '?sslmode=require' : '';

  return `postgres://${encodedUser}:${encodedPassword}@${host}:${port}/${encodedDatabase}${sslQuery}`;
};

const createStorage = () => {
  const connectionString = getDatabaseConnectionString();

  if (connectionString) {
    return new PostgresStore({
      id: 'mastra-storage',
      connectionString,
    });
  }

  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    throw new Error(
      'DATABASE_URL or AZURE_POSTGRESQL_DATABASE/HOST/PASSWORD/PORT/SSL/USER is required in production to initialize Mastra Postgres storage',
    );
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
      recruiterCriteriaAgent,
      candidateSummaryAgent,
      recruiterWorkflowCriteriaAgent,
      recruiterWorkflowPeopleResearchAgent,
      recruiterWorkflowCandidateSummaryAgent,
      linkedinCandidateSourcingAgent,
    },
    workflows: { generateReportWorkflow, researchWorkflow, recruiterCandidateWorkflow },
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
