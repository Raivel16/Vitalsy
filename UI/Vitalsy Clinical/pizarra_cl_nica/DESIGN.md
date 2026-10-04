---
name: Pizarra Clínica
colors:
  surface: '#f6f9ff'
  surface-dim: '#d4dbe3'
  surface-bright: '#f6f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#edf4fd'
  surface-container: '#e8eff7'
  surface-container-high: '#e2e9f1'
  surface-container-highest: '#dce3eb'
  on-surface: '#151c22'
  on-surface-variant: '#3f484b'
  inverse-surface: '#2a3137'
  inverse-on-surface: '#ebf1fa'
  outline: '#6f797b'
  outline-variant: '#bfc8cb'
  surface-tint: '#186777'
  primary: '#005260'
  on-primary: '#ffffff'
  primary-container: '#1e6b7b'
  on-primary-container: '#a4e9fc'
  inverse-primary: '#8cd1e3'
  secondary: '#52606c'
  on-secondary: '#ffffff'
  secondary-container: '#d3e1f0'
  on-secondary-container: '#566470'
  tertiary: '#6d3f10'
  on-tertiary: '#ffffff'
  tertiary-container: '#895626'
  on-tertiary-container: '#ffd6b7'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#aaedff'
  primary-fixed-dim: '#8cd1e3'
  on-primary-fixed: '#001f26'
  on-primary-fixed-variant: '#004e5c'
  secondary-fixed: '#d6e4f3'
  secondary-fixed-dim: '#bac8d6'
  on-secondary-fixed: '#0f1d27'
  on-secondary-fixed-variant: '#3b4854'
  tertiary-fixed: '#ffdcc2'
  tertiary-fixed-dim: '#fcb97f'
  on-tertiary-fixed: '#2e1500'
  on-tertiary-fixed-variant: '#693c0d'
  background: '#f6f9ff'
  on-background: '#151c22'
  surface-variant: '#dce3eb'
typography:
  headline-xl:
    fontFamily: Source Sans 3
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
  headline-lg:
    fontFamily: Source Sans 3
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Source Sans 3
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  headline-sm:
    fontFamily: Source Sans 3
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Source Sans 3
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Source Sans 3
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Source Sans 3
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Source Sans 3
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.1px
  label-md:
    fontFamily: Source Sans 3
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.2px
  label-sm:
    fontFamily: Source Sans 3
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.3px
  metric-display:
    fontFamily: Source Sans 3
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 32px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system is engineered specifically for mission-critical Latin American hospital operations, EHR interfaces, and real-time clinical workflows. The operational context requires immediate comprehension under high cognitive load, low ambient light or high-glare ward terminals, and shared triage monitors.

The emotional baseline is calibrated precision, clinical serenity, and institutional permanence:
- **Tone:** Methodical, unhurried, reassuringly structured, and authoritative.
- **Design Movement:** Clean Clinical Functionalism—a refined balance of modern corporate systems with low-strain utilitarian surface structures. It eliminates decorative noise, high-gloss gradients, and distracting micro-animations in favor of rock-solid visual anchoring, unambiguous data density, and tactile status readability.
- **Audience:** Physicians, charge nurses, hospital administrators, and triage coordinators who require faultless legibility and ergonomic muscle memory across 12-hour shifts.

## Colors

The palette establishes an ergonomic hierarchy optimized to reduce eye fatigue across continuous shift usage:

- **Primary Canvas & Surfaces:**
  - `Canvas (#ECEEF1)`: Ground level for the core application viewport, separating operational chrome from active patient records.
  - `Surface (#FFFFFF)`: Elevated cards, modal dialogs, and focused observation charts.
  - `Surface-sunken (#F4F6F8)`: Secondary panels, table column headers, and quiet diagnostic backgrounds.
- **Typography & Structural Contrast:**
  - `Text (#1B2228)`: Deep charcoal ink ensuring WCAG AAA legibility against white and sunken planes.
  - `Text-muted (#4E5C68)`: Secondary clinical labels, unit identifiers (mmHg, bpm), and structural metadata.
  - `Border (#D1D6DC)`: Definitive boundary definition for split-second layout zoning without visual weight.
- **Clinical Interaction Accent:**
  - `Accent (#1E6B7B)`: Teal slate hue representing focused agency, active patient files, and primary actions.
  - `Accent-hover (#165360)` & `Accent-soft (#E6EFF1)`: Interactive states and quiet selection indicators.
  - `Focus (#1E6B7B)`: Unbroken 2px focus ring with 2px offset for strict keyboard accessibility.
