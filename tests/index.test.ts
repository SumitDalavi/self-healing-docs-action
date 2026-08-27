// import core removed
import { processDiff } from '../src/detection/diff';

jest.mock('@actions/core', () => ({
  getInput: jest.fn(),
  setOutput: jest.fn(),
  setFailed: jest.fn(),
  info: jest.fn(),
  warning: jest.fn()
}), { virtual: true });
jest.mock('@actions/github', () => ({}), { virtual: true });
jest.mock('../src/detection/diff');

// We need to test index.ts, but run() is called on import.
// We can just require the file inside a test.
describe('index', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.resetModules();
  });

  it('runs successfully with stale docs', async () => {
    (require('@actions/core').getInput as jest.Mock).mockImplementation((name) => {
      if (name === 'openai_api_key') return 'key';
      if (name === 'auto_merge') return 'true';
      return '';
    });
    
    (processDiff as jest.Mock).mockResolvedValue({
      isStale: true,
      reasoning: 'test',
      repairedContent: 'fixed'
    });

    jest.isolateModules(() => {
      require('../src/index');
    });

    // wait a bit for async run to finish
    await new Promise(resolve => setTimeout(resolve, 50));

    expect(require('@actions/core').setOutput).toHaveBeenCalledWith('stale_found', true);
  });

  it('runs successfully with non-stale docs and auto merge false', async () => {
    (require('@actions/core').getInput as jest.Mock).mockImplementation((name) => {
      if (name === 'openai_api_key') return 'key';
      if (name === 'auto_merge') return 'false';
      return '';
    });
    
    const { processDiff } = require('../src/detection/diff');
    (processDiff as jest.Mock).mockResolvedValue({
      isStale: false,
    });

    jest.isolateModules(() => {
      require('../src/index');
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(require('@actions/core').setOutput).toHaveBeenCalledWith('stale_found', false);
  });

  it('fails if no api key', async () => {
    (require('@actions/core').getInput as jest.Mock).mockReturnValue('');
    delete process.env.OPENAI_API_KEY;

    jest.isolateModules(() => {
      require('../src/index');
    });

    await new Promise(resolve => setTimeout(resolve, 50));

    expect(require('@actions/core').setFailed).toHaveBeenCalledWith('Missing OPENAI_API_KEY');
  });
});
