# Vivadeo design system foundation

This folder contains the shared visual foundation for Vivadeo. It is intentionally small: tokens first, component extraction only when a pattern has a repeated product meaning.

## Token layers

Use tokens in this order:

1. **Brand primitives**: `--color-oxblood`, `--color-tan`, `--color-grain`, `--color-blackboard`.
2. **Neutral primitives**: cream and ink values.
3. **Semantic tokens**: `--color-background`, `--color-surface`, `--color-content`, `--color-action`, `--color-danger`, and related roles.
4. **Dimension tokens**: `--space-*`, `--font-size-*`, `--radius-*`, `--shadow-*`, and layout values.

Prefer semantic tokens in components. Use brand primitives only for intentional brand expression, not for generic borders or text.

## Current migration contract

`web/app/globals.css` still contains the existing screen-level classes and imports `tokens.css`. The backward-compatible aliases (`--bg`, `--text`, `--accent`, `--radius`, etc.) allow incremental migration without changing every screen at once.

New UI should use:

- `--color-background` and `--color-surface` for surfaces
- `--color-content` and `--color-content-muted` for text
- `--color-action` for primary actions
- `--color-border` for default borders
- `--space-*` for spacing
- `--font-size-*` and the existing font family tokens for type
- `--radius-*` and `--shadow-*` for shape and elevation

## Design decisions

- Light, warm, editorial foundation from `DESIGN.md`.
- Oxblood is the action/state color; tan supports secondary emphasis.
- No new accent colors outside the Vivadeo palette.
- Existing class names remain stable while screens are redesigned in later passes.
- Tokens are CSS-native so server and client components can consume the same foundation without a runtime theme dependency.
