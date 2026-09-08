# Error review — 8 September 2026

Four reproducible errors in SectionCheck 0.2.0.dev0 were fixed in
[`c11ee36`](https://github.com/zack-dev-cm/sectioncheck/commit/c11ee36b86b62f5d73ace0d5029900db1c24cb08),
version 0.2.1.dev0. The review also inspected the three submitted datarepo diffs,
AAC diagnostic source and the publication evidence. No new defect was identified
in the submitted datarepo changes or the scoped AAC diagnostic.

| Priority | Confirmed error in 0.2.0 | Correction and regression |
| --- | --- | --- |
| P2 | An image named `source.png` could be a FIFO. Opening it without a writer blocked the CLI indefinitely, before a structured rejection. | File descriptors are opened without blocking, verified as regular files and read with a hard byte limit. A subprocess regression requires exit 2, no traceback and no report. |
| P2 | A calibration value such as the JSON integer `10**400` passed the schema but raised an uncaught `OverflowError` during NumPy conversion. | Both calibration vectors are explicitly converted and checked for finite positive values. Source and target overflow cases produce structured rejection. |
| P2 | A last matrix row such as `[1e-12, 0, 1]` passed the affine tolerance, while point mapping ignored the projective term. | Matrices require the exact affine row `[0, 0, 1]`. Three noncanonical-row regressions reject these inputs rather than silently changing their interpretation. |
| P2 | Valid full-resolution ROIs could be wholly or partly outside the supplied preview crop, with no ROI-specific visibility warning or acknowledgment. | Source/target preview coverage is explicit, affected ROI IDs are recorded and incomplete coverage requires its own acknowledgment. Tests cover partial clipping, completely invisible ROIs and a covering crop without false warnings. |

[The released-wheel reproductions](../evidence/error-review-2026-09-08/released-defects.json)
record the hang, traceback and silently accepted cases. Nine added
regression/coverage cases failed against the old implementation. The corrected
suite passes **90 tests**, including all 81 existing tests. The
[regression source](https://github.com/zack-dev-cm/sectioncheck/blob/c11ee36b86b62f5d73ace0d5029900db1c24cb08/tests/test_review_regressions.py)
is included in the public implementation.

The [clean installed-wheel exercise](../evidence/error-review-2026-09-08/wheel-exercise.json)
passes review, explicit synthetic decisions, export and local re-import, including
negative paths and independent expected geometry. An actual 0.2.0 decision is
[rejected by 0.2.1](../evidence/error-review-2026-09-08/old-decision.log), with no
output directory created. The [browser record](../evidence/error-review-2026-09-08/browser/browser.json)
checks all six report images offline, desktop and 390-pixel width, with no
overflow, script errors or remote requests.

The D2 quick start was additionally run with the actual PyPI `data-repository`
0.1.0 wheel in a fresh environment and isolated Python outside the checkout.
It [produced the documented supplier join](../evidence/error-review-2026-09-08/datarepo-pypi-quickstart.log).
The datarepo source commits remain unchanged from their passing independent
hosted validation; upstream review and fork-workflow approval remain pending.

The corrected release requires a new report and decision. Preview acknowledgment
records a visibility limitation; it does not prove the unseen geometry was
inspected. Researcher acceptance, VALIS integration, external-viewer compatibility
and AAC user trials remain unvalidated.
