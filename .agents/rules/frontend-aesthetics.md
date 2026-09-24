---
trigger: always_on
description: Core aesthetic guidelines, visual direction, color system, typography, component specifications, and anti-slop rules for the illustrated stationery chat interface in project/apps/web2.0.
---

# Frontend Aesthetics: Illustrated Stationery & Colored-Pencil Chat

This document defines the visual design system, color language, typography, and styling rules for `project/apps/web2.0`.

---

## 1. Core Visual Direction

The goal is to create a distinctive, illustrated chat interface inspired by:
* Colored-pencil illustrations & architectural sketchbooks
* Hand-drawn editorial artwork & refined stationery
* Ink + pencil textures layered on natural paper
* Contemporary, sophisticated children's illustrated books (mature, not childish)
* High-end designer notebooks (e.g., Midori, Leuchtturm, Smythson)

### Conceptual Definition
> *"A modern, high-performance real-time chat application drawn with beautiful colored pencils and ink on fine paper."*

### Explicit Negative Constraints (What it is NOT)
* **NOT** a video game or retro arcade interface
* **NOT** pixel art or 8-bit / dithering / halftone
* **NOT** a goofy cartoon application or messy sketch
* **NOT** a generic blue SaaS dashboard with floating cards
* **NOT** glassmorphic, frosted blur, or purple AI gradient aesthetic

---

## 2. Color Language & Design Tokens

Use a warm, tactile paper base rather than sterile digital `#FFFFFF` or cold `#000000`.

### Neutral Paper & Ink Foundations
* **Warm Ivory / Soft Paper**: Primary app canvas and card surfaces
* **Muted Cream / Light Beige**: Chat area, sidebar contrasts, panels
* **Charcoal & Walnut Ink**: Primary text, crisp line work, active borders
* **Graphite & Soft Ink**: Secondary labels, timestamps, subtle dividers

### Card Contour & Golden Border Rules
* **Light Mode**: Thin, delicate golden contour border (`border-[#d4a03d]/40` or subtle 1px sand accent) on primary workspace desk cards (`Channels` and `ChatSection`).
* **Dark Mode**: Reverts strictly to standard muted contour (`border-line`). **Never** display golden borders in dark mode.

### Desaturated Colored-Pencil Accents
Accent colors must feel like physical colored pencils gently applied to paper:
* **Dusty Teal (`--pencil-teal`)**: Highlights, selected channel markers, active tags
* **Muted Coral (`--pencil-coral`)**: Alerts, notifications, important badges
* **Mustard Yellow (`--pencil-yellow`)**: Mentions, stars, pinned markers, "Discuss" category
* **Sage Green (`--pencil-green`)**: Online presence indicators, success feedback, "Explore" category
* **Faded Orange (`--pencil-orange`)**: System notices, unread indicators
* **Muted Slate Blue (`--pencil-blue`)**: Links, code block highlights, "Create" category

### CSS Variables Specification (`globals.css` / Tailwind Tokens)
```css
:root {
  /* Paper Surfaces */
  --paper: #FBF9F4;
  --paper-subtle: #F5F1E8;
  --paper-dark: #ECE5D8;
  --surface: #FFFFFF;
  --surface-hover: #F2ECE0;
  
  /* Ink & Lines */
  --ink: #262422;
  --ink-muted: #5E5852;
  --ink-subtle: #948C84;
  --line: #E2DACB;
  --line-strong: #C4B9A7;
  --line-sketch: #3A3530;

  /* Colored Pencil Accents */
  --pencil-teal: #3B7A77;
  --pencil-teal-soft: #D7EAE7;
  --pencil-coral: #C85C50;
  --pencil-coral-soft: #F7DDD9;
  --pencil-yellow: #D4A03D;
  --pencil-yellow-soft: #FAEFD4;
  --pencil-orange: #C96E42;
  --pencil-orange-soft: #F8E3D7;
  --pencil-green: #527A56;
  --pencil-green-soft: #DEEBDD;
  --pencil-blue: #4A6B8A;
  --pencil-blue-soft: #DDE7F2;

  /* Organic Geometry */
  --radius-sketch-sm: 8px 6px 9px 7px;
  --radius-sketch-md: 14px 11px 15px 12px;
  --radius-sketch-lg: 20px 18px 22px 17px;
}

.dark {
  /* Moody Draftsman / Blackbook Paper */
  --paper: #1A1917;
  --paper-subtle: #22201D;
  --paper-dark: #2B2925;
  --surface: #262421;
  --surface-hover: #32302C;
  
  --ink: #F2EFE8;
  --ink-muted: #AFA89D;
  --ink-subtle: #756F66;
  --line: #3D3934;
  --line-strong: #59534C;
  --line-sketch: #CCC5BA;

  --pencil-teal: #5FA3A0;
  --pencil-coral: #DE796E;
  --pencil-yellow: #E6B559;
  --pencil-orange: #DE875D;
  --pencil-green: #709E75;
  --pencil-blue: #6D91B5;
}
```

