# 6 Degrees of Separation - Art Deco Game Design Guidelines

## Design Approach
**Reference-Based**: Drawing from 1920s Art Deco cinema palaces, Gatsby-era luxury, and classic Hollywood glamour. Think ornate movie theater lobbies, geometric patterns of the Chrysler Building, and golden age cinema posters.

## Typography System
**Display Fonts** (Headers, Game Title):
- Primary: "Playfair Display" or "Cormorant Garamond" - high-contrast serifs with dramatic letterforms
- Weight: Bold (700) for main headings, Semi-bold (600) for subheadings
- Letter-spacing: Wide tracking (0.05em - 0.1em) for luxury feel

**Body Fonts**:
- Secondary: "Raleway" or "Montserrat" - geometric sans-serif echoing Art Deco architecture
- Weight: Regular (400) for body, Medium (500) for emphasis
- Line-height: 1.6 for readability

**Typography Hierarchy**:
- Game Title: 4xl-6xl, all-caps with wide tracking
- Section Headers: 2xl-3xl, dramatic weight contrast
- Card Text: base-lg, balanced proportions
- UI Labels: sm-base, uppercase for buttons

## Layout System
**Spacing Primitives**: Tailwind units of 4, 6, 8, 12, 16, 20 (p-4, h-8, gap-6, etc.)
- Consistent 8-unit grid for vertical rhythm
- Component padding: p-6 to p-8 for cards, p-12 to p-20 for sections
- Generous spacing between game elements for breathing room

## Page Structure

### Hero Section (100vh)
Full-screen cinematic entrance with large dramatic image of golden age Hollywood (ornate theater facade, spotlight beams, art deco patterns). Centered game title overlay with metallic treatment, tagline, and primary CTA button with blurred background treatment.

### Game Interface (Main Play Area)
**Three-Column Layout** (grid-cols-3 on desktop, stack on mobile):

**Left Column** - Start Actor Card:
- Large movie poster-style card with angular borders
- Actor name in display font
- Known films list in subtle typography
- Geometric corner embellishments

**Center Column** - Connection Path:
- Vertical timeline showing selected path
- Numbered steps with connecting lines
- Movie title cards as connector nodes
- Angular dividers between connections

**Right Column** - Target Actor Card:
- Mirror layout of start card
- Destination actor information
- Films available for connection

**Controls Bar** (below or floating):
- Search input with metallic border styling
- Suggestion dropdown with art deco frame treatment
- Submit/Verify button with angular cut corners
- Reset game button with secondary styling

### Stats Dashboard Section
**Four-Column Grid** (grid-cols-4, responsive to 2 columns):
- Current Streak counter with large numerals
- Best Score display with trophy iconography
- Games Played metric
- Average Connections stat
Each stat card features geometric borders and centered content.

### Leaderboard Section
Full-width table with alternating row treatments:
- Rank medals for top 3 (gold/silver/bronze visual treatment)
- Player names in elegant typography
- Connection count and time metrics
- Geometric divider lines between entries
- Top 10 visible, "View All" expansion

### How to Play Modal/Section
**Two-Column Explanation** (text + visual):
- Left: Step-by-step instructions with numbered items
- Right: Example connection diagram
- Rules presented in card format with geometric borders
- Visual flow showing sample game progression

### Footer
**Three-Column Layout**:
- Left: Game logo and tagline
- Center: Quick links (About, Rules, Privacy)
- Right: Social media icons with art deco frames
- Newsletter signup with metallic input styling
- Copyright with decorative divider

## Component Library

**Cards**:
- Angular cut corners (clip-path or border-image effects)
- Thin metallic borders
- Subtle inner glow/shadow for depth
- Padding: p-6 to p-8
- Hover: Slight lift with enhanced glow

**Buttons**:
- Primary: Solid fill with angular geometric borders, uppercase text
- Secondary: Outlined with metallic border treatment
- Padding: px-8 py-3 to px-12 py-4
- Angular corners with 2-3px chamfer
- When on images: backdrop-blur-md with semi-transparent background

**Input Fields**:
- Geometric border treatment matching card style
- Focused state: Enhanced metallic glow
- Padding: p-4 with ample touch targets
- Dropdown suggestions with staggered entry animation

**Geometric Patterns**:
- Chevron dividers between sections
- Repeating diamond/hexagon subtle backgrounds
- Radiating sunburst patterns for accents
- Zigzag borders on feature cards

**Visual Effects**:
- Subtle gradient overlays on images (dark top to transparent)
- Metallic sheen on interactive elements (CSS gradients)
- Sparkle particles on game completion (confetti-style celebration)
- Smooth transitions (300ms ease-in-out) for interactions

## Images

**Hero Image**: 
Dramatic 1920s movie palace entrance or art deco theater interior with ornate gold details, spotlight beams cutting through darkness. Should evoke glamour and mystery. Full viewport height, center-aligned.

**Actor Cards**:
Black and white or sepia-toned classic Hollywood portraits with film grain texture overlay. Images should have 3:4 aspect ratio, contained within geometric card frames.

**Pattern Overlays**:
Subtle repeating geometric art deco patterns (10-20% opacity) as background textures on sections - think radiating lines, stepped zigzags, layered chevrons.

## Accessibility
- High contrast between text and backgrounds maintained
- Focus states with visible metallic outline (3px)
- ARIA labels for all interactive game elements
- Keyboard navigation for entire game flow
- Screen reader announcements for game state changes