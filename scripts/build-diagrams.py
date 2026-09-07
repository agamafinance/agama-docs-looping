#!/usr/bin/env python3
"""
Generate SVG diagrams for the Agama docs.

Run:  python3 scripts/build-diagrams.py
Outputs to:  public/diagrams/
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "diagrams"
OUT.mkdir(parents=True, exist_ok=True)

# Palette tuned to match the docs (dark petrol, mint-white text, semantic colors per actor)
BG = "#0D2B28"
TEXT = "#E6FEF4"
MUTED = "#9CA3AF"


def main():
    # NOTE: the architecture diagrams under public/images/ are hand-authored
    # SVGs, rendered to PNG with `rsvg-convert`, not generated from this script.
    print("nothing to build, no graphviz diagrams defined yet.")


if __name__ == "__main__":
    main()
