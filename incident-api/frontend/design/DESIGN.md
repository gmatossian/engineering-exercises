---
name: Obsidian Sentinel
colors:
  surface: '#0f131c'
  surface-dim: '#0f131c'
  surface-bright: '#353942'
  surface-container-lowest: '#0a0e16'
  surface-container-low: '#181c24'
  surface-container: '#1c2028'
  surface-container-high: '#262a33'
  surface-container-highest: '#31353e'
  on-surface: '#dfe2ee'
  on-surface-variant: '#bdc8d1'
  inverse-surface: '#dfe2ee'
  inverse-on-surface: '#2c3039'
  outline: '#87929a'
  outline-variant: '#3e484f'
  surface-tint: '#7bd0ff'
  primary: '#8ed5ff'
  on-primary: '#00354a'
  primary-container: '#38bdf8'
  on-primary-container: '#004965'
  inverse-primary: '#00668a'
  secondary: '#b4d32d'
  on-secondary: '#2a3400'
  secondary-container: '#99b700'
  on-secondary-container: '#384400'
  tertiary: '#00e2f0'
  on-tertiary: '#00363a'
  tertiary-container: '#00c4d0'
  on-tertiary-container: '#004c51'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c4e7ff'
  primary-fixed-dim: '#7bd0ff'
  on-primary-fixed: '#001e2c'
  on-primary-fixed-variant: '#004c69'
  secondary-fixed: '#cff049'
  secondary-fixed-dim: '#b4d32d'
  on-secondary-fixed: '#181e00'
  on-secondary-fixed-variant: '#3f4c00'
  tertiary-fixed: '#7df4ff'
  tertiary-fixed-dim: '#00dbe9'
  on-tertiary-fixed: '#002022'
  on-tertiary-fixed-variant: '#004f54'
  background: '#0f131c'
  on-background: '#dfe2ee'
  surface-variant: '#31353e'
  surface-base: '#0B0F17'
  surface-raised: '#111827'
  surface-elevated: '#1E293B'
  border-subtle: '#1F2937'
  border-strong: '#374151'
  status-success: '#10B981'
  status-warning: '#F59E0B'
  status-danger: '#EF4444'
  deep-navy: '#00121B'
  command-slate: '#093247'
typography:
  display:
    fontFamily: Geist
    fontSize: 3.5rem
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Geist
    fontSize: 2.25rem
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: -0.025em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 1.75rem
    fontWeight: '600'
    lineHeight: '1.25'
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Geist
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: '1.35'
    letterSpacing: -0.015em
  title:
    fontFamily: Geist
    fontSize: 1.125rem
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Geist
    fontSize: 1rem
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: 0em
  body-md:
    fontFamily: Geist
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: '1.5'
    letterSpacing: 0em
  body-sm:
    fontFamily: Geist
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: '1.4'
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Geist
    fontSize: 0.875rem
    fontWeight: '500'
    lineHeight: '1.3'
    letterSpacing: 0.02em
  label-md:
    fontFamily: Geist
    fontSize: 0.75rem
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Geist
    fontSize: 0.6875rem
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.06em
  data-mono:
    fontFamily: Geist
    fontSize: 0.8125rem
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.25rem
  margin: 1rem
  margin-desktop: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

The design system establishes a high-performance, mission-critical command aesthetic engineered for modern physical and digital security operations. It communicates uncompromising vigilance, clinical precision, and strategic calm under operational pressure. The interface caters to enterprise security analysts, tactical operators, and executive directors who monitor real-time threat telemetry across dense multi-surface workstations.

The visual direction marries high-density technical minimalism with subtle tactical glassmorphism. Surfaces are deep, layered obsidian canvases punctuated by crisp mechanical keylines, high-visibility telemetry gauges, and ultra-vibrant functional status indicators. Visual noise is aggressively eliminated: typography is clean, structural, and strictly hierarchical; decorative elements are stripped away in favor of purposeful information density, real-time data clarity, and seamless situational awareness.

## Colors

The palette operates strictly in dark mode, optimizing for extended operator shift cycles and dark command center environments while minimizing screen fatigue. 

- **Surface Hierarchy:** The foundation rests on `#0B0F17` (Obsidian Base), transitioning upward to `#111827` (Card / Panel Surface) and `#1E293B` (Floating Dialogs, Flyouts, Active Rows). 
- **Borders & Dividers:** Subtle visual separation relies on `#1F2937`, while active, focused, or selected containers leverage `#374151`.
- **Primary & Tactical Accents:** Cyan (`#38BDF8`) and electric cyan (`#00F0FF`) drive core interactive elements, selection brackets, and active navigation nodes. High-visibility chartreuse (`#D2F34C`) serves as a high-priority secondary accent for tactical highlights, target acquisitions, and live indicators.
- **Operational Status Indicators:** Semantic statuses are uncompromising: `#10B981` (Normal / Secured), `#F59E0B` (Advisory / Degraded), and `#EF4444` (Critical Alert / Incident Breach). These colors must never be used purely decoratively.

## Typography

Typography relies on `Geist` across all roles, delivering high-density legibility and a sharp engineering posture reminiscent of technical telemetry dashboards.

