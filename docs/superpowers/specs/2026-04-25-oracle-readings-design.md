# Oracle Readings — Design Spec

## Overview

A single-page oracle reading experience at `/arcade/oracle/` where users choose from four card reading spreads, each based on the rules printed on the deck's 3-value cards. The experience feels like a classic card game crossed with a psychic reading table — shuffling, dealing, and revealing cards one at a time.

Uses the existing arcade warm cream background and shared assets (`arcade.css`, `cards.js`, card images).

## Reading Types

Each reading corresponds to one of the four 3-cards in the deck:

### Love Reading (3 of Hearts)
- **Prompt**: "Think about yourself and your connection to another person"
- **Draw**: 3 cards
- **Positions**:
  1. **Your Feelings** — represents how you feel
  2. **Their Feelings** — represents how they feel
  3. **Outcome** — where these feelings are taking your connection

### Yes / No (3 of Diamonds)
- **Prompt**: "Think of your question"
- **Draw**: 2 cards with a re-shuffle between them
- **Mechanic**: Draw one card, shuffle the deck again (7 real shuffles), draw a second card
- **Result**: Compare card values:
  - Card 1 < Card 2 → **Yes**
  - Card 1 = Card 2 → **YES!** (overwhelming yes — a rare match)
  - Card 1 > Card 2 → **No**
- **Display**: Both cards shown, answer appears immediately after the second card is revealed

### Forecasting Fortune (3 of Clubs)
- **Prompt**: "How many days would you like to forecast?" (user picks 1–7)
- **Draw**: 1 to 7 cards (user's choice)
- **Positions**: Each card is a day's theme
  1. Tomorrow
  2. Day after tomorrow
  3–7. Subsequent days

### Wishing for Growth (3 of Spades)
- **Prompt**: "Think about an aspect of life where you wish to grow"
- **Draw**: 3 cards
- **Positions** (follow in this order to bring growth):
  1. **Trust** — first build accountability in this aspect
  2. **Delight** — then bring motivation to this aspect
  3. **Excel** — pursue mastery in this aspect

## User Flow

### 1. Spread Picker (Landing State)

Four-corner layout around a central deck on the warm arcade background:
- Center: face-down deck with prompt text
- Top-left: Love (heart symbol, "3 cards")
- Top-right: Yes / No (diamond symbol, "2 cards")
- Bottom-left: Forecast (club symbol, "up to 7 cards")
- Bottom-right: Growth (spade symbol, "3 cards")

User taps a corner to select their reading type.

### 2. Intention Prompt

After selecting a spread, display the reading's prompt text (e.g., "Think about yourself and your connection to another person"). The deck is centered, waiting for the user to begin shuffling.

### 3. Shuffle Ritual — "Shuffle 7 Times for Luck"

- User taps the deck 7 times
- **Each tap performs a real shuffle** of the deck array (the `shuffle()` function from `cards.js` is called each time — 7 genuine shuffles total)
- Each tap triggers a visual shuffle wave animation through the deck (cards rippling/fanning/cutting)
- Each tap also triggers a sparkle burst
- A counter shows progress: "1 of 7", "2 of 7", etc.
- After the 7th tap, the deck "settles" and transitions to dealing

**Yes / No special case**: The Yes/No reading has TWO shuffle phases — the initial 7-tap shuffle before the first card, and a second 7-tap shuffle before the second card. Both are full 7-tap rituals.

### 4. Deal

Cards animate from the center deck out to their spread positions, face-down. Each card lands with a subtle sparkle burst. Positions are labeled beneath each face-down card.

### 5. Reveal

- User taps each card individually to flip it
- Card flips with a smooth animation + sparkle burst
- Once face-up, the card shows:
  - The card's artwork (image from `../cards/`)
  - **Beneath the card**: position label (e.g., "Your Feelings"), card name (e.g., "Rose"), and rank theme (e.g., "Luck")
- Cards must be revealed in order (left to right) — the next card becomes tappable only after the current one is flipped

**Yes / No special case**: After the first card is revealed, the user goes through a second 7-tap shuffle ritual before the second card is dealt and revealed. The answer (Yes/No) appears immediately after the second card flips.

### 6. Reading Complete

All cards are face-up with their labels. A "New Reading" button appears to return to the spread picker.

## Sparkle Overlay

A canvas-based Y2K/millennial glitter effect layered over the entire page:

### Ambient Shimmer
- Constant subtle sparkle particles drifting across the screen
- Small, varied sizes and opacities
- Gentle, not distracting — like light catching glitter on a tablecloth

### Burst Effects
Larger, more dramatic sparkle bursts triggered on:
- Each of the 7 shuffle taps
- Each card flip
- Yes/No answer reveal
- Burst radiates from the interaction point (where the user tapped)

## Visual Design

- **Background**: Existing arcade warm cream background (from `arcade.css`)
- **Card backs**: Use the existing `back.jpg` card back image
- **Card faces**: Existing card artwork from `/arcade/cards/`
- **Typography**: System UI font, consistent with arcade
- **Card borders**: Pink (`suit-pink`) for hearts/diamonds, green (`suit-green`) for clubs/spades — same as existing games
- **Position labels**: Muted color beneath cards (similar to existing arcade text colors: `#8a7a6a`, `#a07090`)
- **Suit symbols**: Use in spread picker corners to identify each reading type

## Architecture

### Files
- `arcade/oracle/index.html` — page structure, links shared CSS
- `arcade/oracle/oracle.css` — oracle-specific styles (spread layouts, card positions, animations)
- `arcade/oracle/oracle.js` — game engine: state management, shuffle ritual, deal/reveal logic, sparkle canvas
- Imports from `../cards.js` (createDeck, shuffle, BACK_IMAGE)
- Links `../arcade.css` for shared styles

### State Machine
```
PICK_SPREAD → SHOW_PROMPT → SHUFFLING (7 taps) → DEALING → REVEALING → COMPLETE
                                                      ↑
                                          (Yes/No only: SHUFFLING_2 → DEALING_2)
```

### Card Data
Each card object from `cards.js` already has: `name`, `theme`, `image`, `suit`, `rank`, `value`. The oracle uses `name` and `theme` for the reading display, and `value` for the Yes/No comparison.

## Landing Page

Add an "Oracle" tile to `/arcade/index.html`:
- Icon: a crystal ball or star symbol
- Name: "Oracle"
- Description: "Card readings"

## Mobile / Landscape

Follows the existing arcade rotation pattern (shared in `arcade.css`). The spread picker and card layouts should work in both orientations. Cards use the same responsive sizing variables (`--card-width`, `--card-height`).
