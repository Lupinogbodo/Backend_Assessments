import { randomUUID } from 'crypto';

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuthUser } from '../auth/auth.types';
import { SampleCandidate } from '../entities/sample-candidate.entity';
import { CandidateDocument } from '../entities/candidate-document.entity';
import {
  CandidateSummary,
  SummaryStatus,
} from '../entities/candidate-summary.entity';
import { UploadDocumentDto } from './dto/upload-document.dto';

@Injectable()
export class CandidatesService {
  constructor(
    @InjectRepository(SampleCandidate)
    private readonly candidateRepository: Repository<SampleCandidate>,
    @InjectRepository(CandidateDocument)
    private readonly documentRepository: Repository<CandidateDocument>,
    @InjectRepository(CandidateSummary)
    private readonly summaryRepository: Repository<CandidateSummary>,
  ) {}

  async uploadDocument(
    user: AuthUser,
    candidateId: string,
    dto: UploadDocumentDto,
  ): Promise<CandidateDocument> {
    // Verify candidate belongs to user's workspace
    const candidate = await this.findCandidateInWorkspace(
      candidateId,
      user.workspaceId,
    );

    // Create storage key (in a real system, this would be a cloud storage path)
    const storageKey = `workspaces/${user.workspaceId}/candidates/${candidateId}/documents/${randomUUID()}-${dto.fileName}`;

    const document = this.documentRepository.create({
      id: randomUUID(),
      candidateId: candidate.id,
      documentType: dto.documentType,
      fileName: dto.fileName,
      storageKey,
      rawText: dto.rawText,
    });

    return this.documentRepository.save(document);
  }

  async requestSummaryGeneration(
    user: AuthUser,
    candidateId: string,
  ): Promise<CandidateSummary> {
    // Verify candidate belongs to user's workspace
    const candidate = await this.findCandidateInWorkspace(
      candidateId,
      user.workspaceId,
    );

    // Create pending summary record
    const summary = this.summaryRepository.create({
      id: randomUUID(),
      candidateId: candidate.id,
      status: SummaryStatus.PENDING,
    });

    return this.summaryRepository.save(summary);
  }

  async listSummaries(
    user: AuthUser,
    candidateId: string,
  ): Promise<CandidateSummary[]> {
    // Verify candidate belongs to user's workspace
    await this.findCandidateInWorkspace(candidateId, user.workspaceId);

    return this.summaryRepository.find({
      where: { candidateId },
      order: { createdAt: 'DESC' },
    });
  }

  async getSummary(
    user: AuthUser,
    candidateId: string,
    summaryId: string,
  ): Promise<CandidateSummary> {
    // Verify candidate belongs to user's workspace
    await this.findCandidateInWorkspace(candidateId, user.workspaceId);

    const summary = await this.summaryRepository.findOne({
      where: { id: summaryId, candidateId },
    });

    if (!summary) {
      throw new NotFoundException(
        `Summary ${summaryId} not found for candidate ${candidateId}`,
      );
    }

    return summary;
  }

  async getCandidateDocuments(candidateId: string): Promise<CandidateDocument[]> {
    return this.documentRepository.find({
      where: { candidateId },
      order: { uploadedAt: 'DESC' },
    });
  }

  async getSummaryById(summaryId: string): Promise<CandidateSummary | null> {
    return this.summaryRepository.findOne({ where: { id: summaryId } });
  }

  async updateSummary(
    summaryId: string,
    updates: Partial<CandidateSummary>,
  ): Promise<void> {
    await this.summaryRepository.update(summaryId, updates);
  }

  private async findCandidateInWorkspace(
    candidateId: string,
    workspaceId: string,
  ): Promise<SampleCandidate> {
    const candidate = await this.candidateRepository.findOne({
      where: { id: candidateId },
    });

    if (!candidate) {
      throw new NotFoundException(`Candidate ${candidateId} not found`);
    }

    if (candidate.workspaceId !== workspaceId) {
      throw new ForbiddenException(
        'You do not have access to this candidate',
      );
    }

    return candidate;
  }
}
