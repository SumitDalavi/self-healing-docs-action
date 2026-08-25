# Self-Healing Technical Documentation Action

> **A GitHub Action that monitors a codebase, detects when code changes make documentation inaccurate, identifies the specific stale sections, and automatically generates a PR with corrected docs or flags the discrepancies for human review.**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-green?logo=nodedotjs)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

---

## 🎯 The Problem This Solves

Technical documentation is often outdated the moment it's merged. When engineers push changes to code, it's very easy to forget to update the corresponding Markdown documentation.

This project lives inside a CI/CD pipeline and acts as a vigilant technical writer. By pairing OpenAI Embeddings to link code chunks to documentation chunks, and using LLMs to verify staleness, this Action catches documentation drift automatically and suggests the exact fixes right in the PR comments!

## 🏗️ Architecture

- **Language**: TypeScript 5.3 + Node.js 20 (GitHub Action compatible)
- **Embeddings**: `text-embedding-3-small` for building a semantic link graph between Code and Docs without needing a dedicated VectorDB.
- **Evaluation Engine**: LLM-as-a-judge (`gpt-4o-mini`) to perform Code vs Doc validation and propose the exact repaired content.
- **Git Integration**: Full integration with `@actions/github` to post automated comments and manage PR state based on doc health.

## 🚀 Quick Start

### 1. Add to your Workflow
Create a `.github/workflows/docs-health.yml` file in your repository:

```yaml
name: Self-Healing Docs Check
on:
  pull_request:
    paths:
      - 'src/**/*.ts'
      - 'src/**/*.js'

jobs:
  check-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run Self Healing Docs
        uses: SumitDalavi/self-healing-docs-action@main
        with:
          openai_api_key: ${{ secrets.OPENAI_API_KEY }}
          auto_merge: 'false'
```

### 2. How it works in a PR
1. The action extracts Git Diffs of the PR.
2. It uses embeddings to map the modified functions to relevant sections in your `/docs` folder.
3. The LLM judges if the doc is now stale given the specific diff.
4. If stale, it calculates the correct text and posts a PR comment with a diff highlighting what needs to be changed.

## 👨‍💻 Author

**Sumit Dalavi** — Senior DevSecOps / Platform Engineer  
[GitHub](https://github.com/SumitDalavi) · [LinkedIn](https://in.linkedin.com/in/sumit-dalavi-762838129)
