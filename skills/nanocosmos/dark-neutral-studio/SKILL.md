---
name: dark-neutral-studio
description: A portable product branding and UI styling skill for matte dark AV workbench interfaces with neutral graphite surfaces, deep brand-blue structure, and orange action accents.
metadata:
  version: 1.0.1
  author: nanocosmos
  category: design
  updated: 2026-07-23
---

# Dark Neutral Studio

Use this branding skill when designing or restyling product UIs that should feel like a professional AV, broadcast, streaming, chromakey, encoder, monitoring, or control-room workspace.

The goal is not a flashy dark theme. The goal is a calm, durable, production-grade workbench: matte graphite surfaces, precise monitor areas, structured blue status cues, and orange reserved for active or commit actions.

## Design Intent

Dark Neutral Studio should feel:

- Professional, technical, and focused.
- Built for repeated operational use.
- Calm enough for long sessions.
- Premium through restraint, not decoration.
- Similar to broadcast/control-room tooling rather than a gaming dashboard.

Primary mood words:

- matte
- graphite
- studio
- monitor
- signal
- calibrated
- precise
- durable

Avoid:

- glossy gaming UI
- neon cyberpunk
- bright SaaS dashboard
- decorative gradients for their own sake
- heavy blue everywhere
- oversized marketing hero styling inside tools

## Visual Hierarchy

The product UI should read in this order:

1. The main preview, monitor, canvas, waveform, stream, or output surface.
2. The current mode/status of that surface.
3. The control rack or parameter panel.
4. Setup, authentication, uploads, logs, and secondary utilities.

For AV workbench pages, the preview is the hero. The UI should not make setup cards or instructions visually compete with the monitor area.

## Color System

Use a dark neutral grey base, not pure black.

### Core Palette

```css
:root {
  --dns-bg-page: #0f1216;
  --dns-bg-page-deep: #0b0d10;
  --dns-bg-panel: #252a30;
  --dns-bg-panel-low: #20252a;
  --dns-bg-sunken: #101216;
  --dns-bg-control: #151b21;

  --dns-line: #313740;
  --dns-line-strong: #3a424c;
  --dns-line-blue: #2e5870;

  --dns-text: #e8edf2;
  --dns-text-soft: #cbd6de;
  --dns-muted: #9da6b0;
  --dns-dim: #737d88;

  --dns-brand-blue: #07587f;
  --dns-brand-blue-dark: #043c5b;
  --dns-status-blue: #1f9bd1;

  --dns-action-orange: #ff821f;
  --dns-action-orange-hi: #ff9d43;
  --dns-action-orange-low: #ea6a10;

  --dns-ok: #44c767;
  --dns-warn: #ffc15a;
  --dns-error: #ff6b5f;
}
```

### Usage Rules

- Page background: deep graphite, usually `#0f1216` to `#0b0d10`.
- Panels: dark matte grey, usually `#252a30` to `#20252a`.
- Monitor/canvas/player: near black, usually `#050607`.
- Brand blue: header, status strips, structural panel top borders, subtle focus framing.
- Orange: primary actions, selected tabs, dirty/sync indicators, active states.
- Green/red/yellow: only for operational status, not decoration.

Do not let blue become the dominant surface color. Blue should say "system/status/structure." Orange should say "action/active/commit."

## Background Treatment

Use a dark neutral page with a subtle cool-blue lift near the top. Keep it quiet.

Recommended page background:

```css
body {
  background:
    linear-gradient(180deg, rgba(8, 72, 105, 0.16) 0, rgba(8, 72, 105, 0) 180px) fixed,
    linear-gradient(135deg, #13171b 0%, #0f1216 54%, #0b0d10 100%) fixed;
  color: var(--dns-text);
}
```

Avoid orbs, bokeh blobs, loud radial glows, or decorative illustrated backgrounds. This theme is a workspace, not a landing page.

## Header

Use the header as the strongest brand-blue moment.

Recommended header:

