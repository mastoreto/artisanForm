---
target: landing and docs
total_score: 24
max_score: 32
na_heuristics: 7,10
p0_count: 1
p1_count: 2
target_identity: "file:/home/masto/github/artisanForm/apps/docs/src/pages/index.astro"
target_fingerprint: "sha256:bbf679bbf73aef3474b985f9398a1fc0e6bf87b9089ee3be5bd47a24a706e4bd"
target_path: /home/masto/github/artisanForm/apps/docs/src/pages/index.astro
timestamp: 2026-11-09T02-28-41Z
slug: src-pages-index-astro
---
# Critique: ArtisanForm landing + docs

Method: dual-agent. Landing 24/32 (75%, Good); docs 22/40; audit 12/20 (Acceptable).

Priority issues:
- [P0] Docs unreadable with light OS scheme (starlight.css forces dark vars in both themes; axe color-contrast serious on 4 pages; ratios 1.11-2.81) -> harden
- [P1] Docs entry is a dead end (stub index, no install, one link back, landing search is only a link, sidebar labels migrate/reference raw) -> onboard, clarify
- [P1] Ember overused (about ten treatments per viewport vs <8% intent; duplicate version; gradient headline) -> quieter, colorize
- [P2] Mobile: nav hidden below xl, wizard after 60 lines of code, 14 touch targets <44px -> adapt, layout
- [P2] A11y detail: 20 text nodes <=11px, ping dots ignore reduced motion, unfocusable scroll table, unlabeled pre, no aria-live on steps, cold-load anchors #kits/#faq land wrong -> typeset, harden
- [P3] Docs content mixes repo-internal paths and status emoji -> clarify
