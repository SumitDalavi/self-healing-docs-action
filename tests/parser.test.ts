import { linkChunks } from '../src/mapping/parser';
import * as embeddings from '../src/utils/embeddings';

jest.mock('../src/utils/embeddings');

describe('Parser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('links chunks based on similarity', async () => {
    (embeddings.getEmbedding as jest.Mock).mockResolvedValue([0.1]);
    (embeddings.computeSimilarity as jest.Mock).mockReturnValueOnce(0.9).mockReturnValueOnce(0.5);

    const codeChunks = [{ id: 'c1', content: 'code' }];
    const docChunks = [
      { id: 'd1', heading: 'h1', content: 'doc1' },
      { id: 'd2', heading: 'h2', content: 'doc2' },
    ];

    const mapping = await linkChunks(codeChunks, docChunks);
    expect(mapping.get('c1')).toEqual(['d1']);
  });

  it('uses existing embeddings if present', async () => {
    (embeddings.getEmbedding as jest.Mock).mockResolvedValue([0.1]);
    (embeddings.computeSimilarity as jest.Mock).mockReturnValue(0.9);

    const codeChunks = [{ id: 'c1', content: 'code', embedding: [0.1] }];
    const docChunks = [
      { id: 'd1', heading: 'h1', content: 'doc1', embedding: [0.2] },
    ];

    await linkChunks(codeChunks, docChunks);
    expect(embeddings.getEmbedding).not.toHaveBeenCalled();
  });
});
