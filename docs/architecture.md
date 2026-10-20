# Architecture — self-healing-docs-action
> Last updated: 2026-08-29 | Maturity: Partial Prototype
> _GitHub Action for semantic documentation staleness checking._

## System Diagram
```mermaid
flowchart TD
    PR(["GitHub PR Event"])
    Action["GitHub Action"]
    Embed["Embeddings (Vector Search)"]
    Judge["LLM Judge"]
    Comment["PR Comment"]

    PR -->|"Extract Diffs"| Action
    Action -->|"Find related docs"| Embed
    Embed -.->|"Top N Docs"| Action
    Action -->|"Analyze drift"| Judge
    Judge -.->|"Stale! Here is fix."| Action
    Action --> Comment
```

## Component Table
| Component | File | Responsibility | Tech |
|---|---|---|---|
| Runner | `src/main.ts` | Entrypoint | TypeScript |
| Embeddings | `src/embeddings.ts` | Maps code diffs to docs | OpenAI |
| Agent | `src/agent.ts` | Evaluates staleness | LLM |

## Dependency Honesty Table
| Dependency | Status | Notes |
|---|---|---|
| `@actions/github` | **Real** | Actually interfaces with GitHub API. |
| OpenAI APIs | **Stubbed** | Uses mock responses in test environment. |


## Component Breakdown
- **Core Technology**: TypeScript, ChromaDB, OpenAI, GitHub Actions
- **Design Paradigm**: Emphasizes high availability, fault tolerance, and security.

## Progressive Credential Loading & Production Architecture (v0.2.0)

This service implements the **Progressive Credential Loading (PCL)** pattern, decoupling development speed from external infrastructure provisioning:

```mermaid
graph LR
    Env[Environment Credentials] -->|Detect Keys & URLs| Detector[Credential Detector]
    Detector -->|No Credentials / Missing| Mock[Mock Mode Factory]
    Detector -->|Valid Credentials Present| Live[Live Provider Factory]
    Mock --> Runtime[Application Core & /health]
    Live --> Runtime
```

### Core Architecture Components
1. **Mode Detection Singleton:** Inspects environment configuration at boot time without hard crashes on missing secrets.
2. **Dual-Mode Factory Wrappers:**
   - **Storage / Cache:** In-process maps or SQLite `:memory:` transparently promote to managed Redis or PostgreSQL when connection strings are supplied.
   - **AI Providers:** Deterministic heuristic generators and local embeddings transparently promote to live OpenAI, Anthropic, or Gemini API clients.
3. **Hot-Reload & Dynamic TLS:** File watchers monitor mounted volume paths (Kubernetes ConfigMaps and Secrets) to update certificates and limit configs atomically without process restarts.
4. **Health & Observability:** The `/health` endpoint exposes real-time runtime mode metadata (`mock` vs `live`) across all backing adapters.
