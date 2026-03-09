import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiSecurity,
} from '@nestjs/swagger';

import { CurrentUser } from '../auth/auth-user.decorator';
import { AuthUser } from '../auth/auth.types';
import { FakeAuthGuard } from '../auth/fake-auth.guard';
import { CreateSampleCandidateDto } from './dto/create-sample-candidate.dto';
import { SampleService } from './sample.service';

@ApiTags('Sample (Helper Endpoints)')
@ApiSecurity('workspace-id')
@ApiSecurity('user-id')
@Controller('sample')
@UseGuards(FakeAuthGuard)
export class SampleController {
  constructor(private readonly sampleService: SampleService) {}

  @Post('candidates')
  @ApiOperation({ 
    summary: 'Create a sample candidate',
    description: 'Helper endpoint to create a candidate for testing. In production, candidates would be managed separately.',
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Candidate created successfully',
  })
  async createCandidate(
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSampleCandidateDto,
  ) {
    return this.sampleService.createCandidate(user, dto);
  }

  @Get('candidates')
  @ApiOperation({ 
    summary: 'List candidates in workspace',
    description: 'List all candidates belonging to the authenticated user\'s workspace.',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Candidates retrieved successfully',
  })
  async listCandidates(@CurrentUser() user: AuthUser) {
    return this.sampleService.listCandidates(user);
  }
}
