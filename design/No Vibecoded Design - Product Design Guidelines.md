# Fixing Vibe-Coded Design: From AI Output to Professional Product

> AI can build functional software, but the design it produces has consistent, fixable problems.
> These guidelines turn a rough vibe-coded app into something that looks and feels professional.

---

## 1: Icons — Replace Emojis Immediately

- **Get rid of emojis.** They are the most obvious sign of AI-generated design.
- Some apps (Notion) pull off emojis, but yours almost certainly won't.
- Swap to a professional **interface icon library**:
  - Phosphor Icons
  - Lucide
  - Any other clean icon set
- This single change already makes a noticeable difference.

---

## 2: Color — Never Let AI Choose Colors

- AI defaults to **bright, clashing colors** that don't work together.
- Strip out bright colored backgrounds and replace with muted, intentional tones.
- Remove decorative colored icons and buttons that add no real information.
- Use **color through data** (charts, micro-charts) instead of through decoration.

### Where Color Should Come From

| Good Source of Color      | Bad Source of Color        |
|---------------------------|---------------------------|
| Charts and data viz       | Bright background blocks  |
| Semantic indicators       | Random colored icons      |
| Subtle status cues        | Gradient profile circles  |
| Helpful inline icons      | Decorative buttons        |

---

## 3: Layout — Never Let AI Choose Your Layout Either

AI produces layouts with recurring structural problems. Fix them manually.

### Sidebar

- Remove irrelevant links — if you're on a specific page, you don't need dashboard KPIs visible everywhere.
- **Align text to the left** and **tighten spacing**.
- Replace AI's gradient letter-circle avatars with a proper **account card**.
- Tuck secondary links (settings, billing, usage) into a **popover on click** instead of listing them all.
- Collapse related sections together.

### Cards & Content

- If cards feel busy, **collapse action buttons into a triple-dot menu**.
- Move secondary info (dates) to less prominent positions.
- Collapse tag/chip sets down to **just icons** when the label isn't essential.
- Move key metrics (e.g., click counts) to a consistent position (right side).

### Repeated Information

- Watch for **KPIs or data appearing multiple times** across the app — a classic AI pattern.
- If the same stats show up on the dashboard, the sidebar, and a detail page, consolidate them.
- Each piece of information should live in **one clear, intentional location**.

---

## 4: Modals Over Inline Forms

- AI tends to create sparse inline forms even when there's plenty of screen space.
- If a form has few fields but could grow, a **modal is more fitting**.
- Collapse advanced options by default.
- Give the modal a clean, modern look.
- Modals also allow more features to easily slot in later.

---

## 5: Feature Design — Add the Low-Hanging Fruit

AI sets up logic well when told to, but it misses **simple features that dramatically improve UX**.

### Examples of High-Impact, Easy Features

- **Toggle to split data by individual items** — lets users compare entries against each other
- **Richer table rows** — pack more useful info per row with helpful icons that also add color
- **Data visualization upgrades** — swap boring bar charts for maps with shaded regions and side-panel data
- **Missing fields** — AI often omits obvious options (custom domains, descriptions, etc.)

---

## 6: Billing & Pricing Pages

AI-generated billing pages are consistently poor. Expect to rebuild from scratch.

### Common AI Mistakes

| Problem | Fix |
|---------|-----|
| Decorative cards that do nothing | Remove them entirely |
| Confusing pricing (discounts hidden, order unclear) | Show actual prices clearly |
| Too many plan tiers (5+) | Cut to 3–4 max; drop the least useful tier |
| Plan names oversized, prices undersized | **Shrink the plan name, enlarge the cost** — users care about price |
| No visible discount | **Show the actual discount amount** the user is getting |
| No comparison to next tier | Show what the **next plan includes that the current doesn't** |

### Billing Page Structure

- Use a **two-column layout** with small donut charts for usage stats.
- Use **tabs** to separate Usage, Billing, and other sections.
- Include billing email and payment method for completeness.
- Tabs scale well — easy to add Integrations, AI, Documents, etc. later.

### Pricing Pattern Reference

> This tier-comparison pricing pattern is extremely common in products like Resend and Supabase.

---

## 7: Analytics Pages

### Fixing AI Analytics

1. **Remove duplicate KPIs** that already appear elsewhere.
2. **Remove unnecessary tab rows** if they serve no purpose.
3. **Move action buttons** to logical positions near the data they affect.
4. Add a **toggle to view individual item breakdowns** for comparison.
5. Add **rich row data** with icons that provide color and quick recognition.
6. Replace basic bar charts with **richer visualizations** — maps with shaded regions and accompanying data panels.

---

## 8: Landing Pages

> This is where you lose most customers if you vibe-code it.

There is a **standard of quality** on SaaS landing pages that establishes trust, even subconsciously.

### Key Principles

- Apply the same **color and layout principles** from the product itself.
- **You need graphics.** Text-only landing pages don't convert.
- Even simple visuals work — e.g., link cards with a slight skew/rotation.
- Replace generic AI icons with **slightly edited screenshots of your actual product**.
- Show real features visually (analytics page screenshot, password protection UI, etc.).

> Landing pages aren't about complexity — they're about **presentation**.
> Better presentation = better conversion.

---

## Quick Reference: AI Design Red Flags

| Red Flag | Professional Fix |
|----------|-----------------|
| Emojis as icons | Use Phosphor, Lucide, or similar icon library |
| Bright clashing colors | Muted neutrals; color through data, not decoration |
| Gradient letter avatars | Account card with popover |
| Same KPIs shown 3 times | One clear location per metric |
| All actions visible at once | Triple-dot menus, popovers, collapsed sections |
| Sparse inline creation forms | Modal with collapsible advanced options |
| 5+ pricing tiers | 3–4 tiers max, clear comparison |
| Plan name bigger than price | Price prominent, name small |
| Basic bar charts only | Maps, donut charts, micro-charts, richer viz |
| No landing page graphics | Product screenshots, skewed cards, real visuals |
| Decorative cards with no function | Delete them |