```css
.app-header {
  background:
    linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.12) 44%, transparent 58%),
    linear-gradient(180deg, #0c6f9e 0%, #07587f 46%, #043c5b 100%);
  border-bottom: 2px solid var(--dns-action-orange);
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.09),
    0 12px 36px rgba(2,20,28,0.48);
}
```

Header rules:

- Keep it compact.
- Put brand/logo left.
- Use a small uppercase product family eyebrow.
- Use the product/workbench name as the visible title.
- Put one compact mode pill on the right, such as "JS Canvas - Workbench" or "WebGL2 - Workbench."
- Keep the orange rule as a crisp brand anchor.

## Typography

Use compact, readable product UI typography.

Display/title:

- Strong geometric sans if available.
- Use title case or product-name casing.
- Keep titles short.

Labels:

- Uppercase.
- Letter-spaced.
- Small, precise.

Body/help text:

- Muted grey.
- Short and operational.
- Avoid marketing copy inside the tool.

Recommended scale:

```css
.eyebrow {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--dns-action-orange);
}

.panel-title {
  font-size: 20px;
  line-height: 1.2;
  color: #fff;
}

.section-label {
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #fff;
}

.help-text {
  font-size: 12px;
  line-height: 1.45;
  color: var(--dns-muted);
}
```

Avoid very large hero typography inside the product workspace. Save hero scale for marketing pages.

## Layout Principles

Use a workbench layout:

- Left or center: monitor/preview/canvas/output.
- Right: controls, parameters, setup, filters.
- Top: compact identity and mode/status.
- Bottom or sticky rail: commit actions only when needed.

Recommended desktop grid:

```css
.workbench {
  width: min(calc(100% - 96px), 1520px);
  margin: 18px auto 30px;
}

.workbench-layout {
  display: grid;
  grid-template-columns: minmax(720px, 1fr) minmax(390px, 440px);
  gap: 18px;
  align-items: start;
}
```

Rules:

- Do not float cards randomly across the page.
- Keep preview title, status, and preview panel visually grouped.
- Tighten the gap between the player header and the player panel.
- Let control rails scroll if needed.
- On narrow screens, stack preview first, controls second.

## Panels And Modals

Panels should feel matte and tool-like, not glassy.

Recommended panel:

```css
.dns-panel {
  background: linear-gradient(180deg, #252a30 0%, #20252a 100%);
  border: 1px solid #343b45;
  border-radius: 9px;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.055),
    inset 0 -1px 0 rgba(0,0,0,0.36),
    0 22px 64px rgba(0,0,0,0.36);
}
```

Panel rules:

- Use one panel for the preview/monitor.
- Use one panel for the controls rail.
- Avoid nested cards inside panels unless the nested element is a repeated item, modal, or genuinely framed tool.
- Use thin dividers inside the control rail instead of many small cards.
- Blue top border can indicate "workbench/control structure."
- Orange border should be reserved for active state or selected mode, not every panel.

## Monitor / Player Surface

The player/canvas is the visual anchor. Treat it like a monitor.

Recommended monitor:

```css
.monitor {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #050607;
  border: 1px solid #08090b;
  border-radius: 6px;
  overflow: hidden;
  box-shadow:
    inset 0 0 0 2px rgba(0,0,0,0.62),
    inset 0 0 0 1px rgba(255,255,255,0.04),
    0 12px 30px rgba(0,0,0,0.24);
}
```

Rules:

- The monitor should be black or near black.
- Placeholder text should be small, centered, and muted.
- The monitor should not look like an empty marketing image card.
- Leave enough panel padding to see the frame, but not so much that the player feels detached.

## Control Rail

The control rail should feel like a compact rack of parameters.

Rules:

- Use section dividers rather than nested cards.
- Keep labels close to their controls.
- Use number badges or inputs for precise values.
- Keep apply/reset actions in a lower action strip.
- Make live/sync/dirty states visible but small.

Recommended control rail:

