import { getEmbedding, computeSimilarity } from '../src/utils/embeddings';

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    embeddings: {
      create: jest.fn().mockResolvedValue({
        data: [{ embedding: [0.1, 0.2] }]
      })
    }
  }));
});

jest.mock('cosine-similarity', () => {
  return jest.fn().mockImplementation((a, b) => {
    if (a[0] === 0) return 0;
    return 0.8;
  });
});

describe('Embeddings Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('gets embedding', async () => {
    const emb = await getEmbedding('text');
    expect(emb).toEqual([0.1, 0.2]);
  });

  it('computes similarity', () => {
    const sim = computeSimilarity([0.1], [0.2]);
    expect(sim).toBe(0.8);
  });

  it('computes similarity fallback', () => {
    // using mock branch a[0]===0 to return falsy
    const sim = computeSimilarity([0], [0.2]);
    expect(sim).toBe(0);
  });
});
