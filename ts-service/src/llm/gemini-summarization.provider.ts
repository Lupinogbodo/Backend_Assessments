import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

import {
  CandidateSummaryInput,
  CandidateSummaryResult,
  RecommendedDecision,
  SummarizationProvider,
} from './summarization-provider.interface';

interface GeminiCandidateSummary {
  score: number;
  strengths: string[];
  concerns: string[];
  summary: string;
  recommendedDecision: RecommendedDecision;
}

@Injectable()
export class GeminiSummarizationProvider implements SummarizationProvider {
  private readonly logger = new Logger(GeminiSummarizationProvider.name);
  private readonly genAI: GoogleGenerativeAI;
  private readonly model: any;
  private readonly promptVersion = 'v1.0';

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }

    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        responseMimeType: 'application/json',
      },
    });
  }

  async generateCandidateSummary(
    input: CandidateSummaryInput,
  ): Promise<CandidateSummaryResult> {
    try {
      const prompt = this.buildPrompt(input);
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      this.logger.log(
        `Generated summary for candidate ${input.candidateId}`,
      );

      // Parse and validate the JSON response
      const parsed = this.parseAndValidateResponse(text);
      return parsed;
    } catch (error) {
      this.logger.error(
        `Failed to generate summary for candidate ${input.candidateId}: ${error}`,
      );
      throw error;
    }
  }

  private buildPrompt(input: CandidateSummaryInput): string {
    const documentsText = input.documents.join('\n\n---\n\n');

    return `You are an expert recruiter analyzing candidate documents. Review the following candidate documents and provide a structured evaluation.

CANDIDATE DOCUMENTS:
${documentsText}

Please provide your evaluation in the following JSON format:
{
  "score": <number between 0-100>,
  "strengths": [<array of 2-5 key strengths as strings>],
  "concerns": [<array of 1-4 concerns or areas for improvement as strings>],
  "summary": "<2-3 sentence overall summary>",
  "recommendedDecision": "<one of: 'advance', 'hold', or 'reject'>"
}

Guidelines:
- score: Overall candidate rating from 0-100
- strengths: Specific positive attributes (technical skills, experience, communication)
- concerns: Areas that need clarification or potential weaknesses
- summary: Concise overview of the candidate's fit
- recommendedDecision: "advance" for strong candidates, "hold" for borderline cases, "reject" for poor fit

Provide only the JSON response, no additional text.`;
  }

  private parseAndValidateResponse(text: string): CandidateSummaryResult {
    try {
      const parsed = JSON.parse(text) as GeminiCandidateSummary;

      // Validate required fields
      if (
        typeof parsed.score !== 'number' ||
        !Array.isArray(parsed.strengths) ||
        !Array.isArray(parsed.concerns) ||
        typeof parsed.summary !== 'string' ||
        typeof parsed.recommendedDecision !== 'string'
      ) {
        throw new Error('Invalid response structure from LLM');
      }

      // Validate recommendedDecision is one of the allowed values
      const validDecisions: RecommendedDecision[] = [
        'advance',
        'hold',
        'reject',
      ];
      if (!validDecisions.includes(parsed.recommendedDecision)) {
        throw new Error(
          `Invalid recommendedDecision: ${parsed.recommendedDecision}`,
        );
      }

      // Validate score is in valid range
      if (parsed.score < 0 || parsed.score > 100) {
        throw new Error(`Invalid score: ${parsed.score}`);
      }

      return parsed;
    } catch (error) {
      this.logger.error(`Failed to parse LLM response: ${error}`);
      throw new Error(`Failed to parse LLM response: ${error}`);
    }
  }

  getPromptVersion(): string {
    return this.promptVersion;
  }

  getProviderName(): string {
    return 'gemini-2.0-flash';
  }
}
