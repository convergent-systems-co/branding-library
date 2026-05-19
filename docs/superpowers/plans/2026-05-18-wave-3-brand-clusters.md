# Wave-3 — High-Value Brand Clusters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Draft brand atoms + palette atoms for 18 brands across 4 high-value clusters (issues #20, #21, #23, #24), validated against the schema and emitting cleanly through all 9 emitters.

**Architecture:** Parallel subagent dispatch — one agent per cluster. Each agent authors `brands/<slug>/1.0.0/brand.yaml` plus a matching `palettes/<slug>/1.0.0/atom.yaml` for every brand in its cluster, then runs `pnpm validate && pnpm build`, then commits a single `feat(brands): ...` per cluster referencing the issue. The canonical reference shape is `brands/anthropic/1.0.0/brand.yaml` + `palettes/anthropic/1.0.0/atom.yaml`.

**Tech Stack:** YAML (yaml@^2.5.1) · Zod schemas in `tools/schemas/` · `tsx tools/validate.ts` · `tsx tools/build.ts` · 9 emitters under `tools/emitters/`.

---

## Scope

| Cluster | Issue | Brands | Risk |
|---|---|---|---|
| Comms apps | [#20](https://github.com/convergent-systems-co/branding-library/issues/20) | WhatsApp, Telegram, Signal, Snapchat | low |
| Hardware / silicon | [#21](https://github.com/convergent-systems-co/branding-library/issues/21) | NVIDIA, AMD, Intel, Samsung, Sony | low |
| AI labs | [#23](https://github.com/convergent-systems-co/branding-library/issues/23) | Mistral, Cohere, Perplexity, xAI | low |
| Email / productivity | [#24](https://github.com/convergent-systems-co/branding-library/issues/24) | Gmail, Outlook, Superhuman, HEY, Fastmail | low |

**Total:** 18 brand atoms + 18 palette atoms.

**Out of scope (this wave):**
- Issue #22 (Other major tech, 9 brands) — deferred to Wave-4.
- Lower-priority clusters #25–#32.
- Asset directories (always `assets: []` per HANDOFF §2 trademark policy).
- New font atoms for proprietary typefaces — reuse `inter@1`, `jetbrainsmono-nerdfont@1`, etc.
- Cross-brand role inheritance (Gmail→Google, Apple Music→Apple) — flag in `provenance.notes`, do not implement inheritance machinery.

## Alternatives considered

| Alternative | Pros | Cons | Verdict |
|---|---|---|---|
| **A. One subagent per cluster (4 parallel)** | Mirrors Wave-2 success pattern in session memory. Cluster boundaries are clean — no shared atom collisions. ~30–40 min wall-clock. | Coordination overhead if a brand in one cluster references another cluster's brand. Mitigated: only Gmail↔Google crosses, and it's a `provenance.notes` mention, not a hard ref. | **Chosen** |
| B. One subagent per brand (18 parallel) | Maximum parallelism, fine-grained recovery. | 18 agents is dispatch overhead beyond benefit; per-brand work is small. Heavier coordination. | Rejected |
| C. Sequential, one cluster at a time | Tight feedback loop, easy to fix mid-stream. | ~4× slower wall-clock. Burns main-context tokens on brand-guidelines research. | Rejected |
| D. Defer to AI-augmented documenter pipeline (HANDOFF §3) | Future-proof; reuses the planned pipeline. | Pipeline doesn't exist yet. Building it is a different project. | Rejected |

## File Structure

Per brand `<slug>` in cluster:

```
brands/<slug>/1.0.0/brand.yaml          # CREATE — 150–220 lines
palettes/<slug>/1.0.0/atom.yaml         # CREATE — 100–180 lines
```

No modifications to existing files. No new emitters, schemas, or scripts.

## Verification contract (every brand, every cluster)

A brand is "done" when ALL of these hold:

1. `pnpm validate` exits 0 with no errors for the new slug.
2. `pnpm build` exits 0; `dist/brands/<slug>@1.0.0.*` files exist for all 9 emitters.
3. `grep -E '\[unresolved\]|undefined|null' dist/brands/<slug>@1.0.0.*` returns no matches.
4. The brand declares `roles.colors.identity` (HANDOFF §2 requirement).
5. The brand carries ≥5 typed rules (HANDOFF §2 requirement) grounded in published guidance, with `rationale` referencing the source.
6. `provenance.source` is set to a URL the agent actually fetched.
7. Light + dark mode role mappings exist in the palette `modes` block.
8. `assets: []` (no per-brand asset directories).

---

## Cluster Tasks

### Task 1: Cluster #20 — Communications apps (subagent)

**Brands:** whatsapp, telegram, signal, snapchat

**Files (8):**
- Create: `brands/whatsapp/1.0.0/brand.yaml`
- Create: `palettes/whatsapp/1.0.0/atom.yaml`
- Create: `brands/telegram/1.0.0/brand.yaml`
- Create: `palettes/telegram/1.0.0/atom.yaml`
- Create: `brands/signal/1.0.0/brand.yaml`
- Create: `palettes/signal/1.0.0/atom.yaml`
- Create: `brands/snapchat/1.0.0/brand.yaml`
- Create: `palettes/snapchat/1.0.0/atom.yaml`

**Provenance sources (agent MUST fetch each before authoring):**
- WhatsApp: https://brand.whatsapp.com/
- Telegram: https://telegram.org/brand
- Signal: https://signal.org/brand
- Snapchat: https://snap.com/en-US/brand-guidelines

**Steps:**

- [ ] **Step 1: Read the canonical reference**

Read `brands/anthropic/1.0.0/brand.yaml` and `palettes/anthropic/1.0.0/atom.yaml`. The shape, field order, comment style, and provenance discipline of those two files is the contract. Do not invent fields.

- [ ] **Step 2: For each brand, fetch the provenance URL**

WebFetch each source URL. Capture brand colors (hex values, named tokens if exposed), typography (font families, weights, sizes), and any explicit usage rules (mark restrictions, color forbidden-list, accessibility targets). If a brand guide is unavailable, fall back to inspecting the live site CSS via WebFetch on the homepage and flag in `provenance.notes`: `Derived from site CSS, no public brand guide located 2026-05-18.`

- [ ] **Step 3: Author palette atom first**

For each brand, write `palettes/<slug>/1.0.0/atom.yaml` following the anthropic palette structure: `kind: palette`, `id`, `version: 1.0.0`, `name`, `description`, `tags`, `provenance`, `swatches` (with `id`, `name`, `value`, `description` for each), `modes` (with `light` and `dark` role mappings). Every swatch value MUST be a real hex from the source. No fabricated colors.

- [ ] **Step 4: Author brand atom**

Write `brands/<slug>/1.0.0/brand.yaml`: `id`, `version: 1.0.0`, `name`, `description`, `tags`, `provenance`, `references.palette: <slug>@1`, `references.fonts` (heading/body/mono pointing to existing open-source font atoms — `inter@1`, `jetbrainsmono-nerdfont@1`, etc.), `roles.colors` (must include `identity` and `on-identity`), `roles.typography`, `assets: []`, `rules` (≥5).

- [ ] **Step 5: Validate the cluster**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/branding-library
pnpm validate
```

Expected: exit 0, no errors related to whatsapp/telegram/signal/snapchat. If validation fails on a brand, fix the YAML for that brand and re-run. Do NOT proceed to other brands until validation is clean for the ones you've authored.

- [ ] **Step 6: Build and emitter-check the cluster**

```bash
pnpm build
for slug in whatsapp telegram signal snapchat; do
  for ext in json yaml css scss md swift kt; do
    test -f "dist/brands/${slug}@1.0.0.${ext}" || echo "MISSING: ${slug}.${ext}"
  done
  grep -lE '\[unresolved\]|undefined' dist/brands/${slug}@1.0.0.* 2>/dev/null && echo "UNRESOLVED in ${slug}"
done
```

Expected: no `MISSING` and no `UNRESOLVED` output. If any appear, return to Step 4 and fix the offending brand.

- [ ] **Step 7: Commit**

```bash
git add brands/whatsapp brands/telegram brands/signal brands/snapchat \
        palettes/whatsapp palettes/telegram palettes/signal palettes/snapchat
git commit -m "$(cat <<'EOF'
feat(brands): communications apps — WhatsApp, Telegram, Signal, Snapchat

Adds brand atoms + matching palette atoms for the four major
comms-app identities. All four at v1.0.0 with identity role,
light+dark mode mappings, ≥5 typed rules grounded in published
brand guidelines. assets: [] per trademark policy.

Closes #20

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Cluster #21 — Hardware / silicon (subagent)

**Brands:** nvidia, amd, intel, samsung, sony

**Files (10):**
- Create: `brands/nvidia/1.0.0/brand.yaml`
- Create: `palettes/nvidia/1.0.0/atom.yaml`
- Create: `brands/amd/1.0.0/brand.yaml`
- Create: `palettes/amd/1.0.0/atom.yaml`
- Create: `brands/intel/1.0.0/brand.yaml`
- Create: `palettes/intel/1.0.0/atom.yaml`
- Create: `brands/samsung/1.0.0/brand.yaml`
- Create: `palettes/samsung/1.0.0/atom.yaml`
- Create: `brands/sony/1.0.0/brand.yaml`
- Create: `palettes/sony/1.0.0/atom.yaml`

**Provenance sources:**
- NVIDIA: https://www.nvidia.com/en-us/about-nvidia/legal-info/logo-brand-usage/
- AMD: https://www.amd.com/ (and AMD press kit if available)
- Intel: https://www.intel.com/content/www/us/en/company-overview/brand-guidelines.html
- Samsung: https://www.samsung.com/global/about-us/brand-identity/
- Sony: https://www.sony.com/

**Scope guard:** Parent corporate identity only. NO sub-brands (GeForce, Ryzen, Bravia, Xperia, Galaxy) in this wave. PlayStation IS its own brand and will be drafted in cluster #25 (gaming).

**Steps:** Mirror Task 1 Steps 1–7. Substitute the brand list (nvidia/amd/intel/samsung/sony) into Step 5 grep, Step 6 emitter-check, and Step 7 git-add. Commit message:

```bash
git commit -m "$(cat <<'EOF'
feat(brands): hardware/silicon — NVIDIA, AMD, Intel, Samsung, Sony

Adds brand atoms + matching palette atoms for the five major
hardware/silicon parent identities. Scope is parent corporate
brand only — sub-brands (GeForce, Ryzen, Galaxy, Bravia, etc.)
deferred. All at v1.0.0 with identity role, light+dark mappings,
≥5 typed rules. assets: [] per trademark policy.

Closes #21

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Cluster #23 — AI labs (subagent)

**Brands:** mistral, cohere, perplexity, xai

**Files (8):**
- Create: `brands/mistral/1.0.0/brand.yaml`
- Create: `palettes/mistral/1.0.0/atom.yaml`
- Create: `brands/cohere/1.0.0/brand.yaml`
- Create: `palettes/cohere/1.0.0/atom.yaml`
- Create: `brands/perplexity/1.0.0/brand.yaml`
- Create: `palettes/perplexity/1.0.0/atom.yaml`
- Create: `brands/xai/1.0.0/brand.yaml`
- Create: `palettes/xai/1.0.0/atom.yaml`

**Provenance sources (most lack public brand guides — derive from site CSS):**
- Mistral: https://mistral.ai/
- Cohere: https://cohere.com/
- Perplexity: https://www.perplexity.ai/
- xAI: https://x.ai/

**Constraint:** All four are dark-first. Each brand atom MUST declare `roles.colors.identity` explicitly (cannot fall back to `primary`). The palette `modes.dark.roles` block is the primary mode; `modes.light.roles` should still be authored but is secondary.

**Steps:** Mirror Task 1 Steps 1–7. Note in `provenance.notes` for each brand: `Derived from live site CSS at <url> on 2026-05-18; no published brand guide located.` Commit message:

```bash
git commit -m "$(cat <<'EOF'
feat(brands): AI labs — Mistral, Cohere, Perplexity, xAI

Adds brand atoms + palette atoms for the four AI labs missing
from the catalog. All are dark-first identities — identity role
declared explicitly. Provenance derived from live site CSS
(no public brand guides). All at v1.0.0 with light+dark mappings,
≥5 typed rules. assets: [] per trademark policy.

Closes #23

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: Cluster #24 — Email / productivity (subagent)

**Brands:** gmail, outlook, superhuman, hey, fastmail

**Files (10):**
- Create: `brands/gmail/1.0.0/brand.yaml`
- Create: `palettes/gmail/1.0.0/atom.yaml`
- Create: `brands/outlook/1.0.0/brand.yaml`
- Create: `palettes/outlook/1.0.0/atom.yaml`
- Create: `brands/superhuman/1.0.0/brand.yaml`
- Create: `palettes/superhuman/1.0.0/atom.yaml`
- Create: `brands/hey/1.0.0/brand.yaml`
- Create: `palettes/hey/1.0.0/atom.yaml`
- Create: `brands/fastmail/1.0.0/brand.yaml`
- Create: `palettes/fastmail/1.0.0/atom.yaml`

**Provenance sources:**
- Gmail: https://about.google/brand-resource-center/ (Gmail product mark) + https://gmail.com (site CSS)
- Outlook: https://www.microsoft.com/design/fluent/ + https://outlook.com (Fluent palette under Microsoft)
- Superhuman: https://superhuman.com/ (site CSS; no public guide)
- HEY: https://hey.com/about (Basecamp-authored identity)
- Fastmail: https://www.fastmail.com/ (site CSS + about pages)

**Cross-brand notes:**
- Gmail's `description` and `provenance.notes` should reference the parent Google brand atom (already at `brands/google/1.0.0/`). Do NOT modify the Google atom. Document inheritance in prose only.
- Outlook similarly references Microsoft if a Microsoft brand atom exists — verify with `ls brands/microsoft/ 2>/dev/null` before referencing.

**Steps:** Mirror Task 1 Steps 1–7. Commit message:

```bash
git commit -m "$(cat <<'EOF'
feat(brands): email/productivity — Gmail, Outlook, Superhuman, HEY, Fastmail

Adds brand atoms + palette atoms for the five email/productivity
identities. Gmail/Outlook documented as product-brands under
Google/Microsoft (no machinery; provenance.notes only). Smaller
cos (Superhuman, HEY, Fastmail) derived from site CSS. All at
v1.0.0 with identity role, light+dark mappings, ≥5 typed rules.
assets: [] per trademark policy.

Closes #24

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Final cross-cluster verification (orchestrator)

After all four subagents report done:

- [ ] **Step F1: Full validate**

```bash
cd /Users/itsfwcp/workspace/convergent-system-co/branding-library
pnpm validate
```

Expected: exit 0, no errors anywhere.

- [ ] **Step F2: Full build + unresolved scan**

```bash
pnpm build
grep -rE '\[unresolved\]|undefined' dist/brands/ | head -20
```

Expected: empty output.

- [ ] **Step F3: Run the test suite**

```bash
pnpm test
```

Expected: all tests pass. If `tools/__tests__/workflow.test.ts` fails on its known-brittle grammar (HANDOFF §5), that is a pre-existing condition — note in handoff, do NOT modify the test in this PR.

- [ ] **Step F4: Catalog count sanity check**

```bash
test -f dist/index.json && jq '.brands | length, .palettes | length, .fonts | length' dist/index.json
```

Expected: brands ≥ 91 (was 73 + 18 new), palettes ≥ 159 (was 141 + 18 new).

- [ ] **Step F5: Update HANDOFF.md snapshot**

Update the snapshot block at `HANDOFF.md:9-19` with new counts and the latest commit hash. Mark each of the four clusters under `## 1. Catalog expansion / High-value brand gaps` as `[x]` instead of `[ ]`. Commit as `docs(handoff): wave-3 cluster completion`.

## Risks

- **Brittle workflow test** (HANDOFF §5) — may fire on grammar drift even when atoms are valid. Mitigation: F3 documents the known issue; don't modify the test in this PR.
- **Site-CSS provenance drift** — small cos (Superhuman, Cursor, xAI) may change their CSS post-capture, invalidating `provenance.source`. Mitigation: `importedDate` captures the snapshot moment; future audits compare against it.
- **Trademark policy boundary** — all 18 brands use third-party marks. `assets: []` is the contractual answer. Any agent tempted to add asset entries: STOP, re-read HANDOFF §2 trademark policy.
- **Schema drift** — if the Zod schema in `tools/schemas/brand.ts` adds required fields after the reference (anthropic/1.0.0) was authored, new brands must include them. Mitigation: Step 1 (read reference) catches the current shape; Step 5 (validate) catches the schema gap.
- **Subagent context blindness** — each subagent reads HANDOFF.md and one reference brand. If the reference brand drifts from current schema, all four agents inherit the drift. Mitigation: orchestrator runs F1 immediately after first cluster's commit; halts wave if validate fails.

## Out-of-scope follow-ups

- Cluster #22 (Other major tech, 9 brands) — schedule as Wave-4.
- Lower-priority clusters #25–#32.
- Cross-brand inheritance machinery (Gmail formally referencing Google's roles).
- Sub-brand atoms (GeForce, Ryzen, Galaxy, PlayStation under Sony, etc.).
- Updating `web/src/pages/brands/index.astro` if it lists brands manually (verify it consumes `dist/index.json` dynamically — should not need touching).
