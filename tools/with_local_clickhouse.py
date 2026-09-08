#!/usr/bin/env python3
"""Run checks against an isolated loopback-only ClickHouse, then stop it."""
import argparse
import os
from pathlib import Path
import socket
import subprocess
import time
from urllib.request import build_opener, ProxyHandler
from xml.sax.saxutils import escape

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--binary", type=Path, required=True)
parser.add_argument("--run-dir", type=Path, required=True)
parser.add_argument("command", nargs=argparse.REMAINDER)
args = parser.parse_args()
command = args.command[1:] if args.command[:1] == ["--"] else args.command
if not command:
    parser.error("a test command is required")
run = args.run_dir.resolve()
run.mkdir(parents=True, exist_ok=False)
with socket.socket() as s:
    s.bind(("127.0.0.1", 0))
    port = s.getsockname()[1]
(run / "users.xml").write_text("""<clickhouse>
  <profiles><default><max_threads>2</max_threads><max_memory_usage>1073741824</max_memory_usage></default></profiles>
  <users><default><password></password><networks><ip>127.0.0.1</ip></networks><profile>default</profile><quota>default</quota></default></users>
  <quotas><default><interval><duration>3600</duration><queries>0</queries><errors>0</errors><result_rows>0</result_rows><read_rows>0</read_rows><execution_time>0</execution_time></interval></default></quotas>
</clickhouse>\n""")
path = escape(str(run))
(run / "config.xml").write_text(f"""<clickhouse>
  <logger><level>warning</level><log>{path}/server.log</log><errorlog>{path}/error.log</errorlog><console>1</console></logger>
  <listen_host>127.0.0.1</listen_host><http_port>{port}</http_port>
  <path>{path}/data/</path><tmp_path>{path}/tmp/</tmp_path><user_files_path>{path}/user_files/</user_files_path>
  <users_config>{path}/users.xml</users_config><default_profile>default</default_profile><default_database>default</default_database>
  <max_server_memory_usage>4294967296</max_server_memory_usage><max_thread_pool_size>128</max_thread_pool_size>
  <background_pool_size>16</background_pool_size><background_schedule_pool_size>4</background_schedule_pool_size>
  <background_buffer_flush_schedule_pool_size>2</background_buffer_flush_schedule_pool_size>
  <background_message_broker_schedule_pool_size>2</background_message_broker_schedule_pool_size>
  <background_distributed_schedule_pool_size>2</background_distributed_schedule_pool_size>
  <mark_cache_size>33554432</mark_cache_size><uncompressed_cache_size>16777216</uncompressed_cache_size>
</clickhouse>\n""")
env = os.environ.copy()
env["DATAREPO_TEST_CLICKHOUSE_PORT"] = str(port)
env["POLARS_MAX_THREADS"] = "2"
opener = build_opener(ProxyHandler({}))
with (run / "process.log").open("w") as output:
    process = subprocess.Popen(
        [str(args.binary.resolve()), "server", "--config-file", str(run / "config.xml")],
        cwd=run, stdout=output, stderr=subprocess.STDOUT,
    )
    try:
        for _ in range(150):
            if process.poll() is not None:
                raise RuntimeError(f"ClickHouse exited with {process.returncode}; see {run / 'process.log'}")
            try:
                with opener.open(f"http://127.0.0.1:{port}/ping", timeout=0.5) as response:
                    if response.read() == b"Ok.\n":
                        break
            except OSError:
                pass
            time.sleep(0.2)
        else:
            raise RuntimeError("ClickHouse did not become ready")
        print(f"Disposable ClickHouse HTTP: 127.0.0.1:{port}", flush=True)
        code = subprocess.run(command, env=env, timeout=300).returncode
    finally:
        process.terminate()
        try:
            process.wait(timeout=20)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()
raise SystemExit(code)
