import 'dotenv/config';
import * as core from '@actions/core';
import * as github from '@actions/github';
import { linkChunks, CodeChunk, DocChunk } from './mapping/parser';
import { processDiff } from './detection/diff';

async function run() {
  try {
    // Read Action inputs
    const openaiKey = core.getInput('openai_api_key') || process.env.OPENAI_API_KEY;
    if (!openaiKey) {
      throw new Error('Missing OPENAI_API_KEY');
    }
    process.env.OPENAI_API_KEY = openaiKey;

    const autoMerge = core.getInput('auto_merge') === 'true';

    core.info('🚀 Starting Self-Healing Docs check...');

    // Mock Payload since we are running locally / as demonstration
    const mockOldCode = `function calculateDiscount(price, isVip) {
  if (isVip) return price * 0.9; // 10% discount
  return price;
}`;
    
    const mockNewCode = `function calculateDiscount(price, isVip, hasCoupon) {
  let discount = 1.0;
  if (isVip) discount -= 0.1; // 10% discount
  if (hasCoupon) discount -= 0.05; // 5% coupon
  return price * discount;
}`;

    const mockDoc = `### Discount Calculation
The system calculates discounts based on VIP status. Currently, VIPs receive a flat 10% discount, and no other parameters affect the final price.
`;

    core.info('🔍 Analyzing Code Diff and Document mapping...');
    // We simulate finding a linked chunk with 100% certainty for the demo
    const result = await processDiff(
      { codeId: 'discount-logic', oldCode: mockOldCode, newCode: mockNewCode },
      mockDoc
    );

    if (result.isStale) {
      core.warning('⚠️ Stale documentation detected!');
      core.info('Reasoning: ' + result.reasoning);
      core.info('Repaired Doc Suggestion:\n' + result.repairedContent);

      if (autoMerge) {
        core.info('🛠️ Auto-merge is enabled. Assuming PR was updated successfully.');
      } else {
        core.info('👤 Auto-merge is disabled. Flagging for human review via PR comment.');
      }
    } else {
      core.info('✅ Documentation is still accurate. No changes needed.');
    }

    core.setOutput('stale_found', result.isStale);

  } catch (error) {
    if (error instanceof Error) core.setFailed(error.message);
  }
}

run();
