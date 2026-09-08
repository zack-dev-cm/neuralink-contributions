# Datarepo reproduction

The three submitted commits are independent children of upstream
`1749911db5112858f06ebc1f4b6e614c63ecddeb`:

| Branch | Commit | PR |
| --- | --- | --- |
| `fix/clickhouse-null-filters` | `66fd1d372c9c2d390e52f541c18457da597cc0c2` | [57](https://github.com/neuralinkcorp/datarepo/pull/57) |
| `docs/local-quickstart` | `ec6b19441c9ebe8abd8dd8a4eef3d42f71aa0927` | [58](https://github.com/neuralinkcorp/datarepo/pull/58) |
| `ci/installed-wheel-smoke` | `ed8bdeba5deb66a6421360632745711f73eee5d6` | [59](https://github.com/neuralinkcorp/datarepo/pull/59) |

The original local runs used Ubuntu 24.04.4 x86-64 and Python 3.12.3. Full
environment metadata and exact hashes are in [D1-01](evidence/D1-01/environment.json).
Node/npm are required by the upstream package's static-catalog build.

From this evidence repository, with Python 3.12, Node 22 and uv installed:

```bash
git clone --branch fix/clickhouse-null-filters https://github.com/zack-dev-cm/datarepo.git datarepo
git -C datarepo checkout 66fd1d372c9c2d390e52f541c18457da597cc0c2
uv venv --python 3.12 .venv
uv pip sync --python .venv/bin/python --require-hashes evidence/D1-01/requirements-linux-py312.lock
uv pip install --python .venv/bin/python --no-deps -e datarepo
```

For all 135 tests, obtain the standalone Linux amd64 ClickHouse executable from
the [official 26.3.32.14 LTS release](https://github.com/ClickHouse/ClickHouse/releases/tag/v26.3.32.14-lts).
Verify the archive and executable against [the recorded SHA-256 values](evidence/D1-01/clickhouse.json).
Then run, replacing `/path/to/clickhouse` with that executable:

```bash
cd datarepo
AWS_EC2_METADATA_DISABLED=true python3 ../tools/with_local_clickhouse.py \
  --binary /path/to/clickhouse --run-dir ../local-clickhouse-run \
  -- ../.venv/bin/python -m pytest test -v -s
```

The run directory must be new. The wrapper starts and stops its own disposable
loopback-only server. It allows 4 GiB server memory, 1 GiB per query and two query
threads. Tests create and remove a uniquely named synthetic Memory table.
Without a backend port, the five integration tests explicitly skip; such a run
must not be described as the complete 135-test backend validation.

The four-row fixture is `(1,NULL), (2,10), (3,NULL), (4,20)`. Expected IDs are
`[1,3]` for IS NULL, `[2,4]` for IS NOT NULL, `[1]` for NULL AND id=1,
`[1,2,3]` for NULL OR id=2, and all four IDs for no filters. The imported upstream
baseline has 20 expected failures and 115 passes; the patch has 135 passes and
zero skips. Tests are against the imported implementation, not a copied query
builder.

D2 includes its runnable `docs/examples/local_quickstart.py` and two regression
tests. D3 includes `scripts/smoke_installed_wheel.py` and a read-only Python
3.10/3.12 workflow. Inspect their individual branches and [PR descriptions](review/)
for the exact scope. The [independent hosted workflow](.github/workflows/datarepo.yml)
repeats all three contribution checks at the commit IDs above; it does not replace
the upstream repository's required review and CI approval.
