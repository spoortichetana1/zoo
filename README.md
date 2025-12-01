# 🐾 Fantasy Zoo — Idle Pet Management Game

Fantasy Zoo is a modular, extendable browser game built with plain HTML, CSS, and JavaScript. Hatch eggs, grow animals, manage their needs, cure sickness, balance income, handle random events, and build the greatest fantasy zoo possible.

---

## ⭐ Game Features

- Buy eggs (Common / Rare / Mystic)
- Incubate eggs and hatch animals
- Maintain animals: feed, clean, treat at clinic
- Bath house with FIFO queue
- Disease system with clinic queue + treatment cost/refunds
- Happiness system affecting income multipliers
- Habitat system with bonuses/penalties
- Random events (buffs/debuffs)
- Economy system: income per second
- Prestige: reset runs for permanent bonuses
- Leaderboard saved in localStorage

---

## ⭐ Gameplay Loop (per tick)

1. HatchingSystem → eggs hatch  
2. CleaningSystem → bath progress  
3. DiseaseSystem → sickness checks + clinic processing  
4. HabitatSystem → habitat effects  
5. HappinessSystem → stats & multipliers  
6. EventsSystem → random timed effects  
7. EconomySystem → compute income  
8. LoseSystem → check lose conditions  
9. Render → update UI panels

---

## ❌ Lose Conditions (Game Over)

The player loses if **any** of these occur:

### 1. Bankrupt  
coins < 0

### 2. No animals + no eggs + cannot afford an egg  
- animals.length === 0  
- eggs.length === 0  
- coins < cheapestEggPrice  

### 3. All animals unhappy  
Every animal happiness <= 0

On game-over:
- GameState.isGameOver = true  
- gameOverReason set  
- UI shows Restart button  

---

## 🧩 Core Mechanics

### 🥚 Eggs & Hatching
- Each egg: price, hatchTime, emoji, name, type  
- Hatch → create animal from matching pool  
- New animals start with default care stats

---

### 🐶 Animals

Animal instance fields:
- id, name, emoji, rarity, fromEggType  
- income (base), effectiveIncome  
- hunger, cleanliness, happiness  
- healthStatus, neglectTicks  
- habitat, habitatBonusMultiplier  
- happinessIncomeMultiplier  
- createdAt timestamp  

---

### 🍖 Feeding
- Costs coins  
- Restores hunger  
- Reduces neglect  
- Increases happiness  

---

### 🛁 Bath House
- FIFO queue  
- Only one active bath  
- After cleaning:
  - cleanliness = 100  
  - happiness improved  
  - neglectTicks reduced  

---

### 🏥 Disease & Clinic
- Neglect → sickness  
- Sick animals earn zero income  
- Clinic supports:
  - clinicQueue  
  - currentPatient  
  - cost tracking per queued entry  
- Cancelling queue refunds tracked cost  
- Cancelling active treatment → no refund  
- Selling animal refunds queued cost  

---

### 🏞️ Habitats
- Keys: forest, desert, ocean, arctic, mystic  
- Each habitat: key, level, capacity, animalIds  
- Matching habitat gives income bonus  
- Wrong habitat reduces happiness  

---

### 😊 Happiness System
- Based on:
  - hunger  
  - cleanliness  
  - sickness  
  - habitat  
  - events  
- Provides happinessIncomeMultiplier  
- If all happiness <= 0 → Game Over  

---

### 💰 Economy

Income formula:

income =
base *
happinessIncomeMultiplier *
habitatBonusMultiplier *
prestigeMultiplier *
eventMultiplier


Total income per tick → coins.

---

### 🎲 Events System
- Random timed buffs/debuffs  
- Changes stats or income  
- Stored in:
  - events.activeEvents  
  - events.history  

---

### 🔱 Prestige System
Resets run but grants permanent bonuses:
- prestige.count  
- prestige.totalPrestigePoints  
- modifiers.globalPrestigeMultiplier  

Leaderboard stores summary of each run.

---

## 📁 Project Structure

```
zoo/
│
├── index.html
├── README.md
│
├── css/
│ └── style.css
│
├── js/
│ ├── state.js
│ ├── utils.js
│ ├── eggs.js
│ ├── animals.js
│ ├── render.js
│ ├── ui.js
│ ├── leaderboard.js
│ ├── main.js
│ └── systems/
│ ├── hatching.js
│ ├── feeding.js
│ ├── cleaning.js
│ ├── economy.js
│ ├── happiness.js
│ ├── events.js
│ ├── habitat.js
│ ├── disease.js
│ ├── prestige.js
│ └── lose.js
│
└── assets/
```


---

## 🖥️ UI Panels

- Top Bar  
- Game Over card  
- Egg Shop  
- Incubator  
- Zoo (animal cards + actions)  
- Bath House  
- Clinic  
- Habitats  
- Events  
- Leaderboard  
- Prestige  

---

## 🛠️ Run Locally

1. Open `index.html`  
2. (Optional) run local server:


Visit http://localhost:8000

---

## ✔ Developer Notes

- GameState = single source of truth  
- All systems run inside main.js every tick  
- UI.init() uses safe event delegation  
- Fully modular: add new systems easily  

---

## 📜 License

Public domain sample/demo — free to use & modify.
