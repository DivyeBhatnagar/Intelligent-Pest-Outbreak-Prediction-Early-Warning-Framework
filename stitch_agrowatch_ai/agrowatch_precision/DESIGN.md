---
name: AgroWatch Precision
colors:
  surface: '#f7f9ff'
  surface-dim: '#d1dbe8'
  surface-bright: '#f7f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#edf4ff'
  surface-container: '#e5effc'
  surface-container-high: '#dfe9f6'
  surface-container-highest: '#d9e3f1'
  on-surface: '#131c26'
  on-surface-variant: '#3b4a40'
  inverse-surface: '#28313b'
  inverse-on-surface: '#e8f2ff'
  outline: '#6b7b70'
  outline-variant: '#b9cbbe'
  surface-tint: '#006c46'
  primary: '#006c46'
  on-primary: '#ffffff'
  primary-container: '#00f0a0'
  on-primary-container: '#006843'
  inverse-primary: '#00e296'
  secondary: '#5e5e5e'
  on-secondary: '#ffffff'
  secondary-container: '#e2e2e2'
  on-secondary-container: '#646464'
  tertiary: '#52634b'
  on-tertiary: '#ffffff'
  tertiary-container: '#c6d8bb'
  on-tertiary-container: '#4e5f47'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#4dffb2'
  primary-fixed-dim: '#00e296'
  on-primary-fixed: '#002112'
  on-primary-fixed-variant: '#005234'
  secondary-fixed: '#e2e2e2'
  secondary-fixed-dim: '#c6c6c6'
  on-secondary-fixed: '#1b1b1b'
  on-secondary-fixed-variant: '#474747'
  tertiary-fixed: '#d5e8ca'
  tertiary-fixed-dim: '#baccaf'
  on-tertiary-fixed: '#111f0d'
  on-tertiary-fixed-variant: '#3b4b35'
  background: '#f7f9ff'
  on-background: '#131c26'
  surface-variant: '#d9e3f1'
  canvas: '#ffffff'
  surface-soft: '#f2f4f5'
  border-hairline: '#e5e7eb'
  risk-low: '#10b981'
  risk-moderate: '#f59e0b'
  risk-high: '#f97316'
  risk-critical: '#ef4444'
typography:
  display:
    fontFamily: Space Grotesk
    fontSize: 5rem
    fontWeight: '700'
    lineHeight: '1.05'
    letterSpacing: -0.02em
  display-mobile:
    fontFamily: Space Grotesk
    fontSize: 2.5rem
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 3.75rem
    fontWeight: '700'
    lineHeight: '1.1'
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 2rem
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: '0'
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 3rem
    fontWeight: '700'
    lineHeight: '1.15'
    letterSpacing: '0'
  headline-md-mobile:
    fontFamily: Space Grotesk
    fontSize: 1.75rem
    fontWeight: '700'
    lineHeight: '1.25'
    letterSpacing: '0'
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 2.375rem
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: '0'
  headline-sm-mobile:
    fontFamily: Space Grotesk
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: '1.3'
    letterSpacing: '0'
  title-lg:
    fontFamily: Space Grotesk
    fontSize: 2rem
    fontWeight: '600'
    lineHeight: '1.25'
    letterSpacing: '0'
  title-md:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: '0'
  body-lg:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-md:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '500'
    lineHeight: '1.6'
    letterSpacing: '0'
  body-sm:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '500'
    lineHeight: '1.5'
    letterSpacing: '0'
  label-md:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '600'
    lineHeight: '1'
    letterSpacing: '0'
  label-sm:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '600'
    lineHeight: '1.4'
    letterSpacing: 0.01em
  caption:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: 0.02em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-sm: 1rem
  margin: 2rem
  margin-sm: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
  space-xxl: 3rem
  space-section: 6rem
---

## Brand & Style

This design system establishes a high-performance visual language engineered for mission-critical agritech operations, autonomous field telemetry, and GIS pest surveillance. It bridges algorithmic precision with visceral ecological urgency. 

The aesthetic is High-Contrast Modern Utility rooted in clear, flat surface banding and bold structural typography. Visual weight shifts between clinical white dashboards, tactical pale-mint analytical fields, and pure jet-black deep surveillance bands. The system communicates definitive operational clarity, extreme reliability, and ecological stewardship to enterprise agronomists, farm operators, and regional bio-security teams.

## Colors

The palette operates under a high-contrast chromatic system:
- **Primary (`#00f0a0`)**: Reserved strictly for high-priority operational triggers, positive threshold signals, active GIS layers, and focal confirmation actions. It is paired with pure black text (`#000000`) when used as a fill.
- **Secondary (`#000000`)**: Deep ink black. Used for command-level headers, primary CTA pills, high-density data tables, and full-bleed incident inspection bands.
- **Tertiary (`#ecffe0`)**: Pale bio-mint. Applied as a background surface band to ground dense geospatial heatmaps and AI confidence cards without causing visual exhaustion.
- **Neutral & Structural (`#86909c`, `#f2f4f5`, `#e5e7eb`)**: Crisp hairpins and low-friction neutral backdrops maintain readability across tabular telemetric logs and GIS map overlays.

### Semantic Risk Matrix
Pest outbreak and spread severity use explicit four-tier alerting tokens:
- **Low**: `#10b981` (Nominal field status, baseline presence)
- **Moderate**: `#f59e0b` (Localized scouting needed, population threshold nearing trigger)
- **High**: `#f97316` (Active vector dispersion, immediate intervention advised)
- **Critical**: `#ef4444` (Severe outbreak detected, quarantine/spraying protocol active)

## Typography