- **Operational Triage & Status Roles:**
  - `Info`: Text `#2B6CB0` on Background `#EBF3F8`
  - `Success`: Text `#237039` on Background `#EBF6EE`
  - `Warning`: Text `#8C6008` on Background `#FCF6E8`
  - `Danger`: Text `#B3261E` on Background `#FDF0ED`
- **Locked Clinical Protocols (NEWS2 & Bed Capacity):**
  - *NEWS2 0 (Low risk)*: `#237039` on `#EAF2ED`
  - *NEWS2 3 (Low-medium)*: `#8C6008` on `#FCF6E8`
  - *NEWS2 6 (Medium)*: `#9A4F06` on `#FAEEDB`
  - *NEWS2 8+ (High emergency)*: `#B3261E` on `#FDF0ED`
  - *Cama Disponible*: Fill `#EAF2ED` / Stroke `#C0D8C8` / Text `#1B522A`
  - *Cama Ocupada*: Fill `#E8EBEE` / Stroke `#CAD1D8` / Text `#3D4852`
  - *Cama Limpieza*: Fill `#E7EEF5` / Stroke `#BED0E3` / Text `#1D4F82`
  - *Cama Aislamiento*: Fill `#EFEAF5` / Stroke `#CEBFDF` / Text `#532E7B`

## Typography

The design system exclusively adopts `Source Sans 3` for all clinical surfaces. Its humanist geometry delivers exceptional legibility on low-resolution hardware, distinguishes ambiguous glyphs (such as uppercase `I`, lowercase `l`, and the numeral `1`), and maintains open counters at compact sizes.

- **Numerics & Tabular Data:** All clinical values (heart rates, arterial pressures, lab quantifications) must enforce `font-feature-settings: "tnum" 1` to ensure vertical column alignment across real-time observation feeds.
- **Labels vs Body Text:** Clinical labels use semi-bold (`600`) weights with gentle positive letter-spacing to prevent character bleeding when viewed from arm's-length triage stations.
- **Hierarchy Rules:** Patient identifiers leverage `headline-lg` (desktop) and `headline-md` (mobile), vital metric readouts map to `metric-display`, and inline nursing chart annotations use `body-md`.

## Layout & Spacing

Layout geometry follows a dual-axis operational framework designed for desktop hospital workstations while scaling down to hand-held clinical tablets:

- **App Chrome Dimensions:**
  - **Top Bar:** Fixed `68px` height containing the active service selector, ward context, global emergency banner hook, and current user credentials.
  - **Sidebar Navigation:** Fixed `256px` width on desktop displays (`>= 1024px`), collapsible to a `64px` icon rail on tablet viewports (`768px - 1023px`), and converting to a temporary drawer under `768px`.
- **Canvas Matrix:**
  - Standard fluid 12-column layout spanning the area remaining between the fixed navigation rail and the canvas edge.
  - `margin`: `1.5rem` (24px) for full outer viewports, collapsing to `1rem` (16px) on mobile triage devices.
  - `gutter`: `1rem` (16px) between patient cards, ward beds, and diagnostic data tiles.
- **Vertical Rhythm:** 4px baseline rhythm with `0.5rem` (8px) internal card component gaps, preventing horizontal truncation while keeping vital metrics within immediate eye scan bounds.

## Elevation & Depth

To avoid distracting visual noise in high-density clinical charts, the design system utilizes low-contrast structural boundaries supplemented by restrained ambient shadows.

- **Level 0 (Flat Canvas & Sunken Planes):** Background `#ECEEF1` and grouped container background `#F4F6F8`. 0px elevation. Demarcated strictly through 1px solid borders (`#D1D6DC`).
- **Level 1 (Cards, Observation Modules, Bed Blocks):** Surface `#FFFFFF`. Bounded by `1px solid #D1D6DC`, with ambient grounding: `0px 1px 3px rgba(27, 34, 40, 0.06), 0px 1px 2px rgba(27, 34, 40, 0.04)`.
- **Level 2 (Dropdowns, Flyouts, Popovers):** Surface `#FFFFFF`. Elevation: `0px 4px 12px rgba(27, 34, 40, 0.08), 0px 1px 3px rgba(27, 34, 40, 0.06)`. Border remains active.
- **Level 3 (Emergency Modals, Triage Sheets):** Surface `#FFFFFF`. Elevation: `0px 12px 24px -4px rgba(27, 34, 40, 0.12), 0px 4px 8px -2px rgba(27, 34, 40, 0.06)`. Accompanied by a canvas scrim tinted `#1B2228` at 40% opacity.

