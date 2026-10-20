# Changelog

## [0.2.0] - 2026-10-20
### Added
- **Progressive Credential Loading (PCL):** Dynamic auto-promotion between zero-dependency mock fallbacks and live production backends based on environment credentials.
- **Dual Distribution:** Universal OCI container publishing to GitHub Container Registry (`ghcr.io/sumitdalavi/self-healing-docs-action`) and Helm OCI registries alongside GitHub Release tarballs.
- **Health Reporting:** Exposed `/health` or `/healthz` endpoint with PCL status detection (`mock` vs `live`).
- **Dynamic Reloading:** Support for atomic ConfigMap / secret reloads without requiring pod restarts.
- **Supply Chain Security:** Trivy vulnerability scan gates and SPDX JSON SBOM (`sbom.spdx.json`) generation for all releases.
- **Marketplace & NPM Package Distribution:** Added GitHub Actions Marketplace metadata branding (icon: 'file-text', color: 'blue') and scoped package publishing to GitHub Packages npm Registry (`@sumitdalavi/self-healing-docs-action`).

## [0.1.0] - 2026-10-18
### Added
- Initial baseline service implementation, unit test suites, and CI workflows.

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