The type scale pairs high-impact technical titling with high-density utilitarian data fonts.

- **Headline Family (Space Grotesk)**: Chosen for its industrial, geometric authority, echoing telemetry gauges and GIS readouts. Set with negative letter-spacing and tight line heights for immediate impact.
- **Body & Interface Family (Inter)**: Delivers uncompromising legibility across dense sensor grids, coordinate listings, AI confidence intervals, and field logs.
- Large titles scale down aggressively on mobile viewport breakpoints to avoid awkward line wrapping in field-agent interfaces.

## Layout & Spacing

The layout is built upon an 8px grid with a 4px sub-grid for high-density tabular and GIS controls. 

- **Layout Structure**: 12-column responsive fluid grid spanning an intentional maximum content boundary of `1200px` for analytic dashboards, flanked by full-bleed background bands (`#ffffff`, `#ecffe0`, `#000000`) to partition distinct surveillance phases.
- **Responsive Adaptations**:
  - **Desktop (≥ 1200px)**: 12-column layout with `24px` (`1.5rem`) gutters and full multi-pane views (GIS map, telemetry sidebars, log streams).
  - **Tablet (576px – 1199px)**: Columns collapse to 6 or 4. Complex telemetry sidebars dock into expandable bottom sheets.
  - **Mobile (< 576px)**: Single column stream with `16px` (`1rem`) outer canvas margins. Multi-action buttons stretch to full container width.

## Elevation & Depth

This design system discards heavy drop shadows in favor of **structural banding and architectural flat layering**:

- **Tonal Sectioning**: Depth is created by alternating pure `#ffffff` canvas surfaces with tinted `#ecffe0` bio-mint zones and `#000000` dark command bands.
- **Hairline Enclosures**: Component division and table cell separations use crisp `1px solid #e5e7eb` lines.
- **Whisper Float**: When modal dialogs, flyout GIS panels, or elevated AI alerts must hover above active maps, use a diffuse, untinted boundary elevation: `0 8px 30px rgba(0, 0, 0, 0.06)` combined with a `1px solid #e5e7eb` border.
- **High-Contrast Hard Insets**: Focus and active state toggles utilize a defined `0px 0px 0px 1px #000000` or `0px 0px 0px 2px #00f0a0` ring.

## Shapes

The shape hierarchy combines rounded contours with functional geometries:
- **Pills (`rounded-full` / `28px–36px`)**: Reserved for actions, category filters, and quick-filter telemetry chips. Buttons utilize exaggerated horizontal margins inside rounded pill envelopes.
- **Analytical Cards (`16px–24px`)**: Surface cards, telemetry metric blocks, and scout summary containers employ consistent `16px` to `24px` corner radii.
- **Signature Feature Silhouette**: Specialized preview cards leverage an asymmetrical `0px 40px 40px 0px` or `40px 40px 40px 0px` corner configuration to mirror technical framing apertures.

## Components

### Buttons
- **Primary Dark Action**: Background `#000000`, text `#ffffff`, border-radius `28px`, padding `12px 32px` (desktop feature buttons expand to `12px 96px`). Font `Inter`, semi-bold 16px.
- **Signature Accent Action (`button-green`)**: Background `#00f0a0`, text `#000000`, border `1px solid #000000`, border-radius `36px`, padding `12px 48px`. Used exclusively for critical mission triggers (e.g., "Dispatch Drone Sweep", "Export Surveillance Alert").
- **Compact Secondary Action**: Background `#ffffff`, text `#000000`, border `1px solid #e5e7eb`, border-radius `18px`, padding `6px 16px`.

### Badges & Semantic Risk Indicators
- Compact pills (`border-radius: 9999px`, padding `4px 10px`, font size `12px`, font weight `600`).
- **Low Risk**: Background `#ecffe0`, text `#065f46`, border `1px solid #10b981`.
- **Moderate Risk**: Background `#fffbeb`, text `#b45309`, border `1px solid #f59e0b`.
- **High Risk**: Background `#fff7ed`, text `#c2410c`, border `1px solid #f97316`.
- **Critical Risk**: Background `#fef2f2`, text `#b91c1c`, border `1px solid #ef4444`.

### AI Confidence Score Rings
- Circular containers (`64px × 64px`, border-radius `50%`), filled with `#ffffff`, bounded by a `2px solid #00f0a0` or `#000000` track.
- Centered score rendered in `Space Grotesk` 20px, bold.

### Data Tables & Pest Telemetry Logs
- Headers: Background `#f2f4f5`, text `#86909c`, font size `13px`, font weight `600`, text transform uppercase, border-bottom `1px solid #e5e7eb`.
- Cells: Vertical padding `12px`, horizontal padding `16px`, text `#000000`, font size `14px`, regular weight, row separators `1px solid #e5e7eb`.
- Hover state: Background `#ecffe0` transitioning smoothly.

### Inputs & GIS Query Filters
- Form inputs: Height `44px`, background `#ffffff`, border `1px solid #e5e7eb`, border-radius `12px` (or `9999px` for search pills), text `#000000`, placeholder `#86909c`.
- Focus state: Border color `#000000`, shadow `0 0 0 2px rgba(0, 240, 160, 0.35)`.

### Cards & Inset Panels
- **Standard Card**: Background `#ffffff`, border `1px solid #e5e7eb`, border-radius `24px`, internal padding `24px`.
- **Hero / Bio-Mint Inset**: Background `#ecffe0`, border `1px solid rgba(0, 240, 160, 0.4)`, border-radius `24px`, padding `24px`.
- **Command Deck Panel**: Background `#000000`, text `#ffffff`, border-radius `24px`, padding `32px`.