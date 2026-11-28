"""Parse our generated show output with the real ntc-templates TextFSM parsers (CLAUDE.md rule 3).

Reads test-results/output-cases.json (written by src/core/output/output.test.ts with
OUTPUT_CASES=1) and fails if any case doesn't parse into exactly the fields the simulator meant.
Run: npm run test:outputs
"""
import json
import sys
from pathlib import Path

import textfsm

ROOT = Path(__file__).resolve().parent.parent
cases = json.loads((ROOT / "test-results/output-cases.json").read_text())
failures = 0
by_command = {}
for c in cases:
    with open(ROOT / "reference/outputs" / c["template"]) as t:
        fsm = textfsm.TextFSM(t)
    rows = fsm.ParseText(c["text"] + "\n")
    got = [dict(zip([h.lower() for h in fsm.header], r)) for r in rows]
    want = [{k: v for k, v in rec.items()} for rec in c["expected"]]
    # Compare only the fields we state; the parser may return more.
    trimmed = [{k: g.get(k) for k in w} for g, w in zip(got, want)]
    ok = len(got) == len(want) and trimmed == want
    by_command.setdefault(c["command"], [0, 0])[0 if ok else 1] += 1
    if not ok:
        failures += 1
        if failures <= 5:
            print(f"MISMATCH {c['command']} (seed {c['seed']})")
            print(c["text"])
            print("expected:", json.dumps(want, indent=1)[:2000])
            print("parsed:  ", json.dumps(got, indent=1)[:2000])
for cmd, (ok, bad) in sorted(by_command.items()):
    print(f"{cmd}: {ok} parsed correctly, {bad} wrong")
sys.exit(1 if failures else 0)
