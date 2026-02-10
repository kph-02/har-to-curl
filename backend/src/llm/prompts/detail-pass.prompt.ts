import type { PromptTemplate } from './prompt-builder';

export type DetailPassPromptInput = {
  readonly description: string;
  readonly candidates: Array<{ index: number }>;
};

export type DetailPassExpectedOutput = {
  readonly matchedIndex: number;
};

export const detailPassPromptTemplate: PromptTemplate<DetailPassPromptInput> = {
  version: 'detail-v1',
  system:
    'You are selecting the single best matching API request from provided candidates. Return ONLY JSON: {"matchedIndex": number}. Do not return the candidate object.',
  buildUser: (input: DetailPassPromptInput) =>
    JSON.stringify({
      description: input.description,
      candidates: input.candidates,
      outputSchema: { matchedIndex: 'number' },
    }),
};

