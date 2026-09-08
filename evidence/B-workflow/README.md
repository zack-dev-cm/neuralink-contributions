# SectionCheck synthetic workflow — continuation evidence

Current package: `0.2.0.dev0`. Formal researcher gates remain open.

| Evidence | Result |
| --- | --- |
| [tests-reviewed.log](tests-reviewed.log), [JUnit](tests-reviewed.xml) | 81 tests passed, zero failures/errors/skips |
| [clean exercise command](clean-exercise-reviewed.json), [protocol results](clean-reviewed/exercise.json) | Installed wheel under isolated Python, outside source checkout; positive and negative paths reproduced |
| [review report](clean-reviewed/review/report.html) | Six raster/ROI panels, check explanations, comparison table and input fingerprint |
| [exported ROIs](clean-reviewed/export/target-annotations.json), [receipt](clean-reviewed/export/receipt.json) | Two features, three polygon parts, one hole; independent coordinates and areas 2700/3775 match |
| [old-tool-decision.log](old-tool-decision.log) | Expected exit 2 after a real packaged-source update: previous approval is stale |
| [final browser record](browser-reviewed/browser.json) | Offline file URL, all six images, no desktop/390px overflow, no client errors or remote requests |
| [environment](environment.json) | Python 3.12.3, Shapely 2.1.2, GEOS 3.13.1; exact dependency versions and available license metadata |

The fixture's `automated-synthetic-exercise` alias is not a human identity or
researcher approval. Local profile re-import uses SectionCheck and GEOS validity;
external viewer re-import remains NOT RUN. One synthetic image pair is not a
sample of research specimens, and test counts are not usefulness measurements.

The original 30-test prototype evidence remains in `../B-synthetic/`. Initial
failed/intermediate runs remain here as diagnostics. Use the `reviewed` artifacts
above for the final version. `tests-first` contains the timestamp-validation
failure that was fixed; `old-tool-decision` is an intentional rejection. The
intermediate `clean-run` decision is now stale after the report source changed.
