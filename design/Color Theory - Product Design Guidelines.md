# Color Theory for Product Design

> The 60/30/10 rule works for general design, but product design follows different rules.
> These four layers build a complete, functional color system.

---

## Layer 1: Neutral Foundation

### Backgrounds

- Most products use near-white backgrounds: 98%–100% white
- Landing pages need **3–5 neutrals**
- Product design needs significantly more:
  - **4 layers of backgrounds** (minimum)
  - **1–2 stroke colors**
  - **~3 text variants**
  - Plus hover states and interactivity colors

### Building the Frame (Sidebar / Shell)

- The app frame/sidebar is a **slightly darker anchor**
- Only needs to be **~2% darker** than the main background (it's a large element, so subtlety is enough)
- You can tint it — e.g., add 2% blue to the sidebar

### Cards & Content Surfaces

Light mode is flexible — three valid approaches:

| Pattern                | Example    |
|------------------------|------------|
| Dark background + lighter cards | Vercel |
| Light background + darker cards | Notion |
| Monochromatic layers           | Supabase |

- **Darker cards** are often the same color as your sidebar
- **Lighter cards** can be pure white — which is why your main background should *not* be pure white

### Borders & Strokes

- Cards on a light background without borders look **washed out**
- A subtle drop shadow alone is barely better
- **Don't use thin black borders** — they overpower the design
- Use **~85% white** for borders: defines the edge without dominating

### Buttons

> The more important a button is, the darker it is.

- Ghost buttons (least important) are lightest
- Black buttons with white text (most important) are darkest
- Multi-purpose buttons sit around **90–95% white**

### Text

| Role           | Approximate Value     |
|----------------|----------------------|
| Important headings | ~11% white (near black, but not pure black) |
| Body text      | 15–20% white         |
| Subtext / secondary | 30–40% white    |

---

## Layer 2: Functional Accent Color

### Choosing a Brand Color

- Some products stay fully neutral (Vercel = black/white)
- Others are defined by their accent (Linear = blue-purple, Supabase = bright green)
- **Don't think of your accent as a single color** — think of it as a **scale from lightest to darkest**

### Using the Color Ramp

| Usage          | Shade   |
|----------------|---------|
| Main / primary | 500–600 |
| Hover state    | 700     |
| Links          | 400–500 |

- Use tools like **UI Colors** to generate a full ramp
- This ramp also helps when building dark mode

---

## Dark Mode

### Key Principle: Double the Distance

- Dark colors look more similar to each other, so they need **more spacing** to appear distinct
- If light mode has **~2% white** between background layers, dark mode needs **4–6%** between them
- Simply mirroring your light palette will lose all distinction between background elements

### Dark Mode Accent Colors

| Usage          | Shade   |
|----------------|---------|
| Primary brand  | 300–400 |
| Hover state    | 400–500 |

### Other Dark Mode Adjustments

- **Dim the text** (don't use the same brightness as light mode)
- **Brighten borders** (they need more contrast against dark backgrounds)

### Dark Mode Surface Rules

> Unlike light mode, dark mode is **not flexible**.

- Surfaces **always get lighter as they elevate**
- Raised cards need a **lighter color** or a **visible border**

---

## Layer 3: Semantic Communication

### Meaning Through Color

- Colors convey meaning and **break the neutral system by necessity**
- Even with a neutral brand, you need semantic colors for:
  - **Success** (green)
  - **Error / failure** (red)
  - **In progress / warning** (yellow/amber)
- **Destructive actions must always be red** — regardless of brand color

### Charts & Data Visualization

- Neutral-only charts are dull
- Using only the brand color ramp makes segments look too similar
- You need a **full spectrum** of colors

### The OKLCH Solution

- Problem: bright green appears far more "neon" than bright blue at the same HSL values
- **OKLCH** (Oklch color space) accounts for **human perception of color**
- It produces the **same perceived brightness** across different hues

**How to generate a chart palette:**

1. Go to **oklch.com**
2. Set a consistent **lightness** and **chroma**
3. Increment the **hue by 25–30 degrees** per color
4. Each resulting color will feel equally vibrant

---

## Layer 4: Theming

### Turning Neutrals into Themed Colors

Using the OKLCH color system, you can theme any design to any hue:

**For each neutral in your palette:**

1. Plug the hex value into OKLCH
2. **Drop lightness by 0.003**
3. **Increase chroma by 0.02**
4. **Adjust the hue** to your target theme color

This produces accurate themed variants — red, green, blue, etc. — every time.

- Works for both light and dark mode (arguably even better for dark mode)

---

## Quick Reference Summary

| Concept | Guideline |
|---------|-----------|
| Backgrounds | 4+ layers, 98–100% white base |
| Sidebar | ~2% darker than main background |
| Light cards | Can be pure white (don't use pure white as background then) |
| Borders | ~85% white, never thin black |
| Button importance | Darker = more important |
| Headings | ~11% white |
| Body text | 15–20% white |
| Subtext | 30–40% white |
| Accent primary | 500–600 shade |
| Accent hover | 700 shade |
| Dark mode spacing | Double the light mode distance (4–6%) |
| Dark mode surfaces | Lighter = more elevated |
| Semantic colors | Always needed, red = destructive |
| Chart palette | OKLCH, increment hue by 25–30 |
| Theming | OKLCH: lightness -0.003, chroma +0.02, adjust hue |
