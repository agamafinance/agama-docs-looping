#!/usr/bin/env python3
"""
Generate SVG diagrams for the Agama docs.

Run:  python3 scripts/build-diagrams.py
Outputs to:  public/diagrams/
"""
from pathlib import Path
from graphviz import Digraph

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "diagrams"
OUT.mkdir(parents=True, exist_ok=True)

# Palette tuned to match the docs (dark petrol, mint-white text, semantic colors per actor)
BG = "#0D2B28"
TEXT = "#E6FEF4"
MUTED = "#9CA3AF"

# Wide horizontal banners / state panels
BANNER_BG = "#2E322F"
PANEL_BG = "#2E322F"

# Per-actor colors (darker variants for fills, lighter for borders)
ALICE_FILL = "#5C2A2A"
ALICE_BORDER = "#9F4A4A"
LP_FILL = "#5C3A2A"
LP_BORDER = "#A06B45"
SP_FILL = "#3A2E5C"
SP_BORDER = "#7062B0"
SV_FILL = "#1F4744"
SV_BORDER = "#3F8480"
AMFI_FILL = "#6E4A12"
AMFI_BORDER = "#C18A2B"
RF_FILL = "#2A3E70"
RF_BORDER = "#5878B5"

EDGE_COLOR = "#5A6660"


def _wrap_html(content):
    """Compose an HTML label with a wrapping HTML-syntax marker."""
    return f"<{content}>"


def _banner_label(text):
    """A wide, full-width phase banner."""
    return _wrap_html(
        f'<TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="6" WIDTH="640">'
        f'<TR><TD ALIGN="LEFT" WIDTH="630"><FONT COLOR="{TEXT}" POINT-SIZE="13"><B>{text}</B></FONT></TD></TR>'
        f"</TABLE>"
    )


def _panel_label(title, lines):
    """A wide, full-width state panel with a title and bullet-style lines."""
    rows = [
        f'<TR><TD ALIGN="LEFT" WIDTH="630"><FONT COLOR="{TEXT}" POINT-SIZE="12"><B>{title}</B></FONT></TD></TR>'
    ]
    for line in lines:
        rows.append(
            f'<TR><TD ALIGN="LEFT" WIDTH="630"><FONT COLOR="{MUTED}" POINT-SIZE="11">{line}</FONT></TD></TR>'
        )
    return _wrap_html(
        f'<TABLE BORDER="0" CELLBORDER="0" CELLSPACING="2" CELLPADDING="4" WIDTH="640">'
        + "".join(rows)
        + "</TABLE>"
    )


def _split_label():
    return _wrap_html(
        f'<TABLE BORDER="0" CELLBORDER="0" CELLSPACING="6" CELLPADDING="4" WIDTH="640">'
        f'<TR><TD COLSPAN="4" ALIGN="LEFT" WIDTH="630">'
        f'<FONT COLOR="{TEXT}" POINT-SIZE="12"><B>LiquidationSplit applied (200 / 300 / 9500 / 0 bps)</B></FONT>'
        f"</TD></TR>"
        f"<TR>"
        f'<TD ALIGN="LEFT"><FONT COLOR="{MUTED}" POINT-SIZE="10">Treasury</FONT></TD>'
        f'<TD ALIGN="LEFT"><FONT COLOR="{MUTED}" POINT-SIZE="10">Reserve Fund</FONT></TD>'
        f'<TD ALIGN="LEFT"><FONT COLOR="{MUTED}" POINT-SIZE="10">Redemption queue</FONT></TD>'
        f'<TD ALIGN="LEFT"><FONT COLOR="{MUTED}" POINT-SIZE="10">In-kind</FONT></TD>'
        f"</TR>"
        f"<TR>"
        f'<TD ALIGN="LEFT"><FONT COLOR="{TEXT}" POINT-SIZE="11">20k AMFI</FONT></TD>'
        f'<TD ALIGN="LEFT"><FONT COLOR="{TEXT}" POINT-SIZE="11">30k AMFI</FONT></TD>'
        f'<TD ALIGN="LEFT"><FONT COLOR="{TEXT}" POINT-SIZE="11">950k AMFI</FONT></TD>'
        f'<TD ALIGN="LEFT"><FONT COLOR="{TEXT}" POINT-SIZE="11">0 (V2)</FONT></TD>'
        f"</TR>"
        f"</TABLE>"
    )


