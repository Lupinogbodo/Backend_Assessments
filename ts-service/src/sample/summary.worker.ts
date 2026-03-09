import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { SummaryStatus } from '../entities/candidate-summary.entity';
import {
  SUMMARIZATION_PROVIDER,
  SummarizationProvider,
} from '../llm/summarization-provider.interface';
import { QueueService } from '../queue/queue.service';
import { CandidatesService } from './candidates.service';

interface SummaryGenerationPayload {
  summaryId: string;
  candidateId: string;
}

@Injectable()
export class SummaryWorker implements OnModuleInit {
  private readonly logger = new Logger(SummaryWorker.name);
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(
    private readonly queueService: QueueService,
    private readonly candidatesService: CandidatesService,
    @Inject(SUMMARIZATION_PROVIDER)
    private readonly summarizationProvider: SummarizationProvider,
  ) {}

  onModuleInit() {
    // Start processing queue jobs every 2 seconds
    this.processingInterval = setInterval(() => {
      this.processJobs();
    }, 2000);

    this.logger.log('Summary worker started');
  }

  onModuleDestroy() {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
  }

  private async processJobs(): Promise<void> {
    const jobs = this.queueService.getQueuedJobs();
    const summaryJobs = jobs.filter(
      (job) => job.name === 'generate-candidate-summary',
    );

    for (const job of summaryJobs) {
      try {
        await this.processSummaryJob(
          job.payload as SummaryGenerationPayload,
        );
      } catch (error) {
        this.logger.error(
          `Failed to process job ${job.id}: ${error}`,
        );
      }
    }
  }

  private async processSummaryJob(
    payload: SummaryGenerationPayload,
  ): Promise<void> {
    const { summaryId, candidateId } = payload;

    this.logger.log(
      `Processing summary generation for candidate ${candidateId}, summary ${summaryId}`,
    );

    try {
      // Get the summary record
      const summary = await this.candidatesService.getSummaryById(summaryId);
      if (!summary) {
        this.logger.error(`Summary ${summaryId} not found`);
        return;
      }

      // Skip if already processed
      if (summary.status !== SummaryStatus.PENDING) {
        this.logger.log(`Summary ${summaryId} already processed`);
        return;
      }

      // Get candidate's documents
      const documents = await this.candidatesService.getCandidateDocuments(
        candidateId,
      );

      if (documents.length === 0) {
        await this.candidatesService.updateSummary(summaryId, {
          status: SummaryStatus.FAILED,
          errorMessage: 'No documents found for candidate',
        });
        return;
      }

      // Extract raw text from documents
      const documentTexts = documents.map((doc) => doc.rawText);

      // Call summarization provider
      const result = await this.summarizationProvider.generateCandidateSummary(
        {
          candidateId,
          documents: documentTexts,
        },
      );

      // Get provider info
      const providerName =
        'gemini-1.5-flash';
      const promptVersion = 'v1.0';

      // Update summary with results
      await this.candidatesService.updateSummary(summaryId, {
        status: SummaryStatus.COMPLETED,
        score: result.score,
        strengths: result.strengths,
        concerns: result.concerns,
        summary: result.summary,
        recommendedDecision: result.recommendedDecision,
        provider: providerName,
        promptVersion,
      });

      this.logger.log(
        `Successfully generated summary ${summaryId} for candidate ${candidateId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to generate summary ${summaryId}: ${error}`,
      );

      await this.candidatesService.updateSummary(summaryId, {
        status: SummaryStatus.FAILED,
        errorMessage: String(error),
      });
    }
  }
}
