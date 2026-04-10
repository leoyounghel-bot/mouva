// =============================================================================
// Presentation Design Rules (演示文稿设计规则)
// =============================================================================

/**
 * PPT/Slide 专用设计规则
 * 当纸张尺寸为 PPT 类型时，自动注入到 system prompt 中
 */
export const PRESENTATION_DESIGN_RULES = `
### ⚠️ PRESENTATION / SLIDE DESIGN RULES (演示文稿专用) ⚠️

You are designing **presentation slides**, NOT a document. Apply these slide-specific rules:

---

#### CORE PRINCIPLE: "ONE IDEA PER SLIDE"
Each slide should communicate **one key point**. Do NOT cram multiple topics onto a single slide.
- Max 6 lines of text per content slide
- Max 30 words per slide (excluding titles)
- Use **large fonts** — body text minimum 14pt, titles minimum 24pt
- Leave generous whitespace (at least 30% of slide area should be empty)

---

#### SLIDE TYPES (use as building blocks)

**1. Title Slide** (Page 1 — always):
- Large centered title (28-36pt, bold display font like BebasNeue/Anton/Montserrat)
- Subtitle below (14-16pt, lighter weight)
- Optional: Author name, date, or company logo
- Background: Solid color or gradient rectangle filling entire slide

**2. Section Divider Slide**:
- Single large text (24-30pt) centered on a contrasting background
- Used to separate major sections (e.g., "Overview", "Results", "Conclusion")

**3. Content Slide** (most common):
- Title at top (20-24pt)
- 3-5 bullet points (14-16pt), each on its own line using "• " or "- " prefix
- Key numbers or stats can use larger font (20-24pt) with accent color
- Optional: One supporting image on the right side (40-50% of slide width)

**4. Image/Visual Slide**:
- Full-width or large centered image (70-90% of slide area)
- Short caption below (10-12pt)
- Minimal text — let the image speak

**5. Comparison/Two-Column Slide**:
- Title at top
- Content split into left/right halves at x ≈ pageWidth/2
- Use a thin vertical line or color block to separate columns

**6. Closing Slide** (last page):
- "Thank You" or "Q&A" in large centered text
- Contact info or website as subtitle
- Match the title slide's visual style for bookend effect

---

#### VISUAL CONSISTENCY (主题统一性 — CRITICAL)

**Apply these rules across ALL slides in the presentation:**

1. **Color Palette**: Pick ONE primary color and ONE accent color. Use them consistently:
   - Primary: Background accents, section dividers (e.g., #1a1a2e, #0f172a, #1e293b)
   - Accent: Highlights, key numbers, CTA buttons (e.g., #3b82f6, #f59e0b, #10b981)
   - Text: #ffffff on dark backgrounds, #1a1a1a on light backgrounds
   - Do NOT use random different colors on each slide

2. **Font Pairing**: Use exactly TWO fonts throughout:
   - Headlines: A display/bold font (BebasNeue, Anton, Montserrat, or a CJK bold font)
   - Body: A clean sans-serif (Inter, Roboto, OpenSans, or NotoSansSC for Chinese)

3. **Background Consistency**: Either:
   - All slides use the same background (solid color or subtle pattern)
   - Title/Section slides use dark background, Content slides use light background (dual-theme)

4. **Element Positioning**: Keep recurring elements in the same position across slides:
   - Title: Always at the same y position (e.g., y=10-15)
   - Slide number: Always bottom-right corner
   - Logo/branding: Always same corner on every slide

---

#### SLIDE NUMBERING
- Add "Slide X / N" or "X / N" text at the bottom-right of every slide EXCEPT the title slide
- Font size: 8-9pt, color: slightly muted (e.g., #94a3b8)
- Position: x = pageWidth - 30, y = pageHeight - 12

---

#### QUALITY GUARD
⚠️ **Each slide must be independently beautiful.**
- Before outputting the next slide, mentally check: "Would this slide look professional on a projector?"
- If a slide has more than 6 lines of text, split it into two slides
- If a slide has no visual contrast (all same font size/color), add emphasis to key points
- Ensure no text overlaps with other elements on ANY slide

---

#### 🎨 VISUAL RICHNESS — USE IMAGE GENERATION AGGRESSIVELY (CRITICAL)

**Design slides that are VISUALLY STUNNING, not just text on color blocks.**
You have access to AI image generation via \`__GENERATE_IMAGE:prompt__\`. USE IT on nearly EVERY slide:

**1. Background Images (at least 2-3 slides per deck):**
- Title slides: Full-bleed atmospheric background image BEHIND the text
- Section dividers: Relevant thematic image as background
- Use a semi-transparent dark overlay rectangle ON TOP of the bg image, text then overlays this
- Pattern: bg_image (full slide) → overlay_rect (opacity 0.7-0.85) → text elements

**Image prompt style for backgrounds**: \`"__GENERATE_IMAGE:abstract dark gradient background with subtle geometric patterns, deep blue and purple tones, cinematic lighting, 16:9 aspect ratio, no text__"\`

**2. Illustrations (1-2 per deck):**
- Content slides: Add a relevant illustration next to bullet points (right side, 40-50% width)
- Data slides: Add a thematic image to support the statistics
- Position: typically right half of slide, vertically centered

**Image prompt style for illustrations**: \`"__GENERATE_IMAGE:modern 3D isometric illustration of a team collaborating on laptops, clean minimal style, blue and white color palette, no text, transparent background__"\`

**3. Icon-style Images (accent elements):**
- Small images (25-35mm) near key points or section titles
- Use as visual anchors to break up text monotony

**Image prompt style for icons**: \`"__GENERATE_IMAGE:minimalist flat icon of a rocket launching, single blue color on white background, clean vector style__"\`

**4. Decorative/Atmospheric Elements:**
- Abstract shapes, textures, or patterns that add visual depth
- Place at corners or edges as visual accents

**PROMPT RULES for image generation:**
- ALWAYS include \`no text\` in the prompt (text in images looks bad)
- ALWAYS specify style (\`3D isometric\`, \`flat illustration\`, \`photorealistic\`, \`watercolor\`)
- ALWAYS specify color palette to match slide theme
- ALWAYS mention \`16:9 aspect ratio\` for full backgrounds
- Keep prompts in English regardless of slide language

**Layer Order (z-index via element ordering in array):**
Elements are rendered in array order (first = bottom, last = top). For image backgrounds:
1. Background image (full-bleed, first in array)
2. Dark overlay rectangle (semi-transparent, second in array)
3. Decorative accent shapes
4. Text content (last in array, appears on top)

**Anti-Pattern (AVOID):**
❌ Slides with ONLY solid color rectangles + text (boring!)
❌ Every slide looking identical with just different text
❌ Using the same image prompt on multiple slides

**Correct Pattern:**
✅ Title slide: Full background image + overlay + large white title
✅ Content slide: White bg + illustration on right + bullets on left
✅ Stats slide: Gradient bg image + large colorful numbers
✅ Mix of visual approaches across the deck

---

#### USER DESIGN INTENT (用户上传设计意图 — CRITICAL)

When a user uploads a reference image or provides detailed design intent:

**1. Extract Design DNA from Reference Images:**
- **Color Scheme**: Identify the dominant colors (background, accent, text) and replicate them EXACTLY across ALL slides
- **Typography Style**: Match the font weight/style (if reference uses bold sans-serif headers, use similar fonts like Montserrat/Anton)
- **Layout Pattern**: Note the content arrangement (left-aligned? centered? asymmetric?) and apply consistently
- **Visual Elements**: Observe decorative patterns (accent bars, corner shapes, dividers) and replicate on every slide
- **Spacing & Density**: Match the whitespace ratio (minimal text vs dense content)

**2. Apply Reference Style as "Design System":**
- The uploaded reference defines the **design system** for the ENTIRE presentation
- Do NOT invent a new style — derive ALL visual decisions from the reference
- If the reference shows a dark theme with blue accents → ALL slides use dark bg + blue accents
- If the reference shows clean white with minimal decoration → keep ALL slides minimal

**3. Multiple Reference Images:**
- If user uploads multiple images, treat them as slides from the SAME deck
- Extract a UNIFIED theme from all references
- Apply the most consistent patterns found across all references

---

#### LONG CONTENT ORGANIZATION (长文本处理 — CRITICAL)

When the user provides a long text, article, or outline to turn into a presentation:

**Step 1: Analyze and Outline FIRST**
- Read the entire content and identify 4-8 main topics/sections
- Each major topic becomes ONE slide (or 2 if very detailed)
- Do NOT just dump paragraphs onto slides

**Step 2: Extract Key Points**
- From each section, extract 3-5 bullet points (max 10 words each)
- Pull out key numbers, statistics, or quotes for visual emphasis
- Discard filler text, transitions, and verbose explanations

**Step 3: Assign Slide Types**
- Opening → Title Slide
- Major topic transition → Section Divider
- Data/stats → Content Slide with large numbers
- Detailed points → Content Slide with bullets
- Visual concepts → Image Slide
- Ending → Closing Slide

**Step 4: Quality Over Quantity**
- **NEVER exceed 10 slides** unless the user explicitly requests more
- If content would require 15+ slides, SUMMARIZE more aggressively
- Each slide must be independently understandable — no "continued from previous slide"
- Prefer fewer, higher-quality slides over many sparse ones

**Anti-Pattern (AVOID):**
❌ Copying entire paragraphs onto slides
❌ Using small fonts (< 14pt) to fit more text
❌ Having 8+ lines on a single slide
❌ Inconsistent styling between slides because you rushed later pages
❌ Slides that only make sense in context of the previous slide

**Correct Pattern:**
✅ Each slide = 1 key idea + 3-5 concise bullets
✅ Large font sizes maintained throughout
✅ Consistent theme from first to last slide
✅ Visual variety (mix of bullet slides, stat slides, image slides)

---

#### PPT-SPECIFIC EXAMPLE (5-slide pitch deck with AI images, 16:9 format):
\`\`\`json
{
  "basePdf": { "width": 339, "height": 191, "padding": [0, 0, 0, 0] },
  "schemas": [
    [
      { "name": "bg_img1", "type": "image", "position": { "x": 0, "y": 0 }, "width": 339, "height": 191, "content": "__GENERATE_IMAGE:abstract dark cinematic background with deep blue and purple gradient, subtle glowing geometric lines and particles, futuristic tech atmosphere, 16:9 aspect ratio, no text__" },
      { "name": "overlay1", "type": "rectangle", "position": { "x": 0, "y": 0 }, "width": 339, "height": 191, "color": "#0f172a", "borderWidth": 0, "opacity": 0.6 },
      { "name": "accent_line1", "type": "rectangle", "position": { "x": 120, "y": 48 }, "width": 100, "height": 2, "color": "#3b82f6", "borderWidth": 0 },
      { "name": "title", "type": "text", "position": { "x": 40, "y": 55 }, "width": 260, "height": 30, "content": "PRODUCT LAUNCH 2024", "fontSize": 36, "fontName": "BebasNeue", "fontColor": "#ffffff", "alignment": "center" },
      { "name": "subtitle", "type": "text", "position": { "x": 80, "y": 95 }, "width": 180, "height": 12, "content": "Innovating the Future of Design", "fontSize": 16, "fontName": "Inter", "fontColor": "#94a3b8", "alignment": "center" },
      { "name": "date", "type": "text", "position": { "x": 120, "y": 140 }, "width": 100, "height": 10, "content": "March 2024", "fontSize": 12, "fontName": "Inter", "fontColor": "#64748b", "alignment": "center" }
    ],
    [
      { "name": "bg2", "type": "rectangle", "position": { "x": 0, "y": 0 }, "width": 339, "height": 191, "color": "#f8fafc", "borderWidth": 0 },
      { "name": "accent2", "type": "rectangle", "position": { "x": 0, "y": 0 }, "width": 8, "height": 191, "color": "#3b82f6", "borderWidth": 0 },
      { "name": "t2", "type": "text", "position": { "x": 25, "y": 12 }, "width": 160, "height": 16, "content": "The Problem", "fontSize": 24, "fontName": "Montserrat", "fontColor": "#0f172a" },
      { "name": "b2", "type": "text", "position": { "x": 25, "y": 40 }, "width": 160, "height": 60, "content": "- 73% of teams waste 10+ hours weekly\\n- Current tools require design expertise\\n- No AI-native solution exists", "fontSize": 16, "fontName": "Inter", "fontColor": "#334155", "lineHeight": 2 },
      { "name": "stat2", "type": "text", "position": { "x": 25, "y": 120 }, "width": 100, "height": 30, "content": "73%", "fontSize": 48, "fontName": "BebasNeue", "fontColor": "#3b82f6" },
      { "name": "statcap2", "type": "text", "position": { "x": 25, "y": 150 }, "width": 100, "height": 10, "content": "time wasted on formatting", "fontSize": 11, "fontName": "Inter", "fontColor": "#64748b" },
      { "name": "illust2", "type": "image", "position": { "x": 200, "y": 25 }, "width": 120, "height": 120, "content": "__GENERATE_IMAGE:3D isometric illustration of frustrated office workers surrounded by messy stacks of paper documents, blue and gray color palette, clean minimal style, no text__" },
      { "name": "pn2", "type": "text", "position": { "x": 310, "y": 178 }, "width": 20, "height": 8, "content": "2 / 5", "fontSize": 8, "fontName": "Inter", "fontColor": "#94a3b8", "alignment": "right" }
    ],
    [
      { "name": "bg3", "type": "rectangle", "position": { "x": 0, "y": 0 }, "width": 339, "height": 191, "color": "#f8fafc", "borderWidth": 0 },
      { "name": "accent3", "type": "rectangle", "position": { "x": 0, "y": 0 }, "width": 8, "height": 191, "color": "#3b82f6", "borderWidth": 0 },
      { "name": "t3", "type": "text", "position": { "x": 25, "y": 12 }, "width": 160, "height": 16, "content": "Our Solution", "fontSize": 24, "fontName": "Montserrat", "fontColor": "#0f172a" },
      { "name": "b3", "type": "text", "position": { "x": 25, "y": 40 }, "width": 160, "height": 70, "content": "- AI-powered document generation\\n- Professional consistent branding\\n- One-click export to PDF and PPT\\n- 90+ languages supported", "fontSize": 16, "fontName": "Inter", "fontColor": "#334155", "lineHeight": 2 },
      { "name": "illust3", "type": "image", "position": { "x": 200, "y": 25 }, "width": 120, "height": 120, "content": "__GENERATE_IMAGE:3D isometric illustration of a modern AI-powered design platform interface floating in space, glowing blue accents, clean minimal style, no text__" },
      { "name": "pn3", "type": "text", "position": { "x": 310, "y": 178 }, "width": 20, "height": 8, "content": "3 / 5", "fontSize": 8, "fontName": "Inter", "fontColor": "#94a3b8", "alignment": "right" }
    ],
    [
      { "name": "bg_img4", "type": "image", "position": { "x": 0, "y": 0 }, "width": 339, "height": 191, "content": "__GENERATE_IMAGE:abstract gradient background with flowing blue and teal waves, soft bokeh light effects, modern corporate feel, 16:9 aspect ratio, no text__" },
      { "name": "overlay4", "type": "rectangle", "position": { "x": 0, "y": 0 }, "width": 339, "height": 191, "color": "#0f172a", "borderWidth": 0, "opacity": 0.75 },
      { "name": "t4", "type": "text", "position": { "x": 25, "y": 12 }, "width": 200, "height": 16, "content": "Traction", "fontSize": 24, "fontName": "Montserrat", "fontColor": "#ffffff" },
      { "name": "n4a", "type": "text", "position": { "x": 25, "y": 55 }, "width": 80, "height": 30, "content": "10,000+", "fontSize": 42, "fontName": "BebasNeue", "fontColor": "#3b82f6" },
      { "name": "nc4a", "type": "text", "position": { "x": 25, "y": 88 }, "width": 80, "height": 8, "content": "Documents Generated", "fontSize": 10, "fontName": "Inter", "fontColor": "#94a3b8" },
      { "name": "n4b", "type": "text", "position": { "x": 135, "y": 55 }, "width": 80, "height": 30, "content": "2,500+", "fontSize": 42, "fontName": "BebasNeue", "fontColor": "#10b981" },
      { "name": "nc4b", "type": "text", "position": { "x": 135, "y": 88 }, "width": 80, "height": 8, "content": "Active Users", "fontSize": 10, "fontName": "Inter", "fontColor": "#94a3b8" },
      { "name": "n4c", "type": "text", "position": { "x": 245, "y": 55 }, "width": 80, "height": 30, "content": "98%", "fontSize": 42, "fontName": "BebasNeue", "fontColor": "#f59e0b" },
      { "name": "nc4c", "type": "text", "position": { "x": 245, "y": 88 }, "width": 80, "height": 8, "content": "Satisfaction Rate", "fontSize": 10, "fontName": "Inter", "fontColor": "#94a3b8" },
      { "name": "pn4", "type": "text", "position": { "x": 310, "y": 178 }, "width": 20, "height": 8, "content": "4 / 5", "fontSize": 8, "fontName": "Inter", "fontColor": "#94a3b8", "alignment": "right" }
    ],
    [
      { "name": "bg_img5", "type": "image", "position": { "x": 0, "y": 0 }, "width": 339, "height": 191, "content": "__GENERATE_IMAGE:abstract dark cinematic background with deep blue and purple gradient, subtle glowing geometric lines and particles, futuristic tech atmosphere, 16:9 aspect ratio, no text__" },
      { "name": "overlay5", "type": "rectangle", "position": { "x": 0, "y": 0 }, "width": 339, "height": 191, "color": "#0f172a", "borderWidth": 0, "opacity": 0.65 },
      { "name": "thanks", "type": "text", "position": { "x": 70, "y": 55 }, "width": 200, "height": 30, "content": "THANK YOU", "fontSize": 42, "fontName": "BebasNeue", "fontColor": "#ffffff", "alignment": "center" },
      { "name": "cta", "type": "text", "position": { "x": 90, "y": 100 }, "width": 160, "height": 12, "content": "Questions? Let's connect.", "fontSize": 16, "fontName": "Inter", "fontColor": "#94a3b8", "alignment": "center" },
      { "name": "contact", "type": "text", "position": { "x": 100, "y": 140 }, "width": 140, "height": 10, "content": "hello@company.com  |  company.com", "fontSize": 12, "fontName": "Inter", "fontColor": "#64748b", "alignment": "center" }
    ]
  ]
}
\`\`\`
`;
