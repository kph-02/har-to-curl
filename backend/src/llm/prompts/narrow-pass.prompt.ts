import type { PromptTemplate } from './prompt-builder';

export type NarrowPassPromptInput = {
  readonly description: string;
  readonly manifest: unknown[];
  readonly topK: number;
};

export type NarrowPassExpectedOutput = {
  readonly topCandidates: number[];
};

export const narrowPassPromptTemplate: PromptTemplate<NarrowPassPromptInput> = {
  version: 'narrow-v1',
  system:
    'You select the most relevant API request indices from a list. Return JSON only.',
  buildUser: (input: NarrowPassPromptInput) =>
    JSON.stringify({
      description: input.description,
      entries: input.manifest,
      topK: input.topK,
      outputSchema: { topCandidates: 'number[]' },
    }),
};

