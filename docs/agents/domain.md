# Domain Docs

## Before exploring, read these

- **`../rentals-be/GLOSSARY.md`**: the domain vocabulary is owned by the backend. When this repo is opened alone
  and that path is missing, use the glossary on GitHub: `gh api repos/Enzo-cam/rentals-be/contents/GLOSSARY.md --jq .content | base64 -d`.
- **`docs/adr/`** in this repo: frontend decisions (UI, routing, rendering).
- **`docs/agents/invariants.md`**: frontend invariants (`INV-FE-xx`).

If any of these files don't exist, **proceed silently**.

## Use the glossary's vocabulary

Screens, components, routes and test names use the glossary terms (Reserva, Artículo, Bloqueo, Hoja del fin de
semana…). Don't drift to synonyms the glossary avoids.

## Flag ADR conflicts

If your output contradicts an existing ADR here or in `rentals-be`, surface it explicitly rather than silently
overriding.
