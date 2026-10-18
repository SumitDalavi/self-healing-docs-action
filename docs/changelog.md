# Changelog

## [v0.1.0] — 2026-10-18
### Added
- Automated GitHub Actions release pipeline triggered on `v*.*.*` git tags (`.github/workflows/release.yml`).
- Standalone distribution packaging with `@vercel/ncc` (`action-dist.tar.gz`).
- Fallback container image packaging (`ghcr.io/sumitdalavi/self-healing-docs-action`).
- Vulnerability scanning via Aqua Security Trivy (`aquasecurity/trivy-action@v0.36.0`).
- SPDX-format Software Bill of Materials (SBOM) generation step (`anchore/sbom-action@v0`).
- Automated GitHub release publishing attaching action bundle and `sbom.spdx.json` via `softprops/action-gh-release@v2`.

## [2026-08-29] — Phase 2 Evidence
### Added
- Created `tests/e2e/test_github_action.sh` to simulate a GitHub Action PR run.
- Standardized documentation (`runbook.md`, `decisions.md`, `ARCHITECTURE.md`).
- Added maturity badge and mock boundaries to `README.md`.
