# Licenses and provenance

Original evidence summaries and independent Python/report tooling are provided
under [Apache-2.0](LICENSE). The datarepo patch files modify Apache-2.0 source;
the [upstream license](https://github.com/neuralinkcorp/datarepo/blob/1749911db5112858f06ebc1f4b6e614c63ecddeb/LICENSE.md)
and notices remain in the public fork.

`aac-audit/entry.js`, `tools/build_aac_audit.cjs` and
`tools/audit_aac_browser.cjs` form the diagnostic harness for AsTeRICS Grid and
are provided under [AGPL-3.0](licenses/AGPL-3.0.txt). Upstream source is fetched
from the pinned public commits during reproduction. Compiled application code,
fonts, symbols, speech assets and upstream documentation are not distributed in
this evidence bundle. Those materials retain their respective upstream licenses.

The standalone SectionCheck repository contains its Apache-2.0 license, authored
synthetic fixtures and dependency lock. Its dependencies retain their own
licenses. No real patient, research specimen or AAC user data is included.

The original 3D scenes and media in `showcase/` use Apache-2.0. Their bundled
Three.js renderer, controls and exporter retain the MIT notice in
`showcase/vendor/THREE-LICENSE.txt`. The procedural score generator and canvas
readback comparison adapt MIT-licensed Vehicle Lab work; its notice is retained
in `showcase/vendor/VEHICLE-LAB-LICENSE.txt`. The new score uses oscillators and
seeded noise without imported recordings. Fixture sources and display-only
geometry choices are documented in `showcase/data/provenance.json` and
`showcase/README.md`; each film has source and output hashes in its capture receipt.

The supplied planning archive is identified by hash in `PROVENANCE.json` and is
not redistributed here. This publication does not assert ownership of Neuralink,
AsTeRICS, VALIS or QuPath names or assets and does not imply their endorsement.
