# build: require Python 3.10 and test installed wheels on Linux

The declared Python 3.8 minimum does not describe the tested install/import
behavior. Linux x86-64 dependency resolution with required wheels fails for 3.8
at Delta Lake. Python 3.9 resolves and installs those dependencies, then fails
importing the runtime union alias in `datarepo.core.tables.filters`.

Propose a Python 3.10 minimum and add a read-only wheel smoke workflow for 3.10
and 3.12 on Ubuntu 24.04. It includes the existing Node/npm static-catalog build,
installs the built wheel into a new venv, and uses `python -I` outside the checkout
to assert the module comes from site-packages and reads/filters local Parquet.
Polars and Delta Lake caps remain unchanged.

The independent branch wheel was built locally. Its installed-package smoke
passes on Python 3.10.20 and 3.12.3, returning IDs `[2,3]` and the expected schema.
This tests one Linux installation/read path; it does not certify other platforms,
all Python versions, or every backend. The new hosted workflow will exercise both
versions on this PR; its result is separate from the recorded local runs.

Base: `1749911db5112858f06ebc1f4b6e614c63ecddeb`; independent of D1 and D2.
Raising the Python minimum is a proposed support-policy change for maintainer
review. If 3.8/3.9 support is required, runtime typing and dependency compatibility
need a separate repair; the measured failure should not be hidden by the metadata.

Developed with AI assistance. Maintainer edits are enabled. This PR can be reviewed
after the independent correctness fix without blocking it.
