---
name: Aire Cotidiano
colors:
  surface: '#f6f9ff'
  surface-dim: '#d3dbe4'
  surface-bright: '#f6f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#ecf4fe'
  surface-container: '#e7eff8'
  surface-container-high: '#e1e9f3'
  surface-container-highest: '#dbe3ed'
  on-surface: '#141c23'
  on-surface-variant: '#3e4948'
  inverse-surface: '#293139'
  inverse-on-surface: '#eaf2fb'
  outline: '#6e7978'
  outline-variant: '#bdc9c8'
  surface-tint: '#006a68'
  primary: '#006765'
  on-primary: '#ffffff'
  primary-container: '#1e817f'
  on-primary-container: '#f3fffe'
  inverse-primary: '#7dd5d2'
  secondary: '#006a64'
  on-secondary: '#ffffff'
  secondary-container: '#96f3ea'
  on-secondary-container: '#00716b'
  tertiary: '#515e5e'
  on-tertiary: '#ffffff'
  tertiary-container: '#6a7777'
  on-tertiary-container: '#f3fffe'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#9af2ef'
  primary-fixed-dim: '#7dd5d2'
  on-primary-fixed: '#00201f'
  on-primary-fixed-variant: '#00504e'
  secondary-fixed: '#96f3ea'
  secondary-fixed-dim: '#7ad6ce'
  on-secondary-fixed: '#00201e'
  on-secondary-fixed-variant: '#00504c'
  tertiary-fixed: '#d7e5e4'
  tertiary-fixed-dim: '#bbc9c8'
  on-tertiary-fixed: '#111e1d'
  on-tertiary-fixed-variant: '#3c4949'
  background: '#f6f9ff'
  on-background: '#141c23'
  surface-variant: '#dbe3ed'
typography:
  display:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  biometric-stat:
    fontFamily: Plus Jakarta Sans
    fontSize: 34px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  biometric-unit:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 0.75rem
  gutter-sm: 0.5rem
  margin: 1.25rem
  margin-mobile: 1.25rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.25rem
  space-xl: 1.75rem
  space-2xl: 2.5rem
---

## Brand & Style

This design system establishes a warm, preventive, and deeply human companion experience for personal everyday wellness. Departing fundamentally from clinical, sterile, or anxiety-inducing medical interfaces, the aesthetic balances serene clarity with organic reassurance. It treats personal vitals and metrics not as clinical diagnoses, but as steady daily rhythms and gentle encouragement.

The design movement combines **Minimalism** with **Soft Organic Warmth**: generous breathing room, tactile card containers, quiet pastel washes, crisp micro-borders, and high-legibility tabular metrics. The emotional tone evokes calm attentiveness, agency, optimism, and emotional safety. Visual density is kept intentionally low to prevent cognitive overload.

## Colors

The palette is anchored by the "Aire Cotidiano" concept—clean air, natural daylight, and restorative presence.

- **Canvas & Surface Tiering**: The background canvas uses `#FAF9F6` (warm chalk white), providing an inviting backdrop that avoids the harshness of pure digital white. Elevated cards and active containers rest on `#FFFFFF`.
- **Primary & Accent (`#2B8A88` / `#3A9B94`)**: A restorative, living sage teal used for focal actions, active wellness indicators, track fills, and primary interactive states.
- **Accent Soft (`#E6F4F3`)**: A gentle, aerated teal tint used for biometric card backgrounds, tag containers, highlight pills, and positive contextual zones.
- **Deep Ink Neutral (`#1C242B`)**: Softened near-black for high contrast readability without sterile severity.
- **Muted Neutral (`#687787`)**: Supportive secondary text, metric labels, and inactive icons.
- **Borders & Dividers (`#E2E8F0`)**: Subtle containment lines that structure information without visual friction.
- **Functional Semantics**:
  - Success: `#2E7D52` (habits completed, goals reached, steady stability).
  - Warning: `#D97706` (mild hydration/movement nudges, sync alerts).
  - Danger / Technical: `#DC2626` strictly reserved for hardware disconnection, sync failures, or input errors. It is intentionally never applied to user biometric states to avoid medical alarmism.

## Typography

The type system is powered by **Plus Jakarta Sans**, chosen for its friendly geometric curves, humanist warmth, and open apertures that maintain clarity at small sizes on OLED screens.

- **Tabular Numerics (`tnum`)**: All numeric display instances—including heart rate, sleep duration, step counts, and timelines—must have the OpenType tabular figure feature enabled (`font-variant-numeric: tabular-nums`). This prevents jitter during real-time updates and ensures uniform column alignment.
- **Biometric Readouts**: Quantitative data is decoupled into a dominant `biometric-stat` value paired inline or baseline-anchored with a muted `biometric-unit` label.
- **Letter Spacing**: Subtle negative tracking is applied to headlines and large numerical displays to maintain cohesion; labels and meta tags use positive tracking for crisp peripheral readability.

