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