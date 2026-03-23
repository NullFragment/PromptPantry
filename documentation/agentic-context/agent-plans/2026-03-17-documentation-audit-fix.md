# Documentation Audit Fix Plan

**Goal:** Fix all violations found during a full audit of `documentation/` against the global rules
(`documentation-and-plans.md`, `markdown-formatting.md`, `mermaid-diagrams.md`).

**Created:** 2026-03-17

**Status:** Complete

---

## Findings Summary

### Critical (broken functionality / bad cross-references)

1. **README.md links to `./docs/`** — the directory was renamed to `documentation/` but README.md
   still points to the old path throughout (lines 45, 249, 292–309). All doc links are broken.

2. **README.md is 423 lines** — rules cap it at ~150 lines. Setup detail, full deployment guide,
   API endpoint table, scripts table, contributing section, future goals, and testing section all
   belong in `documentation/development/`, not the root README.

### Structural (directory layout violations)

3. **`documentation/INDEX.md`** — hub file must be named `README.md` per the rules.

4. **All content files use UPPERCASE names** — rules require `kebab-case.md`. Every file in
   `documentation/architecture/` and `documentation/components/` is named in ALL CAPS.

5. **`documentation/ARCHITECTURE.md` and `documentation/COMPONENTS.md`** — redundant root-level
   index files.

6. **Missing `documentation/development/`** — contributing, setup, testing, and scripts content
   currently lives in README.md and scattered files.

7. **Missing `documentation/agentic-context/PROJECT_CONTEXT.md`** — required core file.

### Mermaid Diagrams (~17 diagrams across 8+ files)

8. No Pastel theme init block on any diagram.
9. `graph` keyword used instead of `flowchart`.
10. No `classDef` palette or node color styling on flowchart diagrams.
11. `sequenceDiagram` blocks lack `autonumber`.

### Minor Formatting

12. **CLAUDE.md env vars table** has ragged `|---|---|` separators.

---

## Tasks

- [x] Phase 1: Fix README.md — trim to ~150 lines, fix `./docs/` links
- [x] Phase 2: Create `documentation/development/` section (setup, contributing, testing, roadmap)
- [x] Phase 3: Rename `INDEX.md` → `README.md`, reformat as hub, add `components/README.md`, delete redundant index files
- [x] Phase 4: Rename all 22 content files to kebab-case, update all cross-references
- [x] Phase 5: Create `PROJECT_CONTEXT.md`, add `.gitkeep` files to `agent-designs/` and `agent-plans/`
- [x] Phase 6: Fix all Mermaid diagrams with Pastel adaptive theme (9 files, ~18 diagrams)
- [x] Phase 7: Fix CLAUDE.md env vars table alignment
