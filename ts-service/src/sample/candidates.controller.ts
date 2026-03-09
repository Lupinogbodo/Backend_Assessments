import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiSecurity,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/auth-user.decorator';
import { AuthUser } from '../auth/auth.types';
import { FakeAuthGuard } from '../auth/fake-auth.guard';
import { QueueService } from '../queue/queue.service';
import { CandidatesService } from './candidates.service';
import { UploadDocumentDto } from './dto/upload-document.dto';

@ApiTags('Candidates')
@ApiSecurity('workspace-id')
@ApiSecurity('user-id')
@Controller('candidates')
@UseGuards(FakeAuthGuard)
export class CandidatesController {
  constructor(
    private readonly candidatesService: CandidatesService,
    private readonly queueService: QueueService,
  ) {}

  @Post(':candidateId/documents')
  @ApiOperation({ 
    summary: 'Upload a candidate document',
    description: 'Upload a document (resume, cover letter, etc.) for a candidate. The document text should be pre-extracted.',
  })
  @ApiParam({ name: 'candidateId', description: 'Candidate unique identifier' })
  @ApiResponse({ 
    status: 201, 
    description: 'Document uploaded successfully',
    schema: {
      example: {
        id: 'doc-uuid',
        candidateId: 'candidate-uuid',
        documentType: 'resume',
        fileName: 'john_doe_resume.pdf',
        storageKey: 'workspaces/ws-123/candidates/c-456/documents/doc-789-john_doe_resume.pdf',
        uploadedAt: '2024-03-09T10:00:00Z',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Candidate not found' })
  @ApiForbiddenResponse({ description: 'Access denied - candidate belongs to different workspace' })
  async uploadDocument(
    @CurrentUser() user: AuthUser,
    @Param('candidateId') candidateId: string,
    @Body() dto: UploadDocumentDto,
  ) {
    const document = await this.candidatesService.uploadDocument(
      user,
      candidateId,
      dto,
    );

    return {
      id: document.id,
      candidateId: document.candidateId,
      documentType: document.documentType,
      fileName: document.fileName,
      storageKey: document.storageKey,
      uploadedAt: document.uploadedAt,
    };
  }

  @Post(':candidateId/summaries/generate')
  @ApiOperation({ 
    summary: 'Request candidate summary generation',
    description: 'Queue an async job to generate an AI-powered candidate summary using uploaded documents.',
  })
  @ApiParam({ name: 'candidateId', description: 'Candidate unique identifier' })
  @ApiResponse({ 
    status: 200, 
    description: 'Summary generation queued successfully',
    schema: {
      example: {
        id: 'summary-uuid',
        candidateId: 'candidate-uuid',
        status: 'pending',
        message: 'Summary generation queued',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Candidate not found' })
  @ApiForbiddenResponse({ description: 'Access denied - candidate belongs to different workspace' })
  async generateSummary(
    @CurrentUser() user: AuthUser,
    @Param('candidateId') candidateId: string,
  ) {
    // Create pending summary record
    const summary = await this.candidatesService.requestSummaryGeneration(
      user,
      candidateId,
    );

    // Enqueue background job
    this.queueService.enqueue('generate-candidate-summary', {
      summaryId: summary.id,
      candidateId: summary.candidateId,
    });

    return {
      id: summary.id,
      candidateId: summary.candidateId,
      status: summary.status,
      message: 'Summary generation queued',
    };
  }

  @Get(':candidateId/summaries')
  @ApiOperation({ 
    summary: 'List candidate summaries',
    description: 'Retrieve all summaries for a specific candidate.',
  })
  @ApiParam({ name: 'candidateId', description: 'Candidate unique identifier' })
  @ApiResponse({ 
    status: 200, 
    description: 'List of summaries retrieved successfully',
    schema: {
      example: [{
        id: 'summary-uuid',
        candidateId: 'candidate-uuid',
        status: 'completed',
        score: 75,
        strengths: ['Strong technical background', 'Good communication'],
        concerns: ['Limited leadership experience'],
        summary: 'Strong mid-level candidate with solid technical skills.',
        recommendedDecision: 'advance',
        provider: 'gemini-1.5-flash',
        errorMessage: null,
        createdAt: '2024-03-09T10:00:00Z',
        updatedAt: '2024-03-09T10:00:05Z',
      }],
    },
  })
  @ApiNotFoundResponse({ description: 'Candidate not found' })
  @ApiForbiddenResponse({ description: 'Access denied - candidate belongs to different workspace' })
  async listSummaries(
    @CurrentUser() user: AuthUser,
    @Param('candidateId') candidateId: string,
  ) {
    const summaries = await this.candidatesService.listSummaries(
      user,
      candidateId,
    );

    return summaries.map((summary) => ({
      id: summary.id,
      candidateId: summary.candidateId,
      status: summary.status,
      score: summary.score,
      strengths: summary.strengths,
      concerns: summary.concerns,
      summary: summary.summary,
      recommendedDecision: summary.recommendedDecision,
      provider: summary.provider,
      errorMessage: summary.errorMessage,
      createdAt: summary.createdAt,
      updatedAt: summary.updatedAt,
    }));
  }

  @Get(':candidateId/summaries/:summaryId')
  @ApiOperation({ 
    summary: 'Get a specific summary',
    description: 'Retrieve detailed information for a specific candidate summary.',
  })
  @ApiParam({ name: 'candidateId', description: 'Candidate unique identifier' })
  @ApiParam({ name: 'summaryId', description: 'Summary unique identifier' })
  @ApiResponse({ 
    status: 200, 
    description: 'Summary retrieved successfully',
    schema: {
      example: {
        id: 'summary-uuid',
        candidateId: 'candidate-uuid',
        status: 'completed',
        score: 75,
        strengths: ['Strong technical background', 'Good communication'],
        concerns: ['Limited leadership experience'],
        summary: 'Strong mid-level candidate with solid technical skills.',
        recommendedDecision: 'advance',
        provider: 'gemini-1.5-flash',
        promptVersion: 'v1.0',
        errorMessage: null,
        createdAt: '2024-03-09T10:00:00Z',
        updatedAt: '2024-03-09T10:00:05Z',
      },
    },
  })
  @ApiNotFoundResponse({ description: 'Candidate or summary not found' })
  @ApiForbiddenResponse({ description: 'Access denied - candidate belongs to different workspace' })
  async getSummary(
    @CurrentUser() user: AuthUser,
    @Param('candidateId') candidateId: string,
    @Param('summaryId') summaryId: string,
  ) {
    const summary = await this.candidatesService.getSummary(
      user,
      candidateId,
      summaryId,
    );

    return {
      id: summary.id,
      candidateId: summary.candidateId,
      status: summary.status,
      score: summary.score,
      strengths: summary.strengths,
      concerns: summary.concerns,
      summary: summary.summary,
      recommendedDecision: summary.recommendedDecision,
      provider: summary.provider,
      promptVersion: summary.promptVersion,
      errorMessage: summary.errorMessage,
      createdAt: summary.createdAt,
      updatedAt: summary.updatedAt,
    };
  }
}
