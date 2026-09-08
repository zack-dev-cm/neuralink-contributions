#!/usr/bin/env python3
"""Run a local check and retain its command, exit status, timing and full output."""
import argparse
import datetime as dt
import json
import os
from pathlib import Path
import subprocess
import time

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("record", type=Path)
parser.add_argument("--cwd", type=Path, required=True)
parser.add_argument("--env", action="append", default=[])
parser.add_argument("command", nargs=argparse.REMAINDER)
args = parser.parse_args()
command = args.command
if command and command[0] == "--":
    command = command[1:]
if not command:
    parser.error("a command is required after --")
args.record.parent.mkdir(parents=True, exist_ok=True)
started = dt.datetime.now(dt.timezone.utc).isoformat()
env = os.environ.copy()
overrides = dict(item.split("=", 1) for item in args.env)
env.update(overrides)
start = time.monotonic()
with args.record.with_suffix(".log").open("w") as output:
    result = subprocess.run(command, cwd=args.cwd, env=env, stdout=output, stderr=subprocess.STDOUT)
receipt = {
    "command": command,
    "cwd": str(args.cwd.resolve()),
    "environment_overrides": overrides,
    "started_at": started,
    "duration_seconds": round(time.monotonic() - start, 3),
    "exit_code": result.returncode,
    "output": args.record.with_suffix(".log").name,
}
args.record.with_suffix(".json").write_text(json.dumps(receipt, indent=2) + "\n")
print(json.dumps(receipt, indent=2))
lines = args.record.with_suffix(".log").read_text(errors="replace").splitlines()
print("\n".join(lines[-60:]))
raise SystemExit(result.returncode)
