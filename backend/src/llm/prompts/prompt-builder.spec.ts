import { buildPrompt } from './prompt-builder';
import { narrowPassPromptTemplate } from './narrow-pass.prompt';
import { detailPassPromptTemplate } from './detail-pass.prompt';

describe('PromptBuilder', () => {
  it('builds narrow pass prompt with expected JSON keys', () => {
    const prompt = buildPrompt(narrowPassPromptTemplate, {
      description: 'find jokes',
      manifest: [{ index: 0, method: 'GET', sanitizedUrlPath: '/joke/Any', host: 'example.com', statusCode: 200 }],
      topK: 3,
    });
    const payload = JSON.parse(prompt.user) as Record<string, unknown>;
    expect(prompt.version).toBe('narrow-v1');
    expect(payload).toHaveProperty('description');
    expect(payload).toHaveProperty('entries');
    expect(payload).toHaveProperty('topK');
    expect(payload).toHaveProperty('outputSchema');
  });

  it('builds detail pass prompt with expected JSON keys', () => {
    const prompt = buildPrompt(detailPassPromptTemplate, {
      description: 'get jokes',
      candidates: [{ index: 1 }],
    });
    const payload = JSON.parse(prompt.user) as Record<string, unknown>;
    expect(prompt.version).toBe('detail-v1');
    expect(payload).toHaveProperty('description');
    expect(payload).toHaveProperty('candidates');
    expect(payload).toHaveProperty('outputSchema');
  });
});