## Shapes

Corner radii strictly delineate interactive controls from structural containment sheets:

- **Interactive Controls (Inputs, Buttons, Segmented Selectors):** Explicitly set to `10px`. This offers an approachable touch target that remains precise and functional without ballooning into toy-like pills.
- **Structural Cards & Overlay Sheets:** Explicitly set to `12px`. Softens dense multi-patient grid layouts while keeping data cells orderly.
- **Navigation Items & Sub-nav Pills:** Explicitly set to `8px`. Preserves vertical real estate within the `256px` sidebar and facilitates crisp alignment along the `68px` top bar.
- **Badges & NEWS2 Scores:** Compact rectangular tags with `6px` radius to maintain immediate tabular scan lines.

## Components

- **Buttons:**
  - *Primary*: Background `#1E6B7B`, text `#FFFFFF`, border none, border-radius `10px`. Height: 40px (desktop), 44px (touch). Hover: `#165360`. Focus: 2px ring `#1E6B7B` with 2px offset.
  - *Secondary*: Surface `#FFFFFF`, text `#1B2228`, border `1px solid #D1D6DC`, border-radius `10px`. Hover: `#F4F6F8`.
  - *Danger*: Background `#B3261E`, text `#FFFFFF`.
- **Input Fields & Selectors:**
  - Height 40px, background `#FFFFFF`, border `1px solid #D1D6DC`, text `#1B2228`, radius `10px`, padding `0 12px`.
  - Hover: border `#4E5C68`. Active/Focus: border `#1E6B7B` with outer ring glow `0 0 0 3px #E6EFF1`.
  - Prefix/suffix unit labels (e.g., `mmHg`, `°C`) set in `label-sm` with text `#4E5C68` on `#F4F6F8` caps.
- **Checkboxes & Radios:**
  - Checkboxes: 18x18px box, radius 4px, border `1.5px solid #4E5C68`. Checked state: background `#1E6B7B`, white checkmark.
  - Radios: 18x18px circle, border `1.5px solid #4E5C68`. Checked state: background `#FFFFFF`, inner bullet `#1E6B7B` (8px).
- **Cards & Clinical Modules:**
  - Background `#FFFFFF`, radius `12px`, border `1px solid #D1D6DC`.
  - Header padding `12px 16px`, body padding `16px`. Header border-bottom `1px solid #ECEEF1`.
- **NEWS2 Clinical Severity Indicators:**
  - Standardized chip format: padding `4px 8px`, border-radius `6px`, font `label-md` with tabular numbers.
  - *Level 0*: text `#237039`, background `#EAF2ED`, border `1px solid #C0D8C8`.
  - *Level 3*: text `#8C6008`, background `#FCF6E8`, border `1px solid #EADBBA`.
  - *Level 6*: text `#9A4F06`, background `#FAEEDB`, border `1px solid #ECCFA4`.
  - *Level 8+*: text `#B3261E`, background `#FDF0ED`, border `1px solid #F5C6C2`, font-weight `700`.
- **Bed Status Tags (Gestión de Camas):**
  - Height 24px, uppercase `label-sm`, padding `2px 8px`, radius `6px`.
  - *Disponible*: Fill `#EAF2ED`, border `#C0D8C8`, text `#1B522A`.
  - *Ocupada*: Fill `#E8EBEE`, border `#CAD1D8`, text `#3D4852`.
  - *Limpieza*: Fill `#E7EEF5`, border `#BED0E3`, text `#1D4F82`.
  - *Aislamiento*: Fill `#EFEAF5`, border `#CEBFDF`, text `#532E7B`.
- **Navigation Rails & Top Bar:**
  - Sidebar: Width `256px`, background `#FFFFFF`, border-right `1px solid #D1D6DC`. Nav items have height 38px, radius `8px`, margin `0 8px 4px 8px`. Active item: background `#E6EFF1`, text `#1E6B7B`, font-weight `600`.
  - Top Bar: Height `68px`, background `#FFFFFF`, border-bottom `1px solid #D1D6DC`, horizontal padding `24px`.