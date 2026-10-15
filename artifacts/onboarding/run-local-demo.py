"""Simplified orchestration example. Runs only this repository's offline demo.

No environment secrets, network requests, external actions or output files.
Subprocess failure propagates to the caller; stdout remains the demo's output.
"""
import argparse
from pathlib import Path
import subprocess
import sys


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("fixture", nargs="?", help="Optional JSON fixture path")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    command = ["npm", "run", "demo:onboarding"]
    if args.fixture:
        fixture = Path(args.fixture).resolve(strict=True)
        command.extend(["--", str(fixture)])
    try:
        return subprocess.run(command, cwd=root, check=False).returncode
    except FileNotFoundError:
        print("npm is required; install Node.js and run npm ci in the repository.", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
