#!/usr/bin/env python3
"""
Smart Command Memory - Local Agent
Captures shell commands and sends them to the backend.
"""
import argparse
import json
import os
import platform
import socket
import sys
import time
import urllib.request
import urllib.error

DEFAULT_ENDPOINT = "http://localhost:8000/api/commands/ingest"


def send_command(
    command: str,
    shell: str,
    exit_code: int | None = None,
    duration_ms: int | None = None,
    cwd: str | None = None,
    endpoint: str = DEFAULT_ENDPOINT,
):
    hostname = socket.gethostname()
    username = os.getenv("USER") or os.getenv("USERNAME") or "unknown"
    os_name = f"{platform.system()} {platform.release()}"

    payload = {
        "command": command,
        "shell": shell,
        "hostname": hostname,
        "username": username,
        "os": os_name,
        "cwd": cwd or os.getcwd(),
        "exit_code": exit_code,
        "duration_ms": duration_ms,
        "command_type": "script" if any(command.endswith(ext) for ext in [".sh", ".ps1", ".py", ".bat"]) else "command",
    }

    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        endpoint,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib.request.urlopen(req, timeout=5) as resp:
            if resp.status == 200:
                return True
    except (urllib.error.URLError, OSError):
        # Silently fail - don't interrupt the user's workflow
        pass
    return False


def main():
    parser = argparse.ArgumentParser(description="Send a command to Smart Command Memory")
    parser.add_argument("command", help="The command that was executed")
    parser.add_argument("--shell", default="bash", help="Shell type (bash, zsh, powershell)")
    parser.add_argument("--exit-code", type=int, default=None, help="Exit code")
    parser.add_argument("--duration", type=int, default=None, help="Duration in ms")
    parser.add_argument("--cwd", default=None, help="Working directory")
    parser.add_argument("--endpoint", default=DEFAULT_ENDPOINT, help="Backend URL")

    args = parser.parse_args()

    success = send_command(
        command=args.command,
        shell=args.shell,
        exit_code=args.exit_code,
        duration_ms=args.duration,
        cwd=args.cwd,
        endpoint=args.endpoint,
    )

    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