def _entity_label(title, lines, title_size=12, line_size=10):
    rows = [
        f'<TR><TD ALIGN="CENTER"><FONT COLOR="{TEXT}" POINT-SIZE="{title_size}"><B>{title}</B></FONT></TD></TR>'
    ]
    for line in lines:
        rows.append(
            f'<TR><TD ALIGN="CENTER"><FONT COLOR="{TEXT}" POINT-SIZE="{line_size}">{line}</FONT></TD></TR>'
        )
    return _wrap_html(
        '<TABLE BORDER="0" CELLBORDER="0" CELLSPACING="2" CELLPADDING="3">' + "".join(rows) + "</TABLE>"
    )


def liquidation_flow():
    g = Digraph("liquidation_flow", format="svg")
    g.attr(
        rankdir="TB",
        bgcolor=BG,
        fontname="Helvetica",
        nodesep="0.4",
        ranksep="0.45",
        pad="0.4",
        splines="polyline",
    )
    g.attr(
        "node",
        shape="box",
        style="filled,rounded",
        fontname="Helvetica",
        fontcolor=TEXT,
        margin="0.18,0.10",
        penwidth="1.2",
    )
    g.attr(
        "edge",
        color=EDGE_COLOR,
        arrowhead="vee",
        arrowsize="0.6",
        fontname="Helvetica",
        fontsize="10",
        fontcolor=MUTED,
        penwidth="1.0",
    )

    # Setup (plain, muted, full-width)
    setup_html = _wrap_html(
        f'<TABLE BORDER="0" CELLBORDER="0" CELLSPACING="2" CELLPADDING="2" WIDTH="640">'
        f'<TR><TD ALIGN="LEFT" WIDTH="630"><FONT COLOR="{MUTED}" POINT-SIZE="11"><B>Setup</B></FONT></TD></TR>'
        f'<TR><TD ALIGN="LEFT"><FONT COLOR="{MUTED}" POINT-SIZE="10">Alice deposited 1M AMFI at $1.00, borrowed 700k USDr (70% LTV).</FONT></TD></TR>'
        f'<TR><TD ALIGN="LEFT"><FONT COLOR="{MUTED}" POINT-SIZE="10">Senior tranche marks down to $0.80. HF = (1M × 0.80 × 80%) / 700k = 0.914.</FONT></TD></TR>'
        f"</TABLE>"
    )
    g.node("setup", label=setup_html, shape="plain")

    # PHASE 1 ─────────────────────────────────────────────────
    g.node(
        "p1_banner",
        label=_banner_label("Phase 1 — Trigger (T = 0)"),
        fillcolor=BANNER_BG,
        color=BANNER_BG,
        penwidth="0",
    )
    g.node(
        "alice",
        label=_entity_label("Alice's position", ["HF = 0.914, liquidatable"], 12, 10),
        fillcolor=ALICE_FILL,
        color=ALICE_BORDER,
    )
    g.node(
        "grace",
        label=_wrap_html(f'<FONT COLOR="{MUTED}" POINT-SIZE="10">72h grace period — Alice may repay to cure</FONT>'),
        shape="plain",
    )

    # PHASE 2 ─────────────────────────────────────────────────
    g.node(
        "p2_banner",
        label=_banner_label("Phase 2 — Finalize (T = 72h, instant on-chain)"),
        fillcolor=BANNER_BG,
        color=BANNER_BG,
        penwidth="0",
    )
    g.node(
        "lp",
        label=_entity_label("Lending Pool", ["debt burned (700k)", "lenders untouched"]),
        fillcolor=LP_FILL,
        color=LP_BORDER,
    )
    g.node(
        "sp1",
        label=_entity_label("Stability Pool", ["burns 700k agTOKEN", "agaSP value dips"]),
        fillcolor=SP_FILL,
        color=SP_BORDER,
    )
    g.node(
        "sv",
        label=_entity_label("Settlement Vault", ["receives 1M AMFI", "splits per policy"]),
        fillcolor=SV_FILL,
        color=SV_BORDER,
    )
    g.node(
        "split",
        label=_split_label(),
        fillcolor=PANEL_BG,
        color=PANEL_BG,
        penwidth="0",
    )
    g.node(
        "state2",
        label=_panel_label(
            "State after Phase 2",
            [
                "Alice — debt wiped, collateral gone",
                "Pure lender (Bob, no SP) — agTOKEN whole, unaffected",
                "Staked Bob — agaSP value down 700k, holds claim on AMFI in custody",
            ],
        ),
        fillcolor=PANEL_BG,
        color=PANEL_BG,
        penwidth="0",
    )

    # ~15 days note
    g.node(
        "days",
        label=_wrap_html(f'<FONT COLOR="{MUTED}" POINT-SIZE="10">~15 days off-chain</FONT>'),
        shape="plain",
    )

    # PHASE 3 ─────────────────────────────────────────────────
    g.node(
        "p3_banner",
        label=_banner_label("Phase 3 — Settle (T = 15 days)"),
        fillcolor=BANNER_BG,
        color=BANNER_BG,
        penwidth="0",
    )
    g.node(
        "amfi",
        label=_entity_label(
            "AmFi off-chain redemption",
            ["950k × $0.80 × (1 − 0.5%) = 757k USDr"],
            12,
            10,
        ),
        fillcolor=AMFI_FILL,
        color=AMFI_BORDER,
    )
    g.node(
        "settle",
        label=_entity_label(
            "settleRedemption(757k)",
            ["routed per ExcessPolicy"],
            12,
            10,
        ),
        fillcolor=SV_FILL,
        color=SV_BORDER,
    )
    g.node(
        "sp2",
        label=_entity_label(
            "Stability Pool (peg restored)",
            ["700k USDr → depositOnBehalf", "re-mints 700k agTOKEN"],
        ),
        fillcolor=SP_FILL,
        color=SP_BORDER,
    )
    g.node(
        "rf",
        label=_entity_label(
            "Reserve Fund",
            ["+ 57k USDr (excess)", "+ 30k AMFI (from Phase 2)"],
        ),
        fillcolor=RF_FILL,
        color=RF_BORDER,
    )
    g.node(
        "final",
        label=_panel_label(
            "Final state",
            [
                "Alice — debt wiped, collateral gone",
                "Pure lender (Bob, no SP) — unaffected throughout",
                "Staked Bob — agaSP back to peg, share of 57k bonus pro-rata",
                "Protocol — 20k AMFI Treasury + 30k AMFI + 57k USDr Reserve Fund, solvent",
            ],
        ),
        fillcolor=PANEL_BG,
        color=PANEL_BG,
        penwidth="0",
    )

    # Edges (top-down ordering)
    g.edge("setup", "p1_banner", style="invis")
    g.edge("p1_banner", "alice", style="invis")
    g.edge("alice", "grace", arrowhead="none")
    g.edge("grace", "p2_banner")

    # Same-rank trio in Phase 2
    with g.subgraph() as s:
        s.attr(rank="same")
        s.edge("lp", "sp1", style="invis")
        s.edge("sp1", "sv", style="invis")
    g.edge("p2_banner", "lp", style="invis")
    g.edge("p2_banner", "sp1", style="invis")
    g.edge("p2_banner", "sv", style="invis")

    # Phase 2 → split (only the SP carries collateral down)
    g.edge("sp1", "split", label="collateral")
    g.edge("lp", "split", style="invis")
    g.edge("sv", "split", style="invis")

    g.edge("split", "state2", style="invis")
    g.edge("state2", "days", arrowhead="none")
    g.edge("days", "p3_banner")

    g.edge("p3_banner", "amfi", style="invis")
    g.edge("amfi", "settle")

    # Same-rank pair for Phase 3 outputs
    with g.subgraph() as s:
        s.attr(rank="same")
        s.edge("sp2", "rf", style="invis")
    g.edge("settle", "sp2")
    g.edge("settle", "rf")

    g.edge("sp2", "final", style="invis")
    g.edge("rf", "final", style="invis")

    out_path = OUT / "liquidation-flow"
    g.render(str(out_path), cleanup=True)
    print(f"wrote {out_path}.svg")


def main():
    # NOTE: liquidation-flow.svg is currently hand-crafted (see public/diagrams/).
    # Re-enable the line below only if you want to regenerate it from this script.
    # liquidation_flow()
    print("nothing to build — liquidation-flow.svg is hand-crafted; edit this script to enable.")


if __name__ == "__main__":
    main()