---

## 3. Typography & Editorial Hierarchy

Do **NOT** use generic default sans-serif fonts (Inter, Arial, Roboto).

* **Display / Headings**: Warm, editorial serif or distinctive craftsman typeface (e.g., *Fraunces*, *Newsreader*, *Playfair Display*, or *Outfit* / *Plus Jakarta Sans* with humanist warmth).
* **Interface & Body**: Highly legible, crisp editorial sans (e.g., *Plus Jakarta Sans*, *General Sans*, or *Cabinet Grotesk*).
* **Chat Messages & Readability**: Chat bubbles, usernames, timestamps, and input text must remain 100% readable at rapid glance. Do not sacrifice clarity for whimsy.
* **Code Blocks**: Clean draftsman monospace (e.g., *JetBrains Mono*, *Space Mono*) with a subtle lined-notebook border.

---

## 4. Component-by-Component Illustrated Language

### 4.1 Chat UI & Message Bubbles
* **Own Messages**: Soft warm paper surface with a subtle colored-pencil border (e.g., `--pencil-teal`), gently asymmetrical organic corners (`border-radius: 14px 11px 4px 12px`).
* **Other Users' Messages**: Pale cream paper surface with delicate graphite contour lines (`--line-strong`), rounded sketch corners (`border-radius: 4px 14px 12px 11px`).
* **System Notices**: Centered, small hand-drawn notebook badge with muted pencil ink and dashed horizontal sketch lines.
* **Replies & Thread Quotes**: Left-bordered with a colored-pencil stroke (2px solid with subtle texture), muted background block.
* **Reactions**: Pill badges resembling tiny hand-drawn stamps with colored-pencil fill on hover.

### 4.2 Sidebar & Channel Navigation
* Warm paper column with an intentional, thin ink divider.
* **Search Bar**: Full-width across the top of the sidebar.
* **Thin Action Buttons**: Directly below the search bar, two thin, text-only buttons side-by-side (`h-[22px]`, `py-0`, `text-[11px]`):
  - **Explore**: Green accent (`--pencil-green`), text-only, **no icon**. Switches chat section to Explore Channels view.
  - **Create**: Blue accent (`--pencil-blue`), text-only, **no icon** and **no `+` prefix**. Opens the Create Channel dialog.
* **No Orphaned Buttons**: Dialog triggers must only be rendered when explicitly passed via `trigger` prop to avoid phantom/misplaced buttons.
* **Channels**: Prefixed with hand-drawn hashtag sketch icons.
* **Active Channel**: Highlighted as if gently marked with a colored-pencil highlighter (soft pastel tint background with a visible, confident pencil mark).
* **Unread Indicators**: Small hand-drawn coral pencil dots.

### 4.3 Explore Channels (Master-Detail in Chat Space)
* Renders strictly inside the chat pane (replaces empty/chat view while exploring).
* **LHS (List Column)**:
  - Search box and scrollable topic filter pills (`All`, `Technology`, `Design`, `Gaming`, `Music`, `Crypto`, `Dev`, `Art`, `Science`, `News`, `Books`, `Lifestyle`).
  - Channel list showing avatar (`avi`), name (`#channel-name` with lock if private), and topic tags (`#Tech`, `#Design`).
  - Active selection highlighted with pencil border and tactile lift.
  - **Slow / Paginated Loading**: Backend fetches channels in small chunks (10 per batch with `limit` and `page`), appending upon scrolling down or clicking "Load more channels". Never fetch all channels at once.
