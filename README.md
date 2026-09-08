# Independent contribution implementations and evidence

Three focused datarepo pull requests, a source-based AAC diagnostic, and a
synthetic registration-review prototype. Developed with AI assistance. This
independent project is not affiliated with or endorsed by Neuralink, AsTeRICS,
VALIS or QuPath.

[![Explore the datarepo query explanation in 3D](showcase/media/datarepo-preview.gif)](https://zack-dev-cm.github.io/docs/neural-engineering/studio.html?project=datarepo)

[Explore datarepo in 3D](https://zack-dev-cm.github.io/docs/neural-engineering/studio.html?project=datarepo) · [SectionCheck in 3D](https://zack-dev-cm.github.io/docs/neural-engineering/studio.html?project=sectioncheck) · [Films, GIFs, models and reproduction](showcase/README.md). The animated examples follow synthetic source fixtures; model depth and part dimensions are illustrative.

| Contribution | Public work | Verified evidence |
| --- | --- | --- |
| D1: ClickHouse null filters | [PR #57](https://github.com/neuralinkcorp/datarepo/pull/57) · [patch](review/D1.patch) | [135 tests pass with an actual local ClickHouse, zero skips](evidence/D1-04/fixed-tests.log); baseline has 20 expected failures |
| D2: Local quick start | [PR #58](https://github.com/neuralinkcorp/datarepo/pull/58) · [patch](review/D2.patch) | [Two documentation/schema/join tests pass](evidence/D2-02/tests-final.log) |
| D3: Python support and wheels | [PR #59](https://github.com/neuralinkcorp/datarepo/pull/59) · [patch](review/D3.patch) | Python 3.8 wheel resolution and 3.9 import fail; [3.10](evidence/D3-03/python310-final-smoke.json) and [3.12](evidence/D3-03/python312-final-smoke.json) installed-wheel reads pass |
| AAC: Search visibility mismatch | [Diagnostic source and reproduction](aac-audit/README.md) | Real released/development component methods reproduce the mismatch in Chromium and Firefox, online and offline |
| SectionCheck 0.2.1.dev0 | [Source](https://github.com/zack-dev-cm/sectioncheck) · [Prerelease](https://github.com/zack-dev-cm/sectioncheck/releases/tag/v0.2.1.dev0) · [Live synthetic report](https://zack-dev-cm.github.io/sectioncheck/) | [90 hosted tests and a fresh installed-wheel exercise pass](https://github.com/zack-dev-cm/sectioncheck/actions/runs/34193783979) |

The datarepo branches are independent, each based on upstream
`1749911db5112858f06ebc1f4b6e614c63ecddeb`. Maintainer edits are enabled on all
three PRs. The support minimum in D3 is a proposal for maintainer review.

[Independent datarepo CI passed](https://github.com/zack-dev-cm/neuralink-contributions/actions/runs/34191476771)
for the exact submitted commits: 135 real-backend tests with zero skips, quality
checks, two quick-start tests and installed wheels on Python 3.10/3.12. Its results are separate from upstream's
required checks, which initially require a maintainer to approve fork workflows.
Upstream approval and merge are not implied by publication or by our own CI.

The [error review](review/ERROR_REVIEW_2026-09-08.md) corrected four SectionCheck
input/geometry/preview issues. Version 0.2.1 requires a fresh report and decision;
old decisions are rejected as stale. Earlier release files remain unchanged.

## Reproduce and inspect

- [Datarepo environment, local ClickHouse and wheel reproduction](DATAREPO.md)
- [AAC source fixture, pinned upstream commits and browser commands](aac-audit/README.md)
- [SectionCheck coordinate/ROI contract and commands](https://github.com/zack-dev-cm/sectioncheck/blob/main/WORKFLOW.md)
- [Error review and four verified corrections](review/ERROR_REVIEW_2026-09-08.md)
- [Current SectionCheck hosted evidence](evidence/error-review-2026-09-08/hosted-verification.json)
- [Historical 0.2.0 workflow evidence](evidence/B-workflow/README.md)
- [Current wheel and report verification](evidence/error-review-2026-09-08/hosted-verification.json)
- [Public-source provenance and redactions](PROVENANCE.json)
- [Licenses and third-party boundaries](NOTICE.md)

`SHA256SUMS` covers the published files. Run `sha256sum --check SHA256SUMS` from
this directory after downloading a source or release archive.

The original local logs remain intact. Published copies replace workstation
paths with `/workspace` and `/home/USER`; the provenance record contains both
original and public hashes. Those replacements are location placeholders, not
reproduction commands. Private planning material, unsent outreach drafts, caches,
ClickHouse binaries and compiled AAC assets are not part of this repository.

## Delivery boundaries

D1's defined engineering gate is met. The other six collaboration/research gates
remain open. The AAC diagnostic is not an app patch, user trial, speech or keyboard
test. The upstream contribution guide requires a human-led contribution route.

SectionCheck accepts one authored synthetic image pair and its documented pixel
ROI profile. Its automated decisions are explicitly labeled as automation.
Researcher acceptance, authorized research data, a VALIS adapter, external-viewer
re-import and demonstrated usefulness remain unconfirmed or NOT RUN. Publishing
this prerelease does not complete those research delivery gates.

No employer adoption, clinical capability, job application or employment outcome
is claimed.
