import { checkStaleness, repairDoc } from '../src/utils/llm';

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn().mockImplementation(async (opts) => {
          if (opts.messages[1].content.includes('STALE DOC')) {
             if (opts.messages[1].content.includes('error-repair')) {
                 return { choices: [{ message: { content: null } }] };
             }
             return { choices: [{ message: { content: '{"repaired_doc": "fixed doc"}' } }] };
          } else {
             if (opts.messages[1].content.includes('error-stale')) {
                 return { choices: [{ message: { content: null } }] };
             }
             return { choices: [{ message: { content: '{"isStale": true, "reasoning": "r"}' } }] };
          }
        })
      }
    }
  }));
});

describe('LLM Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('checks staleness', async () => {
    const res = await checkStaleness('old', 'new', 'doc');
    expect(res.isStale).toBe(true);
    expect(res.reasoning).toBe('r');
  });

  it('checks staleness fallback', async () => {
    const res = await checkStaleness('old', 'error-stale', 'doc');
    expect(res.isStale).toBe(false);
  });

  it('repairs doc', async () => {
    const res = await repairDoc('stale', 'new', 'r');
    expect(res).toBe('fixed doc');
  });

  it('repairs doc fallback', async () => {
    const res = await repairDoc('error-repair', 'new', 'r');
    expect(res).toBe('error-repair');
  });
});
