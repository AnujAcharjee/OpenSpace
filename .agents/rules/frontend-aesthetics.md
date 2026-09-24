---
trigger: always_on
description: Core aesthetic guidelines, visual direction, color system, typography, and anti-slop rules for the illustrated stationery chat interface in project/apps/web-2.
---

# Frontend Aesthetics: Illustrated Stationery & Colored-Pencil Chat

This document defines the visual design system, color language, typography, and styling rules for `project/apps/web-2`.

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

### Desaturated Colored-Pencil Accents
Accent colors must feel like physical colored pencils gently applied to paper:
* **Dusty Teal (`--pencil-teal`)**: Highlights, selected channel markers, active tags
* **Muted Coral (`--pencil-coral`)**: Alerts, notifications, important badges
* **Mustard Yellow (`--pencil-yellow`)**: Mentions, stars, pinned markers
* **Sage Green (`--pencil-green`)**: Online presence indicators, success feedback
* **Faded Orange (`--pencil-orange`)**: System notices, unread indicators
* **Muted Slate Blue (`--pencil-blue`)**: Links, code block highlights

### CSS Variables Specification (`index.css` / Tailwind Tokens)
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
* **Channels**: Prefixed with hand-drawn hashtag/circle sketch icons.
* **Active Channel**: Highlighted as if gently marked with a colored-pencil highlighter (soft pastel tint background with a visible, confident pencil mark).
* **Unread Indicators**: Small hand-drawn coral pencil dots.

### 4.3 Header
* Slim stationery letterhead treatment with room title in editorial display typography.
* Subtle hand-drawn member count indicator (e.g., tiny illustrated group icon).
* Action buttons (Search, Call, Info) rendered as clean ink icons inside subtly rounded paper frames.

### 4.4 Message Composer
* Styled like a premium piece of stationery or a draftsman's desk pad.
* Soft paper surface, crisp 1.5px ink outline with slight organic curvature.
* Send button: Solid colored-pencil fill (teal or coral) with tactile press feedback (`active:translate-y-0.5`).
* Action buttons (attachments, emoji, audio): Small, hand-drawn outline icons that illuminate with pencil color upon hover.

### 4.5 Avatars & Presences
* Existing user avatar photos rendered inside slightly organic pencil-drawn frames (not sterile geometric circles).
* When initials fallback is displayed, use warm parchment tones with hand-lettered styled initials.
* Presence dot: Hand-drawn filled watercolor/pencil circle (sage green for online, muted graphite for offline).

### 4.6 Empty & Loading States
* **Empty Chat**: A delicate, minimal line illustration (e.g., an open sketchbook, a coffee cup, or an ink pen resting on a desk) accompanied by a thoughtful, concise handwritten greeting.
* **Loading State**: Subtle pencil-sketch pulse or drawing animation rather than harsh gray generic skeleton boxes.

---

## 5. Motion & Tactile Physics

* **Principles**: Micro-interactions must feel physical—like papers, cards, and stationery moving on a clean wooden desk.
* **Transitions**: Snappy and subtle (`cubic-bezier(0.16, 1, 0.3, 1)` or standard CSS ease).
* **Hover States**: Slight 1px paper lift (`translate-y-[-1px]`) and gentle pencil highlight.
* **Prohibitions**: No spinning 3D cubes, no bouncing arcade effects, no disorienting parallax.

---

## 6. Strict Anti-Slop Checklist

Before accepting any component in `project/apps/web-2`, verify that NONE of the following anti-patterns are present:
- [ ] No Inter font default.
- [ ] No purple-to-pink AI gradient backgrounds.
- [ ] No glassy/frosted blur overlays (glassmorphism).
- [ ] No generic Lucide icons used without styled sizing and stroke weight matching the ink aesthetic.
- [ ] No blinding pure white `#FFFFFF` canvases without warm paper grounding.
- [ ] No pixel art, 8-bit graphics, or noisy comic-book halftones.
- [ ] No giant hero 3D blobs or floating isometric cards.
- [ ] No broken typography contrast (ensure all text passes WCAG AA readability on paper surfaces).