- **Data Readouts & Identifiers:** All timestamps, latitude/longitude coordinates, hardware MAC/IP addresses, and quantitative metric readouts use `data-mono` styling with tabular numbers enabled (`font-variant-numeric: tabular-nums`).
- **Tactical Caps:** `label-sm` and `label-md` are styled in uppercase with intentional tracking (`0.04em` to `0.06em`) to serve as clear container headers, pill indicators, and column metadata.
- **Hierarchy Control:** Headlines must maintain tight negative tracking to avoid loose editorial pacing, ensuring a compact, unified header presence.

## Layout & Spacing

The layout model is a flexible 12-column operational grid engineered for dense, multi-pane telemetry layouts, live map views, and feed streams.

- **Desktop (>= 1280px):** 12 columns, 20px (`1.25rem`) gutters, 24px (`1.5rem`) outer canvas margins. Multi-pane operational views fix tool rails at 64px collapsed / 240px expanded and data sidebars at 380px, while canvas feeds flow dynamically.
- **Tablet (768px - 1279px):** 8 columns, 16px (`1rem`) gutters, 20px outer margin. Side panels collapse into contextual slide-overs or stacked drawers.
- **Mobile (< 768px):** 4 columns, 12px gutters, 16px outer margins. Multi-stream feeds collapse into tabbed single-column views with persistent incident bottom sheets.
- **Rhythm:** Spacing follows a 4px mechanical base unit. Dense panels enforce compact internal gaps (`space-xs` and `space-sm`) to maximize visible intelligence per viewport.

## Elevation & Depth

Depth is established primarily through tonal layering, crisp borders, and subtle translucent backing rather than heavy diffused shadows.

- **Layer Tiering:**
  - *Tier 0 (Canvas):* `#0B0F17` pure matte background.
  - *Tier 1 (Panels & Cards):* `#111827` with a 1px solid border of `#1F2937`.
  - *Tier 2 (Modals & Flyouts):* `#1E293B` backed by a subtle glassmorphic backdrop blur (`backdrop-filter: blur(12px)` with 85% alpha on the fill) and a refined outline of `#374151`.
- **Shadow Profile:** Shadows are strictly directional and ambiently subdued: `0 4px 20px -2px rgba(0, 0, 0, 0.6)`. Active alerts or high-threat targets employ a faint 1px perimeter glow corresponding to their status color (e.g., `0 0 12px rgba(239, 68, 68, 0.25)` for `#EF4444`).

## Shapes

The interface embraces a precise, restrained architectural geometry (`roundedness: 1`). 

- **Containers & Cards:** Corner radii stay at `0.25rem` (4px) for small interactive controls and inputs, scaling to `0.5rem` (8px) for modular dashboard cards and floating inspection drawers.
- **No Pill Dominance:** Pill shapes (`9999px`) are strictly reserved for live pulse dots and active alarm state chips. Standard buttons and system controls remain squarely anchored to maintain a disciplined, structural footprint.

## Components

### Buttons & Triggers
- **Primary:** Background `#38BDF8`, text `#0B0F17`, weight 600, radius `0.25rem`. Hover shifts to `#00F0FF` with a subtle `box-shadow: 0 0 12px rgba(0, 240, 255, 0.35)`.
- **Secondary / Tactical:** Background `transparent`, border 1px solid `#374151`, text `#FEFDFB`. Hover shifts border to `#38BDF8` and surface to `rgba(56, 189, 248, 0.08)`.
- **Destructive / Incident Action:** Background `rgba(239, 68, 68, 0.15)`, border 1px solid `#EF4444`, text `#EF4444`. Hover shifts to solid `#EF4444` with `#0B0F17` text.

### Inputs & Search Bars
- Background `#0B0F17` set inside a 1px `#1F2937` border.
- Text `#FEFDFB`, placeholder `#64748B`.
- Focus state: Border shifts to `#38BDF8` with a razor-thin `0 0 0 1px #38BDF8` ring, accompanied by tabular monospace styling for filter chips or query syntaxes.

### Cards & Telemetry Panels
- Surface `#111827`, 1px border `#1F2937`, radius `0.5rem`.
- Panel headers feature uppercase `label-md` tracking, separated by a crisp 1px `#1F2937` horizontal baseline divider.
- Hoverable event cards introduce a 1px border shift to `#374151` and subtle lift via `rgba(255, 255, 255, 0.02)` background tint.

### Status Chips & Badges
- Compact height (22px-24px), radius `0.25rem`.
- Rendered with low-opacity alpha backgrounds (`rgba(color, 0.12)`) and matching solid 1px borders (`rgba(color, 0.3)`).
- Include a 6px status dot on the leading edge. A pulsing outer ring is permitted solely for live `#EF4444` and `#D2F34C` alarms.

### Checkboxes & Toggle Switches
- Checkboxes: 16x16px boxes, `#111827` base, `#374151` outline. Active state fills with `#38BDF8` and dark checkmark.
- Switches: Track background `#1E293B` (20px height, 36px width), sliding thumb 16px white circle. Active track transitions to `#38BDF8` with thumb sliding cleanly.

### Tactical HUD & Data Feeds
- Stream rows use alternating hover states with no vertical gridlines. 
- Alert logs feature a 2px full-height left accent strip corresponding to severity (`#10B981`, `#F59E0B`, `#EF4444`).