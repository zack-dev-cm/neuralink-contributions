#!/usr/bin/env python3
"""Copy an explicit evidence allowlist from the local implementation workspace.

Private planning files, outreach drafts, dependency trees and compiled AAC assets
are excluded. Original records remain unchanged. Public copies disclose path
redactions and retain hashes of both the original and published bytes.
"""
import argparse
import hashlib
import json
from pathlib import Path


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--workspace", type=Path, required=True)
    parser.add_argument("--out", type=Path, required=True)
    args = parser.parse_args()
    source, target = args.workspace.resolve(), args.out.resolve()
    target.mkdir(parents=True, exist_ok=False)
    selected = []
    for pattern in ("tools/*.py", "tools/*.cjs", "aac-audit/entry.js",
                    "review/D[123].patch", "review/D[123]_PR.md"):
        selected.extend(source.glob(pattern))
    evidence = {
        "D1-01": ["environment.json", "clickhouse.json", "requirements-linux-py312.lock"],
        "D1-02": ["baseline-installed.json", "baseline-installed.log", "baseline-installed.xml"],
        "D1-04": [f"{name}.{ext}" for name in
                  ["fixed-tests", "format", "lint-fatal", "types", "wheel-smoke", "wheel-build"]
                  for ext in ["json", "log"]] + ["fixed-tests.xml"],
        "D2-01": ["quickstart.json", "quickstart.log"],
        "D2-02": ["tests-final.json", "tests-final.log", "documented-command.json", "documented-command.log"],
        "D3-01": ["README.md", "runtime.in", "python39.lock", "python310.lock"] +
                  [f"{name}.{ext}" for name in ["python38-resolve", "python39-import", "python310-import"]
                   for ext in ["json", "log"]],
        "D3-03": [f"{name}.{ext}" for name in ["python310-final-smoke", "python312-final-smoke", "wheel-build"]
                  for ext in ["json", "log"]],
        "A-02": ["baselines.json"] +
                [f"{revision}-{browser}.json" for revision in ["stable", "development"]
                 for browser in ["chromium", "firefox"]] +
                [f"{name}.{ext}" for name in ["upstream-jest", "development-build", "install"]
                 for ext in ["json", "log"]],
        "B-workflow": ["README.md", "environment.json", "sources.json", "tests-reviewed.json",
                       "tests-reviewed.log", "tests-reviewed.xml", "clean-exercise-reviewed.json",
                       "old-tool-decision.json", "old-tool-decision.log"],
    }
    for directory, names in evidence.items():
        selected.extend(source / "evidence" / directory / name for name in names)
    for directory in ["evidence/B-workflow/clean-reviewed", "evidence/B-workflow/browser-reviewed",
                      "evidence/error-review-2026-09-08"]:
        selected.extend(p for p in (source / directory).rglob("*")
                        if p.is_file() and p.suffix != ".whl" and p.name != ".gitignore")
    selected.append(source / "review/ERROR_REVIEW_2026-09-08.md")
    selected.extend(p for p in (source / "publication/sectioncheck-ci").rglob("*")
                    if p.is_file() and p.suffix != ".whl")
    selected.append(source / "publication/sectioncheck-release/VALIDATION.json")
    copies = []
    for path in sorted(set(selected)):
        if path.is_symlink() or not path.is_file():
            raise ValueError(f"Expected a regular source file: {path}")
        relative = path.relative_to(source)
        original = path.read_bytes()
        public, changes = original, []
        try:
            value = original.decode("utf-8")
        except UnicodeDecodeError:
            pass
        else:
            for old, new, label in [(str(source), "/workspace", "workspace_path"),
                                    (str(source.parent), "/home/USER", "user_home_path")]:
                if old in value:
                    value = value.replace(old, new)
                    changes.append(label)
            public = value.encode("utf-8")
        destination = target / relative
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(public)
        copies.append({"path": relative.as_posix(), "original_sha256": hashlib.sha256(original).hexdigest(),
                       "public_sha256": hashlib.sha256(public).hexdigest(), "redactions": changes})
    (target / "PROVENANCE.json").write_text(json.dumps({
        "scope": "Curated public copies of local engineering evidence; not researcher acceptance",
        "redaction_policy": "Absolute workstation and user-home prefixes replaced; original records retained locally",
        "source_pack_sha256": "d5eab3eb03fdadec55eae09d442da4a953004af686589d13143cf9957585d877",
        "files": copies,
    }, indent=2) + "\n")
    print(json.dumps({"files_copied": len(copies), "redacted_files": sum(bool(x["redactions"]) for x in copies)}))


if __name__ == "__main__":
    main()
