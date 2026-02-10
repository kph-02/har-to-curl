import {
  Injectable,
  BadRequestException,
  UnprocessableEntityException,
  BadGatewayException,
} from '@nestjs/common';
import OpenAI from 'openai';
import { AppConfig } from '../shared/config/app.config';
import { SessionStoreService } from '../shared/session-store.service';
import { RedactionService } from './redaction.service';
import { ParsedRequest } from '../shared/models/parsed-request.model';
import { CurlBuilderService } from '../shared/services/curl-builder.service';
import { HarEntry } from '../shared/models/har-entry.model';
import { buildPrompt } from './prompts/prompt-builder';
import {
  narrowPassPromptTemplate,
  type NarrowPassExpectedOutput,
} from './prompts/narrow-pass.prompt';
import {
  detailPassPromptTemplate,
  type DetailPassExpectedOutput,
} from './prompts/detail-pass.prompt';

type NarrowPassResponse = {
  topCandidates: number[];
};

type DetailPassResponse = {
  matchedIndex: number;
};

@Injectable()
export class LlmService {
  private readonly client = new OpenAI({ apiKey: AppConfig.openai.apiKey });

  constructor(
    private readonly sessionStore: SessionStoreService,
    private readonly redactionService: RedactionService,
    private readonly curlBuilder: CurlBuilderService,
  ) {}

  async analyzeSession(params: {
    sessionId: string;
    description: string;
    selectedIndices?: number[];
  }): Promise<{ matchedEntryIndex: number; parsedRequest: ParsedRequest; curlCommand: string }> {
    const { sessionId, description, selectedIndices } = params;
    const allEntries: HarEntry[] | null = this.sessionStore.get(sessionId);
    if (!allEntries) {
      throw new BadRequestException('Your session has expired. Please re-upload your .har file.');
    }
    const { entries: filteredEntries, originalIndices } = this.filterEntriesByIndices(
      allEntries,
      selectedIndices,
    );
    if (filteredEntries.length === 0) {
      throw new BadRequestException('No entries available for analysis. Please re-upload and try again.');
    }
    const matchedEntryIndex: number = await this.selectMatchedIndex(
      filteredEntries,
      description,
    );
    const matchedEntry: HarEntry | undefined = filteredEntries[matchedEntryIndex];
    if (!matchedEntry) {
      throw new UnprocessableEntityException(
        'Could not determine a match. Try refining your description or selecting specific entries.',
      );
    }
    const resultIndex: number = originalIndices[matchedEntryIndex] ?? matchedEntryIndex;
    const parsedRequest: ParsedRequest = this.buildParsedRequest(matchedEntry);
    const curlCommand: string = this.curlBuilder.buildCurl(parsedRequest);
    return { matchedEntryIndex: resultIndex, parsedRequest, curlCommand };
  }

  private filterEntriesByIndices(
    entries: HarEntry[],
    selectedIndices?: number[],
  ): { entries: HarEntry[]; originalIndices: number[] } {
    if (!selectedIndices || selectedIndices.length === 0) {
      return { entries, originalIndices: entries.map((_, index) => index) };
    }
    const indicesSet: Set<number> = new Set<number>(selectedIndices);
    const scopedEntries: HarEntry[] = [];
    const originalIndices: number[] = [];
    entries.forEach((entry, index) => {
      if (indicesSet.has(index)) {
        scopedEntries.push(entry);
        originalIndices.push(index);
      }
    });
    if (scopedEntries.length !== selectedIndices.length) {
      throw new BadRequestException(
        'One or more selected entries are invalid. Please refresh and try again.',
      );
    }
    return { entries: scopedEntries, originalIndices };
  }

