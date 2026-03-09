import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AuthUser } from '../auth/auth.types';
import { CandidateDocument } from '../entities/candidate-document.entity';
import {
  CandidateSummary,
  SummaryStatus,
} from '../entities/candidate-summary.entity';
import { SampleCandidate } from '../entities/sample-candidate.entity';
import { CandidatesService } from './candidates.service';

describe('CandidatesService', () => {
  let service: CandidatesService;
  let candidateRepository: jest.Mocked<Repository<SampleCandidate>>;
  let documentRepository: jest.Mocked<Repository<CandidateDocument>>;
  let summaryRepository: jest.Mocked<Repository<CandidateSummary>>;

  const mockUser: AuthUser = {
    userId: 'user-123',
    workspaceId: 'workspace-123',
  };

  const mockCandidate: SampleCandidate = {
    id: 'candidate-123',
    workspaceId: 'workspace-123',
    fullName: 'John Doe',
    email: 'john@example.com',
    createdAt: new Date(),
    workspace: {} as any,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CandidatesService,
        {
          provide: getRepositoryToken(SampleCandidate),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(CandidateDocument),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(CandidateSummary),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CandidatesService>(CandidatesService);
    candidateRepository = module.get(getRepositoryToken(SampleCandidate));
    documentRepository = module.get(getRepositoryToken(CandidateDocument));
    summaryRepository = module.get(getRepositoryToken(CandidateSummary));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('uploadDocument', () => {
    it('should upload a document for a candidate', async () => {
      const dto = {
        documentType: 'resume',
        fileName: 'resume.pdf',
        rawText: 'Resume content here',
      };

      candidateRepository.findOne.mockResolvedValue(mockCandidate);
      documentRepository.create.mockReturnValue({
        id: 'doc-123',
        ...dto,
        candidateId: mockCandidate.id,
      } as any);
      documentRepository.save.mockResolvedValue({
        id: 'doc-123',
        ...dto,
        candidateId: mockCandidate.id,
      } as any);

      const result = await service.uploadDocument(
        mockUser,
        mockCandidate.id,
        dto,
      );

      expect(result.candidateId).toBe(mockCandidate.id);
      expect(result.fileName).toBe(dto.fileName);
      expect(candidateRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockCandidate.id },
      });
    });

    it('should throw NotFoundException for non-existent candidate', async () => {
      candidateRepository.findOne.mockResolvedValue(null);

      const dto = {
        documentType: 'resume',
        fileName: 'resume.pdf',
        rawText: 'Resume content',
      };

      await expect(
        service.uploadDocument(mockUser, 'non-existent', dto),
      ).rejects.toThrow('Candidate non-existent not found');
    });

    it('should throw ForbiddenException for wrong workspace', async () => {
      const wrongWorkspaceCandidate = {
        ...mockCandidate,
        workspaceId: 'wrong-workspace',
      };
      candidateRepository.findOne.mockResolvedValue(wrongWorkspaceCandidate);

      const dto = {
        documentType: 'resume',
        fileName: 'resume.pdf',
        rawText: 'Resume content',
      };

      await expect(
        service.uploadDocument(mockUser, mockCandidate.id, dto),
      ).rejects.toThrow('You do not have access to this candidate');
    });
  });

  describe('requestSummaryGeneration', () => {
    it('should create a pending summary', async () => {
      candidateRepository.findOne.mockResolvedValue(mockCandidate);
      summaryRepository.create.mockReturnValue({
        id: 'summary-123',
        candidateId: mockCandidate.id,
        status: SummaryStatus.PENDING,
      } as any);
      summaryRepository.save.mockResolvedValue({
        id: 'summary-123',
        candidateId: mockCandidate.id,
        status: SummaryStatus.PENDING,
      } as any);

      const result = await service.requestSummaryGeneration(
        mockUser,
        mockCandidate.id,
      );

      expect(result.status).toBe(SummaryStatus.PENDING);
      expect(result.candidateId).toBe(mockCandidate.id);
    });
  });

  describe('listSummaries', () => {
    it('should list summaries for a candidate', async () => {
      const mockSummaries = [
        {
          id: 'summary-1',
          candidateId: mockCandidate.id,
          status: SummaryStatus.COMPLETED,
        },
        {
          id: 'summary-2',
          candidateId: mockCandidate.id,
          status: SummaryStatus.PENDING,
        },
      ] as CandidateSummary[];

      candidateRepository.findOne.mockResolvedValue(mockCandidate);
      summaryRepository.find.mockResolvedValue(mockSummaries);

      const result = await service.listSummaries(mockUser, mockCandidate.id);

      expect(result).toHaveLength(2);
      expect(summaryRepository.find).toHaveBeenCalledWith({
        where: { candidateId: mockCandidate.id },
        order: { createdAt: 'DESC' },
      });
    });
  });
});
