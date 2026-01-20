# Button Color Reference Guide

## Quick Visual Reference

### Primary Actions (Create, Start, Go)
```
🎨 Emerald/Teal/Cyan Gradient
from-emerald-500 via-teal-500 to-cyan-500
+ White text
+ 2px teal border
+ Teal shadow glow
Example: "Create Study Set", Continue buttons
```

### Sign In / Default Actions
```
🎨 Purple/Violet/Fuchsia Gradient  
from-violet-600 via-purple-600 to-fuchsia-600
+ White text
+ 2px purple border
+ Purple shadow glow
Example: "Sign In" button
```

### Premium / Upgrade
```
🎨 Gold Gradient (Amber/Yellow/Orange)
from-amber-400 via-yellow-500 to-orange-500
+ Dark text (slate-900)
+ 2px amber border
+ Amber shadow glow
Example: "$2.99/mo", "Upgrade" buttons
```

### Management Actions (Manage, Settings)
```
🎨 Blue/Indigo Gradient
from-blue-500 to-indigo-600
+ White text
+ 2px blue border
+ Blue shadow glow
Example: "Manage Subscription", "View Update Log"
```

### Destructive Actions (Delete, Sign Out)
```
🎨 Red/Rose Gradient
from-red-500 via-rose-500 to-pink-500
+ White text
+ 2px red border
+ Red shadow glow
Example: "Sign Out", "Report Problem"
```

### Navigation (Back buttons)
```
🎨 Slate Gradient
from-slate-700 to-slate-800
+ White text
+ 2px slate border
+ Slate shadow
Example: Back buttons
```

### Selection States (Settings options)
**Selected:**
- Purple gradient for Theme
- Teal gradient for Language  
- Emerald gradient for Grade System
+ Respective border colors
+ Soft gradient background

**Unselected:**
- Gray borders (gray-300/gray-600)
- White/Gray-800 background
- Hover: Colored border appears

## Button Anatomy

Every button now has:
1. **Gradient background** (3 colors minimum)
2. **2px border** (matching primary gradient color)
3. **Large shadow** (shadow-xl or shadow-2xl)
4. **Color-specific glow** (e.g., shadow-teal-500/40)
5. **Hover lift** (-translate-y-1)
6. **Hover scale** (scale-[1.02])
7. **Active press** (scale-[0.98])
8. **White or dark text** (high contrast)

## Hover Behavior

```tsx
// Standard hover pattern:
hover:from-color-400 hover:via-color-400 hover:to-color-400  // Lighter shades
hover:shadow-2xl                                              // Bigger shadow
hover:-translate-y-1                                          // Lift up
hover:scale-[1.02]                                           // Slightly bigger
```

## Active/Press Behavior

```tsx
// Standard active pattern:
active:scale-[0.98]  // Press down effect
```

## Emoji Usage

Emojis added for quick recognition:
- 📚 = My Sets
- ⭐ = Premium/Upgrade
- 🚀 = Start Premium
- 🔐 = Sign In Required
- 🚪 = Sign Out
- ⚠️ = Report Problem
- 📋 = Update Log
- 👑 = Owner badge

## Dark Mode Compatibility

All gradients work in both modes because:
- Gradients use absolute colors (not CSS variables)
- White/Dark text chosen for maximum contrast
- Borders provide edge definition regardless of background
- Shadows adjusted for dark mode (larger opacity)

## Size Variants

- **xl**: py-5 (homepage main CTA)
- **lg**: py-4 (premium modal)
- **default**: py-3 (most buttons)
- **sm**: py-2 (secondary actions)

## DO's and DON'Ts

### ✅ DO:
- Use gradients with 3+ colors
- Add 2px borders
- Include shadow glows
- Use hover animations
- Match shadow color to gradient
- Add emojis for important actions

### ❌ DON'T:
- Use single flat colors
- Skip borders
- Use subtle shadows
- Forget hover states
- Mix incompatible colors
- Overuse emojis (1 per button max)

## Conversion Optimization

### Hierarchy by Color:
1. **Gold/Amber** (Premium) = $$$
2. **Emerald/Teal** (Primary action) = Main goal
3. **Purple** (Sign in) = Secondary action
4. **Blue** (Management) = Settings
5. **Slate** (Navigation) = Don't compete with CTAs
6. **Red** (Destructive) = Warning

## Testing Checklist

When adding new buttons:
- [ ] Gradient has 3+ colors
- [ ] Has 2px border
- [ ] Has shadow-xl or shadow-2xl
- [ ] Shadow matches gradient color
- [ ] Hover includes lift + scale
- [ ] Active has press effect
- [ ] Text is white or dark (high contrast)
- [ ] Works in both light and dark mode
- [ ] Responsive on mobile
- [ ] Accessible (good contrast ratio)

## Code Template

```tsx
// Copy-paste template for new buttons:
<button
  className="px-6 py-3 rounded-xl text-sm font-bold 
    bg-gradient-to-r from-COLOR1 via-COLOR2 to-COLOR3 
    text-white 
    shadow-xl shadow-COLOR/40 
    border-2 border-COLOR/50 
    hover:from-COLOR-lighter hover:via-COLOR-lighter hover:to-COLOR-lighter 
    hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.02] 
    active:scale-[0.98] 
    transition-all"
>
  Button Text
</button>
```

Replace COLOR with: emerald, teal, purple, blue, amber, red, slate, etc.