  private async selectMatchedIndex(entries: HarEntry[], description: string): Promise<number> {
    const useTwoPass: boolean = entries.length > AppConfig.llm.singlePassThreshold;
    if (!useTwoPass) {
      const candidateIndices = entries.map((_, index) => index);
      const candidates = this.redactionService.redactForDetailPass(
        entries,
        candidateIndices,
      );
      return this.runDetailPass(description, candidates);
    }
    const manifest = this.redactionService.sanitizeForNarrowPass(entries);
    const topCandidates: number[] = await this.runNarrowPass(description, manifest);
    const candidates = this.redactionService.redactForDetailPass(entries, topCandidates);
    return this.runDetailPass(description, candidates);
  }

  private async runNarrowPass(description: string, manifest: unknown[]): Promise<number[]> {
    const prompt = buildPrompt(narrowPassPromptTemplate, {
      description,
      manifest,
      topK: AppConfig.llm.topKCandidates,
    });
    const response = await this.callOpenAiWithRetries<NarrowPassExpectedOutput>({
      system: prompt.system,
      user: prompt.user,
      validate: (data: NarrowPassExpectedOutput) =>
        Array.isArray(data.topCandidates) && data.topCandidates.length > 0,
    });
    const bounded = response.topCandidates.filter((index) => index >= 0 && index < manifest.length);
    const unique = Array.from(new Set(bounded));
    if (unique.length === 0) {
      throw new UnprocessableEntityException(
        'Could not determine a match. Try refining your description or selecting specific entries.',
      );
    }
    return unique.slice(0, AppConfig.llm.topKCandidates);
  }

  private async runDetailPass(description: string, candidates: Array<{ index: number }>): Promise<number> {
    const prompt = buildPrompt(detailPassPromptTemplate, { description, candidates });
    const response = await this.callOpenAiWithRetries<DetailPassExpectedOutput>({
      system: prompt.system,
      user: prompt.user,
      validate: (data: DetailPassExpectedOutput) =>
        typeof data.matchedIndex === 'number' && Number.isInteger(data.matchedIndex),
    });
    const candidateIndices = candidates.map((candidate) => candidate.index);
    const matchedIndex: number | undefined =
      typeof response.matchedIndex === 'number'
        ? response.matchedIndex
        : typeof (response as unknown as { index?: number }).index === 'number'
          ? (response as unknown as { index: number }).index
          : undefined;
    if (matchedIndex === undefined || !candidateIndices.includes(matchedIndex)) {
      throw new UnprocessableEntityException(
        'Could not determine a match. Try refining your description or selecting specific entries.',
      );
    }
    return matchedIndex;
  }

  private async callOpenAiWithRetries<T>(params: {
    system: string;
    user: string;
    validate: (data: T) => boolean;
  }): Promise<T> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= AppConfig.llm.maxRetries; attempt++) {
      try {
        const completion = await this.client.chat.completions.create({
          model: AppConfig.openai.model,
          messages: [
            { role: 'system', content: params.system },
            { role: 'user', content: params.user },
          ],
          response_format: { type: 'json_object' },
        });
        const content = completion.choices[0]?.message?.content;
        if (!content) {
          throw new Error('Empty response from LLM');
        }
        const parsed = JSON.parse(content) as T;
        const isValid: boolean = params.validate(parsed);
        if (!isValid) {
          throw new Error('Invalid response shape from LLM');
        }
        return parsed;
      } catch (err) {
        if (err instanceof UnprocessableEntityException || err instanceof BadRequestException) {
          throw err;
        }
        lastError = err instanceof Error ? err : new Error('Unknown LLM error');
      }
    }
    if (lastError) {
      throw new UnprocessableEntityException(
        'Could not determine a match. Try refining your description or selecting specific entries.',
      );
    }
    throw new BadGatewayException('Unable to analyze the request at this time.');
  }

  private buildParsedRequest(entry: HarEntry): ParsedRequest {
    const headers: Record<string, string> = {};
    for (const header of entry.request.headers) {
      headers[header.name] = header.value;
    }
    const queryParams: Record<string, string> = {};
    for (const param of entry.request.queryString) {
      queryParams[param.name] = param.value;
    }
    const body = entry.request.postData?.text;
    return {
      method: entry.request.method,
      url: entry.request.url,
      headers,
      queryParams,
      body,
    };
  }
}
