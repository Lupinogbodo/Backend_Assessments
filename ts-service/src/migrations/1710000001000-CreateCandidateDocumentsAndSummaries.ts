import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCandidateDocumentsAndSummaries1710000001000
  implements MigrationInterface
{
  name = 'CreateCandidateDocumentsAndSummaries1710000001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "candidate_documents" (
        "id" VARCHAR(64) NOT NULL,
        "candidate_id" VARCHAR(64) NOT NULL,
        "document_type" VARCHAR(50) NOT NULL,
        "file_name" VARCHAR(255) NOT NULL,
        "storage_key" VARCHAR(500) NOT NULL,
        "raw_text" TEXT NOT NULL,
        "uploaded_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "pk_candidate_documents" PRIMARY KEY ("id"),
        CONSTRAINT "fk_candidate_documents_candidate_id" FOREIGN KEY ("candidate_id") 
          REFERENCES "sample_candidates"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_candidate_documents_candidate_id" 
      ON "candidate_documents"("candidate_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "candidate_summaries" (
        "id" VARCHAR(64) NOT NULL,
        "candidate_id" VARCHAR(64) NOT NULL,
        "status" VARCHAR(20) NOT NULL DEFAULT 'pending',
        "score" INTEGER,
        "strengths" TEXT[],
        "concerns" TEXT[],
        "summary" TEXT,
        "recommended_decision" VARCHAR(50),
        "provider" VARCHAR(100),
        "prompt_version" VARCHAR(50),
        "error_message" TEXT,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT "pk_candidate_summaries" PRIMARY KEY ("id"),
        CONSTRAINT "fk_candidate_summaries_candidate_id" FOREIGN KEY ("candidate_id") 
          REFERENCES "sample_candidates"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_candidate_summaries_candidate_id" 
      ON "candidate_summaries"("candidate_id")
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_candidate_summaries_status" 
      ON "candidate_summaries"("status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_candidate_summaries_status"`);
    await queryRunner.query(`DROP INDEX "idx_candidate_summaries_candidate_id"`);
    await queryRunner.query(`DROP TABLE "candidate_summaries"`);
    await queryRunner.query(`DROP INDEX "idx_candidate_documents_candidate_id"`);
    await queryRunner.query(`DROP TABLE "candidate_documents"`);
  }
}