```css
.control-rail {
  background: linear-gradient(180deg, #252a30 0%, #20252a 100%);
  border: 1px solid #343b45;
  border-top: 2px solid var(--dns-line-blue);
  border-radius: 9px;
  padding: 18px;
}

.control-section {
  border-top: 1px solid #303842;
  padding-top: 16px;
  margin-top: 16px;
}

.control-section:first-child {
  border-top: 0;
  margin-top: 0;
  padding-top: 0;
}
```

## Status And Signal UI

Status should feel like AV signal information.

Use status strips for:

- preview engine
- live/synced/dirty state
- stream health
- selected playout
- capture source
- API or render mode

Recommended status:

```css
.status-strip {
  color: #cbd6de;
  background: rgba(4,42,61,0.54);
  border: 1px solid #2e5870;
  border-left: 3px solid var(--dns-status-blue);
  border-radius: 6px;
  padding: 7px 12px;
  font-size: 12px;
}
```

Status color rules:

- Blue: information, engine, stream mode.
- Green: ready/connected/synced.
- Orange: pending changes, dirty state, active mode.
- Red: error/blocking issue.
- Yellow: warning/degraded state.

## Buttons And Actions

Orange is for active and commit actions.

Primary button:

```css
.btn-primary {
  color: #fff;
  background: linear-gradient(180deg, #ff9d43 0%, #ff821f 52%, #ea6a10 100%);
  border: 1px solid #ff821f;
  border-radius: 6px;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.22),
    0 8px 18px rgba(0,0,0,0.18);
}
```

Secondary button:

```css
.btn-secondary {
  color: #e8edf2;
  background: linear-gradient(180deg, #303740 0%, #222831 100%);
  border: 1px solid #4a515b;
  border-radius: 6px;
}
```

Rules:

- Use orange for selected tab, apply, authenticate, commit, run, load, render.
- Use dark grey secondary buttons for reset, stop, hide, utility.
- Avoid making every button orange.
- Icon buttons are preferred for familiar tool actions when a proper icon exists.

## Tabs

Tabs should behave like operational modes.

```css
.mode-tab {
  color: var(--dns-text);
  background: linear-gradient(180deg, #242b33 0%, #171d24 100%);
  border: 1px solid #313740;
  border-radius: 6px;
}

.mode-tab.active {
  color: #fff;
  background: linear-gradient(180deg, #ff9d43 0%, #ff821f 52%, #ea6a10 100%);
  border-color: #ff821f;
}
```

Use a small orange dot for "dirty" or "needs apply" rather than large warning text.

## Inputs And Sliders

Inputs should look recessed and precise.

```css
input,
select,
textarea {
  color: var(--dns-text);
  background:
    linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0)),
    #151c23;
  border: 1px solid #313740;
  border-left: 3px solid var(--dns-action-orange);
  border-radius: 6px;
  box-shadow:
    inset 0 1px 2px rgba(0,0,0,0.34),
    inset 0 1px 0 rgba(255,255,255,0.04);
}
```

Sliders:

- Track: muted graphite.
- Thumb: orange.
- Value: compact dark pill or small numeric input.

## Auth And Setup Areas

Setup/auth should not dominate after the workbench is usable.

Rules:

- Keep auth/setup panels compact.
- Collapse or visually reduce them once authenticated.
- Use configuration panels above the workbench only when necessary.
- Avoid long explanatory text; use precise operational labels.

## Copy Style

Write product UI copy like a control surface:

Good:

- "Preview engine: JS canvas"
- "Live Apply"
- "Needs Apply"
- "Apply to Stream"
- "Upload a foreground frame"
- "Stream ready"
- "Capture blocked by browser"

Avoid:

- "Experience the next generation of chromakey"
- "Unlock powerful creative possibilities"
- "A beautiful way to manage your streams"
- Long tutorials inside the workbench

## Responsive Behavior

Desktop:

- Preview and controls side by side.
- Controls can be sticky if it does not misalign the preview.
- Header/status should stay within the same workbench width.

