# Theme Design Doc: Retro-Medieval Westeros Chat

## Core Concept
Transform the Windows 95 / AOL-style chat layout seen in image_fb115f.png into a digital "Grand Maester's Console" for House of the Dragon fans. The structural layout must remain strictly retro (sharp 3D beveled borders, blocky buttons, no modern border-radius), but the skinning must look like a medieval manuscript meets a heavy stone fortress.

## Visual Design Parameters

### 1. The Faction Palettes
*   **The Realm's Parchment (Base Chat Log):** Instead of stark white or grey window interiors, the chat log and text input areas should use a warm, aged parchment tone (`#F5EFEB` or `#EFE6DD`) to mimic vellum manuscripts.
*   **Team Black (Dragonstone Fortress):** 
    *   Primary Window Frame: Deep, textured charcoal/obsidian (`#1C1C1F`)
    *   Title Bars / Accents: Valyrian steel gray (`#4A4E51`) with a sharp Targaryen crimson (`#8B0000`) border highlight.
*   **Team Green (Oldtown Hightower):**
    *   Primary Window Frame: Heavy moss/jade stone (`#22382B`)
    *   Title Bars / Accents: Burnished Citadel brass/gold (`#B89047`) and pale olive (`#3E5C47`).

### 2. Retro-Medieval UI Strategy
*   **Chiseled Stone Bevels:** Maintain the classic 3D `outset` and `inset` borders seen in image_fb115f.png, but modify the highlight/shadow colors. Instead of standard grey/white highlights, use a lighter shade of the faction's stone color to make the window frames look carved or chiseled.
*   **Medieval Typography via Retro Constraints:** 
    *   Since retro layouts rely on crisp system fonts, use monospace or sharp serif fonts like `Georgia`, `Palatino`, or MS-DOS styled pixel fonts to maintain readability while hinting at old press type.
    *   Capitalize the "TOPIC:" and "ONLINEHOST:" headers like a royal decree (e.g., `text-transform: uppercase; letter-spacing: 1px;`).

## Element Mapping for AI Engine

*   `body / desktop background`: Replace the solid teal background with a deep, dark royal hue—like a velvety midnight blue (`#0B111E`) or a dark banner red (`#2A0808`).
*   `window-header`: The top banner containing "House of the Dragon - Episode #3.2". Give it a subtle, high-contrast horizontal gradient that looks like polished iron or oxidized brass.
*   `chat-input-area`: The bottom message entry box should look like clean parchment, utilizing a dark ink-colored text (`#1A1105`) for contrast.
*   `buttons (Send, B, I, U)`: Styled like small, iron-stamped or brass-plated square toggles. High contrast, sharp edges, and a heavy inset shadow when clicked to mimic a physical medieval lever or stamp.
*   `.admin / .online-host`: Give these specific roles heraldic badges using pure CSS. For example, a small square colored indicator next to the name representing a house crest (Red for Targaryen, Green for Hightower, Silver for Velaryon).
*   `Sponsored Links`: The footer marquee should look like an official scroll sign-off or royal ledger footnote.