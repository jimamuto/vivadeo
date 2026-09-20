"""Run Jev Ultrafast from the Vivadeo repository."""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from jev_ultrafast import Agent


def run_agent(args, *, screenshots: bool):
    last = None
    with Agent(args.url, args.goal, record_dir=args.record_dir, screenshots=screenshots) as agent:
        for last in agent.run():
            pass
    return last


def is_screenshot_timeout(error: Exception) -> bool:
    message = repr(error).lower()
    return "capturescreenshot" in message and "timed out" in message


def main() -> int:
    if not os.environ.get("TYPESAFE_API_KEY") and os.environ.get("VIVADEO_JEV_API_KEY"):
        os.environ["TYPESAFE_API_KEY"] = os.environ["VIVADEO_JEV_API_KEY"]
    if not os.environ.get("TEXT_MODEL_API_KEY") and os.environ.get("VIVADEO_JEV_TEXT_MODEL_API_KEY"):
        os.environ["TEXT_MODEL_API_KEY"] = os.environ["VIVADEO_JEV_TEXT_MODEL_API_KEY"]
    parser = argparse.ArgumentParser(description="Run Jev Ultrafast from Vivadeo")
    parser.add_argument("--url", required=True)
    parser.add_argument("--goal", required=True)
    parser.add_argument("--record-dir", type=Path)
    parser.add_argument("--screenshots", action="store_true")
    args = parser.parse_args()

    try:
        last = run_agent(args, screenshots=args.screenshots)
    except Exception as error:
        # CDP screenshot capture is diagnostic only. A slow or contended
        # browser harness must not prevent the actual click flow from running.
        if not args.screenshots or not is_screenshot_timeout(error):
            raise
        print(
            "JEV screenshot capture timed out; retrying without screenshots.",
            file=sys.stderr,
        )
        last = run_agent(args, screenshots=False)
    if last is None:
        raise RuntimeError("Jev produced no final state")
    print(json.dumps({key: value for key, value in last.items() if key != "screenshot"}, default=str))
    return 0 if last.get("status") == "done" else 1


if __name__ == "__main__":
    raise SystemExit(main())
