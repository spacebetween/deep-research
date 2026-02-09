import { Observability, DefaultExporter, CloudExporter, SensitiveDataFilter } from '@mastra/observability';
import { Mastra } from '@mastra/core/mastra';
import { PostgresStore } from '@mastra/pg';
import { researchWorkflow } from './workflows/researchWorkflow';
import { learningExtractionAgent } from './agents/learningExtractionAgent';
import { evaluationAgent } from './agents/evaluationAgent';
import { reportAgent } from './agents/reportAgent';
import { researchAgent } from './agents/researchAgent';
import { webSummarizationAgent } from './agents/webSummarizationAgent';
import { generateReportWorkflow } from './workflows/generateReportWorkflow';
import { peopleResearchAgent } from './agents/peopleResearchAgent';

let mastraInstance: Mastra | null = null;

export const createMastra = (): Mastra => {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required to initialize Mastra Postgres storage');
  }

  return new Mastra({
    storage: new PostgresStore({
      id: 'mastra-storage',
      connectionString,
    }),
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