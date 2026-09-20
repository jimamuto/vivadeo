"""Run Jev Ultrafast from the Vivadeo repository."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

from jev_ultrafast import Agent


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

    last = None
    with Agent(args.url, args.goal, record_dir=args.record_dir, screenshots=args.screenshots) as agent:
        for last in agent.run():
            pass
    if last is None:
        raise RuntimeError("Jev produced no final state")
    print(json.dumps({key: value for key, value in last.items() if key != "screenshot"}, default=str))
    return 0 if last.get("status") == "done" else 1


if __name__ == "__main__":
    raise SystemExit(main())
