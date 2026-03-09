import { Module } from '@nestjs/common';

import { FakeSummarizationProvider } from './fake-summarization.provider';
import { GeminiSummarizationProvider } from './gemini-summarization.provider';
import { SUMMARIZATION_PROVIDER } from './summarization-provider.interface';

@Module({
  providers: [
    FakeSummarizationProvider,
    GeminiSummarizationProvider,
    {
      provide: SUMMARIZATION_PROVIDER,
      useFactory: () => {
        // Use Gemini provider if API key is available, otherwise use fake provider
        const apiKey = process.env.GEMINI_API_KEY;
        if (apiKey) {
          return new GeminiSummarizationProvider();
        }
        return new FakeSummarizationProvider();
      },
    },
  ],
  exports: [SUMMARIZATION_PROVIDER, FakeSummarizationProvider, GeminiSummarizationProvider],
})
export class LlmModule {}

