# Decisions

## ADR-001: LLM-as-a-Judge for Documentation Drift
**Date:** 2026-08-29  
**Status:** Accepted

**Context:**  
Detecting documentation drift deterministically using diffs is impossible because docs explain *intent* rather than mirroring syntax.

**Decision:**  
We use `gpt-4o-mini` as an LLM judge. The embeddings map the code diff to the doc chunk, and the LLM determines if the doc chunk is still logically accurate given the code change.

**Consequences:**  
- ✅ Action can understand semantic drift (e.g. "We removed the retry loop").
- ⚠️ Vulnerable to LLM hallucinations; mitigated by outputting a PR comment for human review rather than auto-committing.

## ADR-002: Progressive Credential Loading (PCL) Architecture
- **Context:** Production hardening required live backends (PostgreSQL, Redis, OpenAI, Anthropic), but removing mocks would break CI pipelines and create high developer onboarding friction.
- **Decision:** Implement Progressive Credential Loading. Keep in-memory and local mock heuristics as the default safe baseline, while wrapping external integrations in auto-promoting factory adapters triggered by environment variables.
- **Consequences:** 
  - *Pros:* 100% CI pass rate without requiring external secrets; zero setup friction for new contributors; progressive upgrade to production clusters.
  - *Cons:* Adds lightweight factory abstraction layers and runtime credential detection logic.
