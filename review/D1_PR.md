# fix(clickhouse): preserve null predicates and reject unsupported filters

`Filter("x", "is null", None)` and `is not null` currently disappear from
ClickHouse queries. On the four-row fixture `(1,NULL), (2,10), (3,NULL), (4,20)`,
an `IS NULL` query returns all four rows instead of `[1,3]`. Dropping a predicate
can either widen an AND query or narrow an OR query.

Add direct unary predicates that do not evaluate `Filter.value`, and raise
`ValueError` for unsupported operators before constructing a backend client.
The existing comparison, list, LIKE-alias, empty-group, and invalid-column
behavior is preserved.

Validation on Ubuntu 24.04.4 x86-64, Python 3.12.3, clickhouse-connect 1.8.0 and
local ClickHouse 26.3.32.14:

- Actual imported baseline: 20 expected failures (17 query regressions and 3
  incorrect backend results), 115 passes, zero skips.
- Patched checkout: 135 passes, zero skips, including 93 existing tests, 37 new
  query/behavior regressions and 5 local-backend cases.
- IS NULL `[1,3]`; IS NOT NULL `[2,4]`; NULL AND id=1 `[1]`; NULL OR id=2
  `[1,2,3]`; no filters `[1,2,3,4]`.
- Black, fatal Flake8 checks and mypy pass. A built wheel installs and reads a
  local table in a clean environment outside the checkout with `python -I`.

Integration tests run only when `DATAREPO_TEST_CLICKHOUSE_PORT` is set. They
connect to loopback and create/drop one uniquely named synthetic Memory table;
an explicitly requested but unavailable backend fails. Without that variable,
the five integration cases are explicitly skipped.

Base: `1749911db5112858f06ebc1f4b6e614c63ecddeb`. This small change can be reconciled
with [the broader integration PR #43](https://github.com/neuralinkcorp/datarepo/pull/43)
without adopting its backend migration. It does not replace
[the query-builder work #9](https://github.com/neuralinkcorp/datarepo/pull/9).
The branch is based on the current upstream `main` and can be reviewed independently.
The five real-backend tests are opt-in; the existing hosted test command runs the
remaining tests without requiring a ClickHouse service. Hosted results will be
reported separately from the local backend evidence.

Developed with AI assistance. This change uses the public implementation and
synthetic data; internal-fork coverage is unknown. Maintainer edits are enabled.

Independent hosted verification of this exact submitted commit [passed](https://github.com/zack-dev-cm/neuralink-contributions/actions/runs/34191476771) on Ubuntu 24.04. 135 tests pass with a disposable real ClickHouse and zero skips; Black, fatal Flake8 checks and mypy also pass. This is evidence from the contributor repository; upstream required CI remains subject to maintainer approval.
