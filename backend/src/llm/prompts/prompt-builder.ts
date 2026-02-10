export type ChatPrompt = {
  readonly system: string;
  readonly user: string;
  readonly version: string;
};

export type PromptTemplate<TInput> = {
  readonly version: string;
  readonly system: string;
  readonly buildUser: (input: TInput) => string;
};

export const buildPrompt = <TInput>(
  template: PromptTemplate<TInput>,
  input: TInput,
): ChatPrompt => {
  return {
    version: template.version,
    system: template.system,
    user: template.buildUser(input),
  };
};