* **RHS (Detail Preview Column)**:
  - Full channel preview card: large avatar banner, name, visibility badge, creation date, full topic tags list, description block, members preview, and Join/Open action button.
  - Header: Text-only `"Explore Channels"` without count numbers or compass icon.
* **Responsive Collapsing**: On small screens, LHS is visible by default; selecting a channel shows the RHS detail with a `"← Back to channels list"` button.

### 4.4 Channel Creation & Multi-Topic System
* Channels support multiple topics (`topics: string[]`).
* Dialog includes an interactive multi-topic chip selector with checkmarked active states.
* Submit payload sends `{ name, description, isPrivate, topics: selectedTopics, avatarUrl }`.
* Creation buttons must be text-only (`Create`), without `+` icons or prefixes.

### 4.5 Settings & Profile View
* Settings dialog opens to a static, read-only **Profile** view by default (showing avatar, name, username, bio, and role).
* An "Edit Profile" button with a pencil icon below the avatar switches into the edit form.

### 4.6 Header
* Slim stationery letterhead treatment with room title in editorial display typography.
* Subtle hand-drawn member count indicator (e.g., tiny illustrated group icon).
* Action buttons (Search, Call, Info) rendered as clean ink icons inside subtly rounded paper frames.

### 4.7 Message Composer
* Styled like a premium piece of stationery or a draftsman's desk pad.
* Soft paper surface, crisp 1.5px ink outline with slight organic curvature.
* Send button: Solid colored-pencil fill (teal or coral) with tactile press feedback (`active:translate-y-0.5`).
* Action buttons (attachments, emoji, audio): Small, hand-drawn outline icons that illuminate with pencil color upon hover.

### 4.8 Avatars & Presences
* Existing user avatar photos rendered inside slightly organic pencil-drawn frames (not sterile geometric circles).
* When initials fallback is displayed, use warm parchment tones with hand-lettered styled initials.
* Presence dot: Hand-drawn filled watercolor/pencil circle (sage green for online, muted graphite for offline).

### 4.9 Empty & Loading States
* **Empty Chat**: A delicate, minimal line illustration accompanied by a thoughtful greeting and quick-action cards (Discover Channels, Create Channel).
* **Loading State**: Subtle pencil-sketch pulse or drawing animation rather than harsh gray generic skeleton boxes.

---

## 5. Motion & Tactile Physics

* **Principles**: Micro-interactions must feel physical—like papers, cards, and stationery moving on a clean wooden desk.
* **Transitions**: Snappy and subtle (`cubic-bezier(0.16, 1, 0.3, 1)` or standard CSS ease).
* **Hover States**: Slight 1px paper lift (`translate-y-[-1px]`) and gentle pencil highlight.
* **Prohibitions**: No spinning 3D cubes, no bouncing arcade effects, no disorienting parallax.

---

## 6. Strict Anti-Slop Checklist

Before accepting any component in `project/apps/web2.0`, verify that NONE of the following anti-patterns are present:
- [ ] No Inter font default.
- [ ] No purple-to-pink AI gradient backgrounds.
- [ ] No glassy/frosted blur overlays (glassmorphism).
- [ ] No generic Lucide icons used without styled sizing and stroke weight matching the ink aesthetic.
- [ ] No blinding pure white `#FFFFFF` canvases without warm paper grounding.
- [ ] No golden borders in dark mode (light mode only).
- [ ] No icons on Explore and Create sidebar navigation buttons (must remain text-only `h-[22px]`).
- [ ] No `+` prefix or plus icon on the Create button.
- [ ] No channel count badges in Explore Channels header.
- [ ] No unpaginated / bulk fetching of all channels at once (must paginate with `limit: 10`).
- [ ] No pixel art, 8-bit graphics, or noisy comic-book halftones.
- [ ] No giant hero 3D blobs or floating isometric cards.
- [ ] No broken typography contrast (ensure all text passes WCAG AA readability on paper surfaces).
