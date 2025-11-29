# 🐾 Fantasy Zoo — Idle Pet Management Game  
A modular, expandable browser game built using **HTML + CSS + JavaScript**.  
Players hatch magical creatures, manage their needs, and build the most successful zoo possible.

This README documents the **full game design**, **technical architecture**, and **planned features**, without exposing code.

---

## 📌 Overview

Fantasy Zoo is an idle/management game where players:

- Buy eggs  
- Hatch fictional animals  
- Maintain pets (hunger, cleanliness, happiness later)  
- Run a bath house  
- Earn coins per second  
- Sell pets, upgrade systems, and compete on a leaderboard  

The game continuously evolves with new systems like disease, habitats, random events, and prestige.

It is structured to scale, easy for kids to understand, and fully open to future upgrades.

---

## 🎮 Gameplay Summary

### ⭐ Core Loop
1. Start with some coins.  
2. Buy **Common**, **Rare**, or **Mystic** eggs.  
3. Eggs incubate with visible countdowns.  
4. Eggs hatch into random creatures from their rarity pool.  
5. Animals generate **coins/sec** based on their rarity.  
6. Player manages:  
   - **Feeding** (mandatory, costs coins)  
   - **Cleaning** (bath queue, costs coins)  
   - **Selling pets**  
7. Earn → Spend → Grow → Upgrade.

### ⭐ Pet Stats
Each pet tracks:

| Stat          | Description |
|---------------|-------------|
| `hunger`      | Drops over time; no income if too low |
| `cleanliness` | Drops over time; must use bath house |
| `income`      | Income per second |
| `rarity`      | Common → Legendary |
| `happiness`   | Planned |
| `health`      | Planned |
| `habitat`     | Planned |

---

## 🧼 Bath House System

- Pets get dirty over time.  
- Cleaning has a **coin cost**, based on pet rarity.  
- Cleaning sends pets into a **bath queue (FIFO)**.  
- Only one pet is washed at a time.  
- Bathing shows progress bar & queue order.  
- After bath: cleanliness resets to 100%.

---

## 💰 Economy System

- Every second, each eligible pet contributes coins.  
- A pet earns only if:
  - Hunger > 0  
  - Cleanliness > 0  
  - Not in bath  
  - (Planned) Happiness above threshold  
  - (Planned) Healthy  

- Coins are spent on:
  - Eggs  
  - Feed  
  - Cleaning  
  - Future: habitats, vet clinic, upgrades  

---

## 🥚 Egg Types

| Egg | Cost | Hatch Time | Rarity Range |
|-----|------|------------|---------------|
| **Common Egg** | 20 coins | Medium | Common → Uncommon |
| **Rare Egg** | 40 coins | Slow | Rare → Epic |
| **Mystic Egg** | 80 coins | Slowest | Epic → Legendary |

Each egg has its own **animal pool**, containing ~15+ types.

---

## 🔮 Planned Advanced Systems (Modular)

These are designed but will be implemented in later stages:

### ⭐ Happiness System
- Happiness affects income multiplier.
- Drops if pet is hungry/dirty/unhappy.
- Mini bonuses when happiness maxes out.

### ⭐ Disease & Vet Clinic
- Pets may get sick if neglected.
- Sick pets produce no income.
- Treatment costs coins + time.

### ⭐ Habitat System
- Each habitat (Forest, Arctic, Ocean, Desert, Mystic) benefits certain animals.
- Wrong habitat → happiness and income penalties.
- Upgrades give boosts (e.g., slower decay).

### ⭐ Random Events
Examples:
- Visitor donates coins.
- Temporary egg sale.
- Storm reduces pet happiness.
- Rare bonus egg appears.

### ⭐ Visitors & Star Rating
- Zoo is periodically rated from 1–5 stars.
- Higher rating = passive bonus income.

### ⭐ Prestige System
- Once you reach major milestones (e.g., 100,000 coins), restart the zoo.
- Gain permanent bonuses like:
  - Faster hatching  
  - Higher rare pet chance  
  - Auto-feeding systems  

---

## 🏆 Leaderboard System

### Local Leaderboard (Initial)
Stored in browser localStorage:

Tracks:
- Total coins earned  
- Maximum coins held  
- Total pets hatched  
- Highest rarity obtained  
- Prestige count  
- Time played  

### Global Leaderboard (Future)
- Optional backend or Google Sheets API.
- Allows sharing scores with friends.

---

## 🧱 Architecture & Folder Structure

The project is modular, allowing clean separation of logic, UI, and data.

zoo/
│
├── index.html
├── README.md
│
├── css/
│ └── style.css
│
├── js/
│ ├── main.js # Game loop, initialization
│ ├── state.js # Global game state
│ ├── utils.js # Helper functions
│ ├── eggs.js # Egg definitions
│ ├── animals.js # Animal pools per egg
│ ├── render.js # Rendering all UI sections
│ ├── leaderboard.js # Leaderboard tracking
│ ├── ui.js # Button handlers, UI events
│ │
│ ├── systems/ # All core game mechanics
│ │ ├── hatching.js
│ │ ├── feeding.js
│ │ ├── cleaning.js
│ │ ├── economy.js
│ │ ├── happiness.js # planned
│ │ ├── events.js # planned
│ │ ├── habitat.js # planned
│ │ ├── disease.js # planned
│ │ └── prestige.js # planned
│
└── assets/
└── (optional images/icons)


---

## 🧪 Technical Goals

- Pure client-side app (no backend required).
- Modular JS architecture for easy expansion.
- Smooth mobile + desktop experience.
- No frameworks needed — fully vanilla.
- Easy GitHub Pages deployment.
- Kid-friendly design but technically organized.

---

## 🚀 Development Roadmap (High Level)

### Phase 1 — Core Systems  
✔ Eggs, hatching  
✔ Income  
✔ Feeding  
✔ Cleaning + bath queue  
✔ Selling  
✔ Modular JS architecture  

### Phase 2 — Depth Features  
⚙ Happiness  
⚙ Diseases & clinic  
⚙ Habitats & bonuses  
⚙ Random events  
⚙ Visitors & zoo rating  

### Phase 3 — Progression  
⚙ Achievements  
⚙ Upgrades  
⚙ Prestige system  

### Phase 4 — Leaderboards  
⚙ Local leaderboard  
⚙ Optional cloud leaderboard  

### Phase 5 — Polish  
⚙ Animations, sound effects  
⚙ Improved UI/UX theme  
⚙ Pets with personalities  

---

## 📁 Project Structure
 
