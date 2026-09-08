# AAC search visibility diagnostic

The released and development versions return vocabulary items through search
that the actual grid renderer hides at the active vocabulary level. At level 8,
the renderer shows only the synthetic `eight` item; search also returns `ten`.
The fixture additionally probes unrestricted vocabulary, a local level toggle,
manual hiding and unchanged source grid data.

This harness imports actual upstream component methods. It does not copy the
search algorithm or claim full-app keyboard, speech, assistive-device, pilot or
user-trial coverage. Online and offline here mean the same loaded local fixture
with the browser context's network availability toggled.

| Upstream baseline | Chromium | Firefox |
| --- | --- | --- |
| Released `0e3fe7624989688c7877b4ffa75804db060e5c57` | [Record](../evidence/A-02/stable-chromium.json) | [Record](../evidence/A-02/stable-firefox.json) |
| Development `4696c6e38acc13e77f2acfb929e3fd915ff8db35` | [Record](../evidence/A-02/development-chromium.json) | [Record](../evidence/A-02/development-firefox.json) |

[Baselines and source hashes](../evidence/A-02/baselines.json) pin the source and
the release tag. The development baseline also passed all 49 upstream Jest tests
and its production build; see [test output](../evidence/A-02/upstream-jest.log) and
[build output](../evidence/A-02/development-build.log).

## Reproduce on Linux

From the root of this evidence repository, with Node 22, npm, Python 3 and Google
Chrome installed at `/usr/bin/google-chrome`:

```bash
git clone https://github.com/asterics/Asterics-AAC.git asterics-aac
git -C asterics-aac checkout 4696c6e38acc13e77f2acfb929e3fd915ff8db35
git -C asterics-aac worktree add ../asterics-aac-stable 0e3fe7624989688c7877b4ffa75804db060e5c57
cd asterics-aac
HUSKY=0 npx --yes yarn@1.22.22 install --frozen-lockfile --non-interactive
cd ..
ln -s ../asterics-aac/node_modules asterics-aac-stable/node_modules
npm install --prefix .browser --no-save --package-lock=false playwright@1.57.0
.browser/node_modules/.bin/playwright install firefox
node tools/build_aac_audit.cjs asterics-aac aac-audit/development
node tools/build_aac_audit.cjs asterics-aac-stable aac-audit/stable
python3 -m http.server 18872 --bind 127.0.0.1
```

Keep that local server running. In a second terminal, from the same directory:

```bash
export PLAYWRIGHT_MODULE="$PWD/.browser/node_modules/playwright"
node tools/audit_aac_browser.cjs chromium stable
node tools/audit_aac_browser.cjs firefox stable
node tools/audit_aac_browser.cjs chromium development
node tools/audit_aac_browser.cjs firefox development
```

Use a separate clone to reproduce: the audit commands replace the corresponding
browser JSON records. They are designed to reproduce the existing mismatch and
fail if upstream behavior changes. Generated bundles and upstream assets remain
local and retain their upstream licenses.

The [pinned contribution guide](https://github.com/asterics/Asterics-AAC/blob/4696c6e38acc13e77f2acfb929e3fd915ff8db35/docs/documentation_dev/collaboration.md)
states that fully AI-generated PRs are not reviewed. This AI-assisted diagnostic
is published transparently in this independent repository. An agreed task,
human-led contribution and consenting adult collaborator remain pending; no AAC
PR or person-facing pilot is claimed.
