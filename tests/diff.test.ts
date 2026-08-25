import { processDiff } from '../src/detection/diff';

jest.mock('../src/utils/llm', () => ({
  checkStaleness: jest.fn().mockResolvedValue({ isStale: true, reasoning: 'Mock stale reason' }),
  repairDoc: jest.fn().mockResolvedValue('Mock repaired doc')
}));

describe('Diff Processor', () => {
  it('should flag stale doc and return repaired text', async () => {
    const res = await processDiff(
      { codeId: 'c1', oldCode: 'old', newCode: 'new' },
      'old doc'
    );
    expect(res.isStale).toBe(true);
    expect(res.repairedContent).toBe('Mock repaired doc');
  });
});