Tablet/mobile:

- Stack preview first, controls second.
- Hide or wrap the header mode pill.
- Make buttons full-width only when there is not enough horizontal space.
- Preserve monitor aspect ratio.
- Keep text from overlapping controls.

## Accessibility

- Maintain readable contrast on all controls.
- Do not rely on color alone for critical status.
- Keep focus states visible, preferably orange or blue.
- Use real labels for inputs.
- Make active modes obvious with both color and shape/border.

## Implementation Checklist

Before finishing a Dark Neutral Studio pass:

- The page background is matte dark grey, not pure black and not bright blue.
- Main panels are dark graphite with subtle depth.
- Header carries brand blue and an orange rule.
- The player/monitor is visually dominant.
- Player header and player panel have tight spacing.
- The right rail feels like a control rack, not a pile of cards.
- Orange is reserved for active/commit actions.
- Blue is used for status/structure.
- Setup/auth does not overpower the workbench.
- Text fits inside buttons and pills at desktop and mobile widths.
- The theme still feels calm after real video/image content loads.

## Claude / Agent Prompt

Use this prompt when giving the style to another agent:

```text
Use the Dark Neutral Studio branding skill. Restyle this product UI as a matte professional AV workbench: deep neutral graphite background, dark grey modal panels, black monitor/player surface, compact right-side control rack, deep brand-blue header and status accents, and orange only for active/commit actions. Avoid glossy gaming UI, neon effects, decorative blobs, oversized marketing sections, and excessive blue. Keep the interface dense, calm, readable, and suitable for chromakey, streaming, encoder, preview, or broadcast operations.
```

## Minimal CSS Starter

```css
:root {
  --dns-bg-page: #0f1216;
  --dns-bg-panel: #252a30;
  --dns-bg-panel-low: #20252a;
  --dns-bg-sunken: #101216;
  --dns-line: #313740;
  --dns-line-blue: #2e5870;
  --dns-text: #e8edf2;
  --dns-muted: #9da6b0;
  --dns-brand-blue: #07587f;
  --dns-status-blue: #1f9bd1;
  --dns-action-orange: #ff821f;
}

body {
  background:
    linear-gradient(180deg, rgba(8,72,105,0.16) 0, rgba(8,72,105,0) 180px),
    linear-gradient(135deg, #13171b 0%, #0f1216 54%, #0b0d10 100%);
  color: var(--dns-text);
}

.dns-header {
  background:
    linear-gradient(115deg, transparent 0%, rgba(255,255,255,0.12) 44%, transparent 58%),
    linear-gradient(180deg, #0c6f9e 0%, #07587f 46%, #043c5b 100%);
  border-bottom: 2px solid var(--dns-action-orange);
}

.dns-panel {
  background: linear-gradient(180deg, var(--dns-bg-panel) 0%, var(--dns-bg-panel-low) 100%);
  border: 1px solid #343b45;
  border-radius: 9px;
  box-shadow:
    inset 0 1px 0 rgba(255,255,255,0.055),
    inset 0 -1px 0 rgba(0,0,0,0.36),
    0 22px 64px rgba(0,0,0,0.36);
}

.dns-monitor {
  background: #050607;
  border: 1px solid #08090b;
  border-radius: 6px;
  overflow: hidden;
  box-shadow:
    inset 0 0 0 2px rgba(0,0,0,0.62),
    inset 0 0 0 1px rgba(255,255,255,0.04),
    0 12px 30px rgba(0,0,0,0.24);
}

.dns-status {
  background: rgba(4,42,61,0.54);
  border: 1px solid var(--dns-line-blue);
  border-left: 3px solid var(--dns-status-blue);
  color: #cbd6de;
}

.dns-primary {
  background: linear-gradient(180deg, #ff9d43 0%, #ff821f 52%, #ea6a10 100%);
  border: 1px solid #ff821f;
  color: #fff;
}
```
