# Self-Healing Technical Documentation Action

[![CI Pipeline](https://github.com/SumitDalavi/self-healing-docs-action/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/SumitDalavi/self-healing-docs-action/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/SumitDalavi/self-healing-docs-action?color=0969da&label=release&logo=github)](https://github.com/SumitDalavi/self-healing-docs-action/releases)
[![Release Workflow](https://github.com/SumitDalavi/self-healing-docs-action/actions/workflows/release.yml/badge.svg)](https://github.com/SumitDalavi/self-healing-docs-action/actions/workflows/release.yml)
[![GHCR Container](https://img.shields.io/badge/ghcr.io-v0.2.0-blue?logo=docker&logoColor=white)](https://github.com/SumitDalavi/self-healing-docs-action/pkgs/container/self-healing-docs-action)
[![npm package](https://img.shields.io/badge/npm-%40sumitdalavi-cb3837?logo=npm&logoColor=white)](https://github.com/SumitDalavi/self-healing-docs-action/packages)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org)
[![SBOM](https://img.shields.io/badge/SBOM-SPDX%202.3-blueviolet?logo=spdx)](https://github.com/SumitDalavi/self-healing-docs-action/releases/tag/v0.2.0)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

> **Maturity:** Functional Prototype
> _A GitHub Action that monitors a codebase, detects when code changes make documentation inaccurate, identifies the specific stale sections, and automatically generates a PR with corrected docs or flags the discrepancies for human review._

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

### NPM Package Installation
```bash
# Configure npm for GitHub Packages
npm config set @sumitdalavi:registry https://npm.pkg.github.com
npm install @sumitdalavi/self-healing-docs-action
```

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
        uses: SumitDalavi/self-healing-docs-action@v0.2.0
        with:
          openai_api_key: ${{ secrets.OPENAI_API_KEY }}
          auto_merge: 'false'
```

### 2. How it works in a PR
1. The action extracts Git Diffs of the PR.
2. It uses embeddings to map the modified functions to relevant sections in your `/docs` folder.
3. The LLM judges if the doc is now stale given the specific diff.
4. If stale, it calculates the correct text and posts a PR comment with a diff highlighting what needs to be changed.

## Mock Boundaries (Honest Scope)

| What | Status | Details |
|---|---|---|
| Embeddings Graph | **Real** | Semantic mapping between code and docs works. |
| LLM Judge | **Real/Mocked** | Can use real OpenAI API or mock stub for CI. |
| GitHub API | **Real** | Uses `@actions/github` to post real PR comments. |

## 🔒 Release & Security Verification

Every tagged release (
*.*.*) triggers an automated DevSecOps release workflow:
1. **Automated Testing:** Runs 
pm test and TypeScript typechecking (	sc --noEmit).
2. **Action Packaging:** Bundles the production runner using @vercel/ncc into ction-dist.tar.gz.
3. **Container Image Build:** Builds the fallback action container image (ghcr.io/sumitdalavi/self-healing-docs-action:<tag>).
4. **Vulnerability Scanning:** Scans the container image using [Aqua Security Trivy](https://github.com/aquasecurity/trivy-action) for HIGH and CRITICAL CVEs.
5. **SBOM Generation:** Generates a Software Bill of Materials (SBOM) in SPDX JSON format (sbom.spdx.json) using [Anchore Syft](https://github.com/anchore/sbom-action).
6. **GitHub Release Publishing:** Packages release notes and attaches ction-dist.tar.gz and sbom.spdx.json as release assets.

## 🚀 Progressive Credential Loading & Execution Tiers

This project implements **Progressive Credential Loading (PCL)**, allowing it to run immediately out-of-the-box without external dependencies while seamlessly upgrading as credentials are provided.

### Tier 1: Zero-Config Mock Mode (Default)
Ideal for CI, testing, and rapid local evaluation.
- **Execution:** Run with default configuration (`cp .env.example .env`). Zero API keys, databases, or cloud credentials required.
- **Fallback Behavior:** In-memory caches, deterministic offline heuristics, mock vector embeddings, and local mock storage are automatically used.
- **Health Verification:** Endpoints report `{"mode": "mock"}` for unconfigured dependencies.

### Tier 2: Local Development with Live Services
Connect specific external services while keeping others mocked.
- **Execution:** Provide credentials in `.env` for the services you want active (e.g., `OPENAI_API_KEY, GITHUB_TOKEN`).
- **Progressive Upgrade:** The runtime inspects environment variables on boot and dynamically promotes only configured modules to live mode.
- **Safe Fallback:** Any missing credentials automatically remain on mock fallbacks with no crashes or missing service errors.

### Tier 3: Production Hardened
Enterprise deployment with production-grade backends, security scans, and container distributions.
- **OCI Container Image:** Pre-built, multi-arch image on GitHub Container Registry:
  ```bash
  docker pull ghcr.io/sumitdalavi/self-healing-docs-action:v0.2.0
  ```
- **Production Orchestration:** Mount secrets via Kubernetes Secrets or cloud secret managers with atomic config reload support.
- **Release Verification:** Checksums and SPDX SBOM available on [GitHub Releases](https://github.com/SumitDalavi/self-healing-docs-action/releases).

## 🔒 Release & Security Verification

Every tagged release (`v*.*.*`) triggers an automated DevSecOps release workflow:
1. **Automated Testing:** Runs test suite gates before build.
2. **Container Image Build:** Builds production container image (`ghcr.io/sumitdalavi/self-healing-docs-action:<tag>`).
3. **Vulnerability Scanning:** Scans the image using [Aqua Security Trivy](https://github.com/aquasecurity/trivy-action) for `HIGH` and `CRITICAL` CVEs.
4. **SBOM Generation:** Generates a Software Bill of Materials (SBOM) in SPDX JSON format (`sbom.spdx.json`) using [Anchore Syft](https://github.com/anchore/sbom-action).
5. **GitHub Release Publishing:** Packages release notes and attaches `sbom.spdx.json` as a verifiable supply-chain asset.

### Verifying Releases via GitHub CLI
```bash
# View release details
gh release view v0.2.0 --repo SumitDalavi/self-healing-docs-action

# Download and verify SBOM
gh release download v0.2.0 --repo SumitDalavi/self-healing-docs-action --pattern "sbom.spdx.json"
cat sbom.spdx.json | jq .
```

## 📚 Documentation

- [Architecture](docs/ARCHITECTURE.md) — System diagram and component details
- [Runbook](docs/runbook.md) — Setup, commands, and expected outputs
- [Decisions](docs/decisions.md) — ADRs for LLM as a Judge
- [Changelog](docs/changelog.md) — Change history

## 👨‍💻 Author

**Sumit Dalavi** — Senior DevSecOps / Platform Engineer  
[GitHub](https://github.com/SumitDalavi) | [LinkedIn](https://in.linkedin.com/in/sumit-dalavi-762838129)

---
*Built with a focus on robust patterns, not toy demos.*