## Layout & Spacing

Designed primarily for mobile portrait viewport (390×844 reference, scaling to standard handheld devices):

- **Grid Structure**: A 4-column fluid mobile grid with `1.25rem` (20px) outer edge margins and `0.75rem` (12px) gutters. Biometric modular summaries utilize 2-column card spans.
- **Vertical Rhythm**: Built upon a strict 4px/8px incremental rhythm. Section stacks maintain `1.75rem` separation to provide breathing room and reduce visual noise.
- **Thumb Reachability**: High-frequency interactive controls (quick check-in, tracking, bottom navigation) reside strictly in the lower 40% vertical zone of the screen. Critical status insights and glanceable trends anchor the upper viewport.

## Elevation & Depth

Visual depth is achieved through **Tonal Layering** and **Soft Ambient Diffusion**, avoiding heavy structural drop shadows.

- **Canvas Level (0)**: `#FAF9F6` background foundation.
- **Resting Surface (Level 1)**: Pure white `#FFFFFF` cards bordered with `#E2E8F0` (1px solid) paired with an ultra-soft tinted shadow: `0 2px 12px -2px rgba(28, 36, 43, 0.04)`.
- **Interactive & Focus (Level 2)**: Slightly lifted cards and bottom navigation bar: `0 6px 20px -4px rgba(43, 138, 136, 0.08)`.
- **Modals & Overlays (Level 3)**: Soft frosted sheets (`backdrop-filter: blur(12px)`) with `rgba(28, 36, 43, 0.2)` veil and `0 16px 36px -8px rgba(28, 36, 43, 0.12)`.

## Shapes

The design language uses roundedness level `2` (moderately rounded with organic friendliness) to soften the mobile experience:

- **Cards & Data Modules**: `1rem` (16px) corner radius, creating welcoming containment without appearing childish.
- **Buttons & Interactive Pills**: Fully rounded pill forms (`9999px`) for action buttons, filter tags, and state badges to reinforce touchability and comfort.
- **Form Controls & Search Bars**: `0.75rem` (12px) corner radius.
- **Progress & Ring Gauges**: Rounded end caps (`stroke-linecap: round`) on all biometric circular and linear bars to convey flow rather than clinical rigidity.

## Components

### Buttons
- **Primary**: Pill-shaped (`rounded-full`), `#2B8A88` fill, `#FFFFFF` text, `0.875rem` horizontal padding, 48px standard touch target height. Active state transitions to `#3A9B94`.
- **Secondary / Soft**: `#E6F4F3` background, `#2B8A88` label, borderless, delivering gentle prominence for recurring daily tasks.
- **Ghost**: Transparent background, `#1C242B` text with `#E2E8F0` border, for low-priority navigation.

### Metric & Biometric Cards
- Structured with `#FFFFFF` background, `1px solid #E2E8F0`, and `1rem` radius.
- Header contains an icon nestled in a 32×32px `#E6F4F3` circle, paired with a small uppercase label (`#687787`).
- Main numerical display uses `biometric-stat` with tabular figures, paired alongside its unit (`#687787`).
- Footer displays a qualitative delta or gentle reassurance badge (e.g., "Steady", "Within your normal range") utilizing a soft pill shape with `#2E7D52` or `#2B8A88`.

### Chips & Filter Pills
- Heights fixed at 32px or 36px.
- Unselected: `#FFFFFF` surface with `#E2E8F0` border and `#687787` text.
- Selected: `#E6F4F3` background, `#2B8A88` text, and subtle `#2B8A88` border.

### Checkboxes & Habit Trackers
- 24×24px with `0.375rem` rounded corners.
- Unchecked: `#FFFFFF` with 1.5px `#E2E8F0` border.
- Checked: Animated fill to `#2B8A88` with a crisp `#FFFFFF` checkmark, accompanied by a soft, spring-like scale micro-animation.

### Inputs & Sliders
- Inputs feature a 48px height, `#FFFFFF` fill, `#E2E8F0` border, and `0.75rem` radius. Focus shifts border to `#2B8A88` with an ambient glow (`box-shadow: 0 0 0 3px rgba(43, 138, 136, 0.15)`).
- Wellness range sliders use an 8px thick track in `#E6F4F3`, filled progress in `#2B8A88`, and an oversized 24px pure white thumb with subtle elevation for frictionless dragging.

### Daily Timeline & List Items
- Flush left align with connected subtle vertical guides (`1.5px solid #E2E8F0`).
- Touch states use `#FAF9F6` highlight transitions.