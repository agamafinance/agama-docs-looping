# Agama Protocol — Documentation

Documentation for the [Agama Protocol](https://agama.fi), a decentralized lending and borrowing protocol for Brazilian Real World Assets (RWA) on Rayls. Architecturally mirrored from [RAAC Protocol](https://docs.raac.io/).

## Local development

### Prerequisites

- Python 3.9+

### Run the docs

```bash
python3 -m venv .venv
.venv/bin/pip install mkdocs-material pymdown-extensions
.venv/bin/mkdocs serve --dev-addr localhost:3003
```

Visit http://localhost:3003

### Build static site

```bash
.venv/bin/mkdocs build
```

Output: `_site/`

## Structure

```
content/
├── index.md                    # Landing
├── overview/                   # Positioning, actors, glossary
├── core/                       # Core V1 specification
│   ├── lending-pool/
│   ├── stability-pool/
│   ├── settlement-vault/
│   ├── adapters/
│   ├── tokens/
│   ├── compliance/
│   ├── collectors/
│   ├── governance.md
│   └── appendix/
├── parameters.md
├── challenges.md               # Self-critical design review
├── security/                   # Invariants, audits, bug bounty
└── integrate/                  # Guides for issuers/devs/institutions

mkdocs.yml                      # Navigation + theme config
```

## License

TBD.
