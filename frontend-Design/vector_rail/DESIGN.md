# Design System Specification: Kinetic Intelligence

## 1. Overview & Creative North Star

### The Creative North Star: "The Kinetic Conductor"
This design system is not a static interface; it is a living, breathing command center. We are moving away from the "dashboard-in-a-box" aesthetic toward **The Kinetic Conductor**. The goal is to visualize the invisible flow of railway traffic with the precision of a high-end timepiece and the atmospheric depth of a futuristic cockpit.

To achieve this, we break the "template" look through **intentional asymmetry** and **tonal depth**. We prioritize data visualization as art, using overlapping glass layers and high-contrast typography to ensure that critical AI-driven decisions feel both authoritative and effortless. This is a system built for high-stakes reliability, wrapped in a premium, editorial digital experience.

---

## 2. Colors & Surface Philosophy

The palette is rooted in a deep, celestial dark theme, utilizing vibrant cyan and blue accents to represent "live" AI energy.

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to define sections. Traditional lines clutter the "Kinetic" flow. Instead, boundaries must be defined solely through:
1.  **Background Color Shifts:** A `surface-container-low` section sitting on a `surface` background.
2.  **Tonal Transitions:** Using subtle shifts in the neutral scale to imply separation.
3.  **Negative Space:** Leveraging the spacing scale to let the eye define the edge.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers—like stacked sheets of frosted glass.
*   **Base:** `surface` (#131313) is the canvas.
*   **Level 1:** `surface-container-low` for large structural groupings.
*   **Level 2:** `surface-container` for primary interactive cards.
*   **Level 3:** `surface-container-highest` for active modals or prioritized AI alerts.

### The "Glass & Gradient" Rule
To elevate the experience beyond flat design, all floating elements must utilize **Glassmorphism**:
*   **Backdrop Blur:** 20px to 40px.
*   **Fill:** Use `surface` or `surface-variant` at 60-80% opacity.
*   **Glow Accents:** Use a subtle linear gradient (from `primary` to `primary-container` at 15% opacity) on the background of main CTAs to provide a "soul" to the professional polish.

---

## 3. Typography

The system utilizes two distinct typefaces to balance technical precision with modern readability.

*   **Display & Headlines (Space Grotesk):** This is our "Command" font. Its geometric quirks and wide apertures convey a futuristic, high-tech personality. Use it for data points, titles, and high-level metrics.
*   **Body & Labels (Manrope):** Our "Functional" font. Manrope provides exceptional legibility at small scales, essential for railway schedules, coordinates, and system logs.

**Hierarchy as Identity:**
*   **Dramatic Scale:** Use `display-lg` (3.5rem) for critical system status (e.g., "ON TIME") to create a focal point.
*   **The Utility Label:** Use `label-sm` (Manrope, 0.6875rem) with increased letter spacing for metadata. This mimics the aesthetic of technical engineering blueprints.

---

## 4. Elevation & Depth

We eschew traditional structural lines in favor of **Tonal Layering**.

### The Layering Principle
Depth is achieved by "stacking." For example, place a `surface-container-lowest` card inside a `surface-container-low` section. This creates a natural, soft "sink" or "lift" that feels integrated into the OS.

### Ambient Shadows
Shadows must be "Atmospheric."
*   **Color:** Use a tinted version of `on-surface` (not black).
*   **Spec:** 0px 20px 50px rgba(0, 0, 0, 0.4). The blur must be extra-diffused to mimic natural light scattering through glass.

### The "Ghost Border" Fallback
If a border is required for accessibility (e.g., in a high-density data grid):
*   **Constraint:** Use the `outline-variant` token at **15% opacity**.
*   **Forbid:** Never use 100% opaque, high-contrast borders. The border should be felt, not seen.

---

## 5. Components

### Buttons
*   **Primary:** A vibrant gradient of `primary` to `primary-container`. `border-radius: DEFAULT (0.25rem)`. No border.
*   **Secondary (Glass):** `surface-container-high` with 40% opacity and a `secondary` ghost border.
*   **States:** Hover states should trigger a "Glow" effect using a subtle outer shadow of the `primary` color.

### AI Traffic Cards
*   **Visual Style:** Forbid divider lines. Use vertical white space to separate train IDs from arrival times.
*   **Background:** Use `surface-container` with a 20px `backdrop-blur`.
*   **Corner Radius:** `xl` (0.75rem) for main cards to soften the technical nature of the data.

### Input Fields
*   **Style:** Minimalist. No bottom line. Use a `surface-container-lowest` background with a `ghost border`.
*   **Focus:** Transition the ghost border to 100% opacity `secondary` (Cyan) with a soft outer glow.

### Signature Component: The "Pulse" Chip
For live railway status, use a `secondary_container` fill with a `label-md` text. Add a small 4px circle that animates with a "breathing" opacity scale (0.4 to 1.0) to indicate real-time AI monitoring.

---

## 6. Do's and Don'ts

### Do:
*   **Embrace Asymmetry:** Align high-level stats to the far left and secondary logs to the right, leaving intentional "void" space in the center to highlight the railway map.
*   **Use Tonal Shifts:** Distinguish the sidebar from the main map by shifting from `surface` to `surface-container-low`.
*   **Smooth Transitions:** All hover and entry states must use a `cubic-bezier(0.22, 1, 0.36, 1)` transition for a "heavy" but responsive feel.

### Don't:
*   **Don't use pure white:** All "on-surface" text should be `e5e2e1` to reduce eye strain in dark environments.
*   **Don't use standard drop shadows:** Avoid small, dark, offset shadows. They feel "web-1.0" and break the glassmorphism illusion.
*   **Don't crowd the data:** If a screen feels full, increase the container size rather than decreasing the font size. Technical reliability is conveyed through clarity.

### Accessibility Note:
While we use "Ghost Borders," ensure that interactive elements maintain a contrast ratio of at least 4.5:1 against the background through careful use of the `on-surface` and `primary` tokens.