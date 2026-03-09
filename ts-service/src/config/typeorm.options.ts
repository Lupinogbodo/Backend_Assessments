import * as dotenv from 'dotenv';
dotenv.config();

import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSourceOptions } from 'typeorm';

import { CandidateDocument } from '../entities/candidate-document.entity';
import { CandidateSummary } from '../entities/candidate-summary.entity';
import { SampleCandidate } from '../entities/sample-candidate.entity';
import { SampleWorkspace } from '../entities/sample-workspace.entity';
import { InitialStarterEntities1710000000000 } from '../migrations/1710000000000-InitialStarterEntities';
import { CreateCandidateDocumentsAndSummaries1710000001000 } from '../migrations/1710000001000-CreateCandidateDocumentsAndSummaries';

export const defaultDatabaseUrl =
  'postgresql://assessment_user:assessment_pass@localhost:5432/assessment_db';

export const getTypeOrmOptions = (
  databaseUrl: string,
): TypeOrmModuleOptions & DataSourceOptions => ({
  type: 'postgres',
  url: databaseUrl,
  entities: [SampleWorkspace, SampleCandidate, CandidateDocument, CandidateSummary],
  migrations: [InitialStarterEntities1710000000000, CreateCandidateDocumentsAndSummaries1710000001000],
  migrationsTableName: 'typeorm_migrations',
  synchronize: false,
  logging: false,
});
