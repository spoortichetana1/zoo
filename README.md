<!-- ========================================================= -->
# 🐾 Fantasy Zoo — Idle Pet Management Game
<!-- ========================================================= -->

Fantasy Zoo is a modular, extendable browser game built with plain HTML, CSS, and JavaScript. Hatch eggs, care for animals, manage a bath house and clinic, and grow your zoo’s income over time.

---

## Features
- Buy eggs (Common / Rare / Mystic)
- Incubate eggs and hatch animals with rarity and income values
- Maintain animals: feed, clean, and treat at the clinic
- Bath house (FIFO queue) — single active bath at a time
- Disease system with clinic queue and automated treatment
  - Cancel queued clinic entries for a refund (per-queue cost tracked). Selling queued animals refunds queued clinic cost.
- Economy: animals produce coins per second (income tick)
- Leaderboard: save runs to localStorage and display rankings
- Prestige: reset runs for permanent bonuses

---

## Gameplay summary
Every tick (default once per second) runs:
1. HatchingSystem: eggs → animals
2. CleaningSystem: bath progress & queue
3. DiseaseSystem: neglect checks and clinic processing
4. HappinessSystem: compute happiness and modifiers
5. EconomySystem: compute income and update coins
6. Render: update UI

Lose conditions (Game Over):
- Bankrupt (coins < 0)
- No animals + no eggs + cannot afford the cheapest egg
- All animals unhappy (happiness <= 0)

---

## Project structure
```
zoo/
├── index.html
├── README.md
├── css/
│   └── style.css
├── js/
│   ├── state.js
│   ├── utils.js
│   ├── eggs.js
│   ├── animals.js
│   ├── render.js
│   ├── ui.js
│   ├── leaderboard.js
+│   ├── main.js
│   └── systems/
│       ├── hatching.js
│       ├── feeding.js
│       ├── cleaning.js
│       ├── economy.js
│       ├── happiness.js
│       ├── events.js
│       ├── habitat.js
│       ├── disease.js
│       ├── prestige.js
│       └── lose.js
└── assets/
```

---

## How to run locally
1. Open `index.html` in a modern browser
2. Optional: run a simple HTTP server for consistent localStorage behavior:
```powershell
python -m http.server 8000
# Then open http://localhost:8000
```

---

## Important dev notes
- `GameState` (window.GameState) is the single source of truth — all systems read/write it.
- `main.js` runs the tick loop and calls each system in the prescribed order; `Render.all()` updates the DOM.
- `UI.init()` attaches safe delegated event handlers once during initialization.

Key systems:
- HatchingSystem: eggs → animals
- FeedingSystem: handles feed cost & hunger restoration
- CleaningSystem: bath queue & cleaning
- DiseaseSystem: sickness detection, clinic queue & treatments
- HabitatSystem: habitat multipliers & assignment
- HappinessSystem: happiness, `effectiveIncome` multipliers
- EconomySystem: per-tick income, buy/sell
- EventsSystem: temporary modifiers & event history
- PrestigeSystem: run reset & permanent bonuses
- LoseSystem: evaluate game over conditions

Clinic & disease specifics
- `GameState.clinicQueue` stores animal IDs in line for treatment
- `GameState.currentPatient` stores the currently-treated patient
- `GameState.clinicQueueCosts` maps queued IDs to their treatment cost for refunds
- Cancelling queued treatment refunds the recorded clinic cost; cancelling an in-progress treatment stops treatment (no refund) and leaves the animal `sick`
- Selling an animal cancels queued treatment and refunds the queued clinic cost if tracked

---

## Mechanics reference
3.1 Eggs & Hatching
- Eggs have price, `hatchTime`, icon and type. Hatching picks an animal from the matching pool.

3.2 Animals
- An animal instance contains id, name, emoji, rarity, base income, `effectiveIncome`, hunger/cleanliness/happiness, `healthStatus`, `neglectTicks`, `habitat`, & metadata.

3.3 Feeding
- Feeding costs coins and restores hunger; it also reduces neglectTicks and increases happiness.

3.4 Cleaning
- The bath house is FIFO; cleaning restores cleanliness and increases happiness.

3.5 Disease & Clinic
- Neglect can make animals `sick`; sick animals earn no income until cured.
- Clinic treatment has a cost and duration; queued costs are tracked for refunds on cancel/sell.

3.6 Habitats
- Habitats provide income multipliers; matching habitats yields bonuses.

3.7 Happiness
- Affects `effectiveIncome`; computed from hunger, cleanliness, health and habitat fit, and event modifiers.

3.8 Economy
- Each tick: compute each animal’s `effectiveIncome` via multipliers and add to `GameState.coins`.

3.9 Events
- Random events may alter income or stats temporarily; stored in `GameState.events`.

3.10 Prestige
- Reset a run, retain permanent bonuses (global income multipliers, points).

3.11 Leaderboard
- Persist and rank runs via localStorage; show history and top runs in UI.

---

## UI layout (brief)
- Top Bar: coins, income/sec, animals/eggs, prestige
- Game Over panel: stop & restart run
- Egg Shop: buy eggs
- Incubator: eggs & hatch progress
- Your Zoo: animal cards & action buttons (feed, clean, sell, clinic)
- Bath House: active bath + queue
- Clinic: current patient, queue, cancel/stop treatment controls
- Habitats / Events / Leaderboard / Prestige: panels with info/actions

---

## Contributing
- Keep `GameState` as the canonical state.
- Add systems under `js/systems/` and add rendering & UI hooks in `render.js` and `ui.js` respectively.

---

## License
Public domain sample demo — free to adapt or reuse.

---

If you want, I can now:
- Add a short manual testing checklist
- Implement `effectiveIncome` usage in `economy.js` where appropriate
- Add a confirmation modal for cancelling active or queued clinic treatments

Thanks — tell me what follow-up you’d like!
<!-- ========================================================= -->
# 🐾 Fantasy Zoo — Idle Pet Management Game
<!-- ========================================================= -->

Overview
--------
Fantasy Zoo is a lightweight, modular browser game built with HTML, CSS and JavaScript. Players buy eggs, hatch animals, care for them (feeding, cleaning, happiness), manage a clinic, and grow their zoo's income over time.

This README improves the original documentation while preserving the same contents and system descriptions.

Features
--------
- Buy eggs (Common / Rare / Mystic)
- Incubate eggs and hatch animals with rarity and income values
- Maintain animals: feed, clean, and treat at the clinic
- Bath house (FIFO queue) — single active bath at a time
- Disease system with a clinic queue and automated treatments
  - Players can cancel queued treatments and receive a refund (per-queue cost tracked). Selling an animal cancels queued treatments and refunds the cost.
- Economy system: animals produce coins per second (income per tick)
- Leaderboard: save and view top runs (localStorage)
- Prestige: reset runs for permanent bonuses
- Modular architecture enabling future extensions (events, habitats, happiness)

Gameplay overview
------------------
The game executes a series of systems every tick (default: 1 second) in the following order:

1. HatchingSystem: eggs that reach hatch time yield new animals.
2. CleaningSystem: bath house queue & active cleaning progress.
3. DiseaseSystem: neglect checks → animals may become sick.
4. DiseaseSystem: clinic queue processing and treatments.
5. HappinessSystem: compute happiness modifiers and effective income.
6. EconomySystem: aggregate and apply income per tick to coins.
7. Render: update the UI based on current GameState.

Lose conditions (Game Over):
- Bankrupt (coins < 0)
- No animals + no eggs + cannot afford cheapest egg
- All animals unhappy (happiness <= 0)

Folder structure
-----------------
```
zoo/
├── index.html            # Main HTML and script order
├── README.md             # You are reading this
├── css/                  # Styling
│   └── style.css
├── js/                   # Game logic & utilities
│   ├── state.js          # Global GameState (single source of truth)
│   ├── utils.js          # Reusable helpers (random, id, time, clamp)
│   ├── eggs.js           # Egg definitions (price, hatchTime, icon)
│   ├── animals.js        # Animal pools and templates
│   ├── render.js         # DOM rendering by section
│   ├── ui.js             # Event wiring, delegations, handlers
│   ├── leaderboard.js    # Storage for runs, ranking & formatting
│   ├── main.js           # Game orchestrator & tick loop
│   └── systems/          # Individual systems
│       ├── hatching.js
│       ├── feeding.js
│       ├── cleaning.js
│       ├── economy.js
│       ├── happiness.js
│       ├── events.js
│       ├── habitat.js
│       ├── disease.js
│       ├── prestige.js
│       └── lose.js
└── assets/               # Optional sprites & icons
```

How to run locally
-------------------
1. Open `index.html` in your browser.
2. For consistent localStorage behavior, run a simple HTTP server:

```powershell
python -m http.server 8000
# then open http://localhost:8000
```

Developer notes & systems overview
---------------------------------
- `GameState` (global) is the single source of truth that systems read/write.
- `main.js` runs the tick loop and calls each system; `Render.all()` updates the UI.
- `UI.init()` sets up delegated event handlers and is called once during initialization.

Major systems and responsibilities:
- HatchingSystem: transform eggs into animals.
- FeedingSystem: handle feed actions, cost and hunger recovery.
- CleaningSystem: bath queue & cleaning logic.
- DiseaseSystem: detect sickness, clinic queue, and treatment flow.
- HabitatSystem: assign animals to habitats with bonuses.
- HappinessSystem: update happiness and effective income multipliers.
- EconomySystem: compute income per tick and process buy/sell.
- EventsSystem: random game events & modifiers.
- PrestigeSystem: handle prestige resets and permanent bonuses.
- LoseSystem: evaluate lose conditions and set `GameState.isGameOver`.

Important behavior notes
------------------------
- Clinic: `GameState.clinicQueue` (IDs), `GameState.currentPatient` (active), and `GameState.clinicQueueCosts` (queued entry costs) are used for refunding and UI display.
- Cancelling a queued clinic item refunds the recorded cost. Cancelling an in-progress treatment stops the treatment (no refund) and leaves the animal `sick`.
- Selling an animal removes it from bath/clinic queues and refunds any queued clinic cost if tracked.

Game rules & mechanics (detailed)
--------------------------------
3.1 Eggs & Hatching
- Players can buy egg types; eggs have price, `hatchTime`, icon, and name. Eggs eventually hatch into animals picked from the corresponding pool.

3.2 Animals
- Each animal instance contains id, name, emoji, rarity, income (base), `effectiveIncome`, hunger/cleanliness/happiness, `healthStatus`, `neglectTicks`, `habitat`, and creation metadata.

3.3 Feeding
- Feeding costs coins and restores hunger while reducing neglect ticks and increasing happiness.

3.4 Cleaning
- Bath House is FIFO. Send animals to the bath queue, only one active bath runs at a time. Cleaning increases cleanliness and happiness.

3.5 Disease & Clinic
- Neglected animals may become `sick`. Sick animals stop producing income and must be cured at clinic or will reduce player options.
- Clinic entries have a cost (based on `animal.income` and a multiplier), a queued cost is stored for refunds, and the clinic processes one active patient at a time.
- UI can cancel queued items (refund) or stop an active treatment (no refund, animal remains `sick`).

3.6 Habitats
- Habitats affect income multipliers; assign animals to get habitat bonuses.

3.7 Happiness
- Happiness depends on hunger, cleanliness, health, habitat fit, and events; happiness affects `effectiveIncome` via multipliers.

3.8 Economy
- Per tick, compute each animal's effective income using multipliers:

  `income = base * happinessMult * habitatMult * prestigeMult * eventMult`

- `GameState.incomePerSecond` is updated, and `GameState.coins` increases accordingly each tick.

3.9 Events
- Random events may boost income or change cleanliness/happiness temporarily.

3.10 Prestige
- Prestige resets the run but provides permanent bonuses (e.g., increased income multiplier).

3.11 Leaderboard
- Final runs can be recorded and ranked using localStorage.

UI Layout / Panels (brief)
---------------------------
- Top Bar (`#top-bar`) — coins, income/sec, animals/eggs, prestige
- Game Over (`#game-over-section`) — final messages and restart
- Egg Shop (`#egg-shop-section`) — buy eggs
- Incubator (`#incubator-section`) — eggs hatching in progress
- Your Zoo (`#zoo-section`) — animal cards with actions (feed, clean, sell, clinic)
- Bath House (`#bath-house-section`) — current bath + queue
- Clinic (`#clinic-section`) — current patient, queue (with cancel/refund), stop-treatment action
- Habitats (`#habitat-section`), Events (`#events-section`), Leaderboard (`#leaderboard-section`), Prestige (`#prestige-section`)

Contributing
------------
- The codebase is purposefully simple: add new functionality by creating or modifying systems under `js/systems/` and expose UI actions via `ui.js` and rendering via `render.js`.
- Keep `GameState` as the primary data source. Avoid writing ad-hoc DOM updates outside `render.js` for consistency.

License
-------
Public domain sample/demo — you may adapt or reuse these resources for learning and experimentation.

Optional follow-ups I can implement now
--------------------------------------
- Add a simple integration/functional test checklist (manual step list).
- Implement the `effectiveIncome` formula formally inside `economy.js` to always rely on the computed field.
- Add a confirmation modal for stopping an active treatment or cancelling a queued treatment.

---

Thanks — let me know if you want copy edits, a short testing checklist, or if you’d like this README to include screenshots or a short animated GIF for the UI.
<!-- ------------------------------------------------------------ -->
# 🐾 Fantasy Zoo — Idle Pet Management Game
<!-- ------------------------------------------------------------ -->

Fantasy Zoo is a modular, extendable browser game built with plain HTML, CSS, and JavaScript. Hatch eggs, care for animals (hunger, cleanliness, happiness), manage a clinic and bath house, and grow your zoo's income over time.

This README preserves the original design and functional details while presenting them in a clear, organized format for players and contributors.

---

## Table of Contents
- Features
- Gameplay overview
- Project structure
- How to run locally
- Developer notes & systems overview
- Game rules & mechanics
- UI Layout / Panels
- Contributing
- License

---

## Features
- Buy eggs (Common / Rare / Mystic)
- Incubate eggs and hatch animals with rarity and income values
- Maintain animals: feed, clean, treat at clinic
- Bath house (FIFO queue) — only one animal bathed at a time
- Disease system with a clinic queue and automated treatments
  - Clinic queue and treatment: sick animals can be queued for treatment; treatments have a cost and duration. Players can cancel queued treatments and receive a refund (clinic cost tracked per queue entry). Selling an animal cancels queued treatment and refunds its clinic cost.
- Economy system: animals produce coins per second
- Leaderboard with localStorage-based run records
- Prestige: reset a run for permanent bonuses
- Modular systems for easy future expansion (events, habitats, happiness)

---

## Gameplay overview
Each tick (default once per second) the following overall sequence runs:

1. HatchingSystem: checks eggs and hatches them into animal instances
2. CleaningSystem: advances baths, processes the bath queue
3. DiseaseSystem: checks animals for neglect → can make them sick
4. DiseaseSystem: processes clinic queue and treats animals
5. HappinessSystem: updates animal perks and computed effective incomes
6. EconomySystem: sums effective incomes and adds coins to the player
7. Render: updates the UI

Lose conditions (Game Over):
- Bankrupt (coins < 0)
- No animals, no eggs, and can’t afford cheapest egg
- All animals have happiness <= 0

When the game ends, a clear Game Over message is presented with a Restart button.

---

## Folder structure
This project is intentionally simple and plain-JS driven. Below is a compact overview, matching the repository layout:

```
zoo/
├── index.html          # Main HTML and script inclusion order
├── README.md
├── css/
│   └── style.css       # Central game styling
├── js/
│   ├── state.js        # Global GameState object
│   ├── utils.js        # Helper utilities (random, id, formatters)
│   ├── eggs.js         # Egg definitions & metadata
│   ├── animals.js      # Animal pools and templates
│   ├── render.js       # DOM render updates for each panel
│   ├── ui.js           # Event wiring and UI handlers
│   ├── leaderboard.js  # LocalStorage leaderboard helpers
│   ├── main.js         # Game orchestrator and tick loop
│   └── systems/        # Game logic modules
│       ├── hatching.js
│       ├── feeding.js
│       ├── cleaning.js
│       ├── economy.js
│       ├── happiness.js
│       ├── events.js
│       ├── habitat.js
│       ├── disease.js
│       ├── prestige.js
│       └── lose.js
└── assets/             # Optional images/icons
```

---

## How to run locally
1. Open `index.html` in any modern browser (Chrome, Edge, Firefox).
2. Optional: Run a simple local web server for consistent localStorage behavior:

```powershell
python -m http.server 8000
# Then open http://localhost:8000 in your browser
```

---

## Developer notes & systems overview
The project uses a global `GameState` object (declared in `js/state.js`) as a single source of truth; all systems read and write from it. The main loop is in `main.js`, which calls each system every tick, then triggers `Render.all()`.

Initialization:
- `main.js` sets up the game tick loop and calls `UI.init()` and `Leaderboard.init()` once the DOM is ready.
- `UI.init()` registers DOM event handlers using event delegation and safe checks for UI actions.

Primary systems (in `js/systems/`):
- HatchingSystem — eggs to animals
- FeedingSystem — feed costs & hunger restoration
- CleaningSystem — bath queue and cleaning logic
- DiseaseSystem — sickness checks, clinic queue, treatment flow
- HabitatSystem — habitat assignment & bonus multipliers
- HappinessSystem — happiness calculations & effective income
- EconomySystem — income calculation, coin balance, buy/sell logic
- EventsSystem — random game events & modifiers
- PrestigeSystem — reset & permanent progression
- LoseSystem — game over checks

Important: Most systems contain defensive `console.warn` checks for missing dependencies (e.g., `GameState`, `Utils`, or configuration constants) and normally safe no-op behaviors when a dependency is absent during load ordering.

---

## Game rules & mechanics (detailed)
This section mirrors the specification embedded in the original README and JS comments.

3.1 Eggs & Hatching
- Players buy eggs (common/rare/mystic).
- Egg attributes include price, hatchTime (ms), emoji, and name.
- Eggs incubate and hatch into animals after `hatchTime`; an animal is chosen from the matched pool.

3.2 Animals
Each animal instance includes:
- Identity: id, name, emoji, rarity, fromEggType
- Economy: income (base), effectiveIncome
- Care stats: hunger, cleanliness, happiness
- Health: healthStatus, neglectTicks
- Habitat: assigned habitat, habitat bonus multiplier
- Meta: createdAt timestamp

3.3 Feeding
- Feeding costs coins, increases hunger, reduces neglect, and typically increases happiness.

3.4 Cleaning & Bath House
- The bath house is a FIFO queue. Players can queue animals and one is cleaned at a time. Cleaning restores cleanliness and improves happiness.

3.5 Disease & Clinic
- Neglect (low hunger and cleanliness for a period) leads to sickness.
- Sick animals earn no income and can be sent to the clinic for treatment; clinic treatments cost coins and take time.
- Clinic logic:
  - `GameState.clinicQueue` stores queued animal IDs.
  - `GameState.currentPatient` stores the currently treated patient and timestamps.
  - `GameState.clinicQueueCosts` maps queued animal ID -> treatment cost (used for refunds).
  - Canceling queued treatments refunds the stored cost; canceling an in-progress treatment stops it (no refund) and leaves the animal `sick`.
  - Selling an animal while it’s queued refunds its queued clinic cost and removes it from the queue; selling while treated cancels the treatment.

3.6 Habitats
- Habitats provide bonuses; animals have a habitat key and gain the habitat bonus multiplier when housed correctly.

3.7 Happiness
- Calculated from hunger, cleanliness, health, habitat match, and events; affects the income multiplier.

3.8 Economy
- Each tick, effective income is computed for each animal using multipliers:
  income = base * happinessMult * habitatMult * prestigeMult * eventMult
- `GameState.incomePerSecond` shows the total and coins update each tick.
- It also handles egg purchases and selling animals, which return item-specific coin values.

3.9 Events
- Random events (e.g., coins bonus, cleanliness reduction) can occur and be persisted in `GameState.events`.

3.10 Prestige
- Prestige resets the run but awards permanent bonuses (global income multipliers).

3.11 Leaderboard
- Stores final runs (prestiges) in `GameState.leaderboard` and localStorage.

---

## UI Layout / Panels (brief)
Panels are handled by `render.js` and include:
- Top Bar (`#top-bar`): coins, income, animals & egg count, prestige
- Game Over (`#game-over-section`): Game Over display & Restart
- Egg Shop (`#egg-shop-section`): buy eggs
- Incubator (`#incubator-section`): active eggs and hatch progress bars
- Your Zoo (`#zoo-section`): animal cards, health, hunger, cleanliness, actions
- Bath House (`#bath-house-section`): active bath & waiting queue
- Clinic (`#clinic-section`): current patient, progress & queue; can cancel queued treatments
- Habitats (`#habitat-section`), Events (`#events-section`), Leaderboard (`#leaderboard-section`), Prestige (`#prestige-section`)

---

## Contributing
- The project is intentionally lightweight and plain-JS. To add features, add or update the appropriate system under `js/systems/` and then update `render.js` and `ui.js` for required UI and event bindings.
- Please keep `GameState` as the single source of truth and avoid direct DOM manipulation outside `render.js`.

---

## License
Public domain sample/demo: feel free to adapt or reuse for learning and prototyping.

---

If you’d like, I can now: add a brief testing checklist, implement `effectiveIncome` usage inside `economy.js`, or add a small "confirmation modal" for cancelling clinic treatment.
<!-- ------------------------------------------------------------ -->
# 🐾 Fantasy Zoo — Idle Pet Management Game
<!-- ------------------------------------------------------------ -->

Fantasy Zoo is a modular, extendable browser game built with plain HTML, CSS, and JavaScript. Hatch eggs, care for animals (hunger, cleanliness, happiness), manage a clinic and bath house, and grow your zoo's income over time.

This README preserves the original design and functional details while presenting them in a clear, organized format for players and contributors.

---

## Table of Contents
- Features
- Gameplay overview
- Project structure
- How to run locally
- Developer notes & systems overview
- Game rules & mechanics
- License

---

## Features
- Buy eggs (Common / Rare / Mystic)
- Incubate eggs and hatch animals with rarity and income values
- Maintain animals: feed, clean, treat at clinic
- Bath house (FIFO queue) — only one animal bathed at a time
- Disease system with a clinic queue and automated treatments
  - Clinic queue and treatment: sick animals can be queued for treatment; treatments have a cost and duration. Players can cancel queued treatments and receive a refund (clinic cost tracked per queue entry). Selling an animal cancels queued treatment and refunds its clinic cost.
- Economy system: animals produce coins per second
- Leaderboard with localStorage-based run records
- Prestige: reset a run for permanent bonuses
- Modular systems for easy future expansion (events, habitats, happiness)

---

## Gameplay overview
Each tick (default once per second) the following overall sequence runs:

1. HatchingSystem: checks eggs and hatches them into animal instances
2. CleaningSystem: advances baths, processes the bath queue
3. DiseaseSystem: checks animals for neglect → can make them sick
4. DiseaseSystem: processes clinic queue and treats animals
5. HappinessSystem: updates animal perks and computed effective incomes
6. EconomySystem: sums effective incomes and adds coins to the player
7. Render: updates the UI

Lose conditions (Game Over):
- Bankrupt (coins < 0)
- No animals, no eggs, and can’t afford cheapest egg
- All animals have happiness <= 0

When the game ends, a clear Game Over message is presented with a Restart button.

---

## Folder structure
This project is intentionally simple and plain-JS driven. Below is a compact overview, matching the repository layout:

```
zoo/
├── index.html          # Main HTML and script inclusion order
├── README.md
├── css/
│   └── style.css       # Central game styling
├── js/
│   ├── state.js        # Global GameState object
│   ├── utils.js        # Helper utilities (random, id, formatters)
│   ├── eggs.js         # Egg definitions & metadata
│   ├── animals.js      # Animal pools and templates
│   ├── render.js       # DOM render updates for each panel
│   ├── ui.js           # Event wiring and UI handlers
│   ├── leaderboard.js  # LocalStorage leaderboard helpers
│   ├── main.js         # Game orchestrator and tick loop
│   └── systems/        # Game logic modules
│       ├── hatching.js
│       ├── feeding.js
│       ├── cleaning.js
│       ├── economy.js
│       ├── happiness.js
│       ├── events.js
│       ├── habitat.js
│       ├── disease.js
│       ├── prestige.js
│       └── lose.js
└── assets/             # Optional images/icons
```

---

## How to run locally
1. Open `index.html` in any modern browser (Chrome, Edge, Firefox).
2. Optional: Run a simple local web server for consistent localStorage behavior:

```powershell
python -m http.server 8000
# Then open http://localhost:8000 in your browser
```

---

## Developer notes & systems overview
The project uses a global `GameState` object (declared in `js/state.js`) as a single source of truth; all systems read and write from it. The main loop is in `main.js`, which calls each system every tick, then triggers `Render.all()`.

Initialization:
- `main.js` sets up the game tick loop and calls `UI.init()` and `Leaderboard.init()` once the DOM is ready.
- `UI.init()` registers DOM event handlers using event delegation and safe checks for UI actions.

Primary systems (in `js/systems/`):
- HatchingSystem — eggs to animals
- FeedingSystem — feed costs & hunger restoration
- CleaningSystem — bath queue and cleaning logic
- DiseaseSystem — sickness checks, clinic queue, treatment flow
- HabitatSystem — habitat assignment & bonus multipliers
- HappinessSystem — happiness calculations & effective income
- EconomySystem — income calculation, coin balance, buy/sell logic
- EventsSystem — random game events & modifiers
- PrestigeSystem — reset & permanent progression
- LoseSystem — game over checks

Important: Most systems contain defensive `console.warn` checks for missing dependencies (e.g., `GameState`, `Utils`, or configuration constants) and normally safe no-op behaviors when a dependency is absent during load ordering.

---

## Game rules & mechanics (detailed)
This section mirrors the specification embedded in the original README and JS comments.

3.1 Eggs & Hatching
- Players buy eggs (common/rare/mystic).
- Egg attributes include price, hatchTime (ms), emoji, and name.
- Eggs incubate and hatch into animals after `hatchTime`; an animal is chosen from the matched pool.

3.2 Animals
Each animal instance includes:
- Identity: id, name, emoji, rarity, fromEggType
- Economy: income (base), effectiveIncome
- Care stats: hunger, cleanliness, happiness
- Health: healthStatus, neglectTicks
- Habitat: assigned habitat, habitat bonus multiplier
- Meta: createdAt timestamp

3.3 Feeding
- Feeding costs coins, increases hunger, reduces neglect, and typically increases happiness.

3.4 Cleaning & Bath House
- The bath house is a FIFO queue. Players can queue animals and one is cleaned at a time. Cleaning restores cleanliness and improves happiness.

3.5 Disease & Clinic
- Neglect (low hunger and cleanliness for a period) leads to sickness.
- Sick animals earn no income and can be sent to the clinic for treatment; clinic treatments cost coins and take time.
- Clinic logic:
  - `GameState.clinicQueue` stores queued animal IDs.
  - `GameState.currentPatient` stores the currently treated patient and timestamps.
  - `GameState.clinicQueueCosts` maps queued animal ID -> treatment cost (used for refunds).
  - Canceling queued treatments refunds the stored cost; canceling an in-progress treatment stops it (no refund) and leaves the animal `sick`.
  - Selling an animal while it’s queued refunds its queued clinic cost and removes it from the queue; selling while treated cancels the treatment.

3.6 Habitats
- Habitats provide bonuses; animals have a habitat key and gain the habitat bonus multiplier when housed correctly.

3.7 Happiness
- Calculated from hunger, cleanliness, health, habitat match, and events; affects the income multiplier.

3.8 Economy
- Each tick, effective income is computed for each animal using multipliers:
  income = base * happinessMult * habitatMult * prestigeMult * eventMult
- `GameState.incomePerSecond` shows the total and coins update each tick.
- It also handles egg purchases and selling animals, which return item-specific coin values.

3.9 Events
- Random events (e.g., coins bonus, cleanliness reduction) can occur and be persisted in `GameState.events`.

3.10 Prestige
- Prestige resets the run but awards permanent bonuses (global income multipliers).

3.11 Leaderboard
- Stores final runs (prestiges) in `GameState.leaderboard` and localStorage.

---

## UI Layout / Panels (brief)
Panels are handled by `render.js` and include:
- Top Bar (`#top-bar`): coins, income, animals & egg count, prestige
- Game Over (`#game-over-section`): Game Over display & Restart
- Egg Shop (`#egg-shop-section`): buy eggs
- Incubator (`#incubator-section`): active eggs and hatch progress bars
- Your Zoo (`#zoo-section`): animal cards, health, hunger, cleanliness, actions
- Bath House (`#bath-house-section`): active bath & waiting queue
- Clinic (`#clinic-section`): current patient, progress & queue; can cancel queued treatments
- Habitats (`#habitat-section`), Events (`#events-section`), Leaderboard (`#leaderboard-section`), Prestige (`#prestige-section`)

---

## Contributing
- The project is intentionally lightweight and plain-JS. To add features, add or update the appropriate system under `js/systems/` and then update `render.js` and `ui.js` for required UI and event bindings.
- Please keep `GameState` as the single source of truth and avoid direct DOM manipulation outside `render.js`.

---

## License
Public domain sample/demo: feel free to adapt or reuse for learning and prototyping.

---

If you’d like, I can now: add a brief testing checklist, implement `effectiveIncome` usage inside `economy.js`, or add a small "confirmation modal" for cancelling clinic treatment.
# 🐾 Fantasy Zoo — Idle Pet Management Game

Fantasy Zoo is a modular, extendable browser game built using HTML, CSS, and JavaScript. You hatch eggs, manage animals' needs (hunger, cleanliness, happiness), and grow your zoo's income. The game is designed for easy expansion — add systems like habitats, disease, events, and prestige.

---

## Features

- Buy eggs (Common / Rare / Mystic)
- Incubate eggs and hatch animals with rarity and income values
- Maintain animals: feed, clean, treat at clinic
- Bath house (FIFO queue) — only one animal bathed at a time
- Disease system with a clinic queue and automated treatments
	- Clinic queue and treatment: sick animals can be queued for treatment; treatments have a cost and duration. Players can cancel queued treatments and receive a refund (clinic cost tracked per queue entry). Selling an animal cancels queued treatment and refunds its clinic cost.
- Economy system: animals produce coins per second
- Leaderboard: local storage-based run records
- Prestige: reset run for permanent bonuses
- Modular systems for easy future expansion (events, habitats, happiness)

---

## Gameplay overview

Every tick (default 1 second):

1. HatchingSystem checks eggs and hatches them into animal instances
2. CleaningSystem advances baths and processes a queue
3. DiseaseSystem checks animals for neglect → can make them sick
4. DiseaseSystem processes clinic queue and treats animals
5. HappinessSystem updates animal perks and computed effective incomes
6. EconomySystem sums effective incomes and adds coins
7. Render updates the UI

Lose conditions are:

- Bankrupt (coins < 0)
- No animals & no eggs & cannot afford cheapest egg
- All animals have happiness <= 0

If any are true, the game shows a clear Game Over message with a Restart button.

---

## Folder structure

```
zoo/
├── index.html        # Main HTML and script/cascade order
├── README.md         # This document
├── css/
│   └── style.css     # All UI styling
├── js/
│   ├── state.js      # Global game state
│   ├── utils.js      # Helpers (random, id, formatters)
│   ├── eggs.js       # Egg definitions
│   ├── animals.js    # Animal pools and templates
│   ├── render.js     # DOM render updates for each panel
│   ├── ui.js         # Event wiring, delegations, handlers
│   ├── leaderboard.js# Local storage-based leaderboard helpers
│   ├── main.js       # Game orchestrator and tick loop
│   └── systems/      # Game logic modules
│       ├── hatching.js
│       ├── feeding.js
│       ├── cleaning.js
│       ├── economy.js
│       ├── happiness.js
│       ├── events.js
│       ├── habitat.js
│       ├── disease.js
│       ├── prestige.js
│       └── lose.js
└── assets/
    └── (optional images/icons)
```

---

## How to run locally

1. Open `index.html` in a current browser.
2. Tip: Run a lightweight HTTP server if needed for consistent localStorage behavior:

```powershell
python -m http.server 8000
# then open http://localhost:8000
```

---

## Developer notes

- The `main.js` file initializes modules and the tick loop. The UI and leaderboard initialize only once via `UI.init()` and `Leaderboard.init()`.
- `GameState` is the single source of truth. All systems read and write into it.
- If adding a system that depends on timing, ensure it runs inside `main.js`'s tick.

If you want further features, such as a dark theme or improved progression, please open an issue or submit a PR.

---

## License

Public domain sample demo (tweak and reuse as you like).
Here’s a clean spec you can treat as the final requirements for Fantasy Zoo.

⸻

1. Game Overview
	•	Type: Idle / management browser game.
	•	Goal: Build and manage a fantasy zoo of animals hatched from eggs, keep them happy and healthy, and grow income through habitats, events, and prestige.
	•	Lose Conditions (Game Over):
The player loses if any of these are true:
	1.	No animals, no eggs, and can’t afford new egg
	•	animals.length === 0
	•	eggs.length === 0
	•	coins < cheapestEggPrice
	2.	Bankrupt – coins < 0
	3.	All animals unhappy – every animal has happiness <= 0

On Game Over, show a clear message and a Restart Game button.

⸻

2. Core Game Loop

Each tick (e.g., every 1 second):
	1.	Update egg hatching (turn ready eggs into animals).
	2.	Update bath house (cleaning queue and current bath).
	3.	Update disease/clinic (sick animals, treatment queue).
	4.	Update habitats (bonuses/penalties, assignments).
	5.	Update happiness (based on hunger, cleanliness, events, disease).
	6.	Update events (random buffs/debuffs, durations).
	7.	Update economy (coins, income per second, multipliers).
	8.	Check lose conditions and set game-over flags if triggered.
	9.	Re-render all UI panels.

⸻

3. Core Mechanics

3.1 Eggs & Hatching
	•	Player buys egg types: common, rare, mystic, etc.
	•	Each egg has:
	•	price
	•	hatchTime (ms)
	•	emoji, name, type (for display)
	•	Eggs go into incubator and hatch after hatchTime.
	•	When an egg hatches:
	•	Select an animal from the corresponding animal pool.
	•	Create an animal instance with defaults (see section 6.2).

3.2 Animals

Each animal instance:
	•	Identity: id, name, emoji, rarity, fromEggType
	•	Economy: income (base income per sec), effectiveIncome
	•	Care stats:
	•	hunger (0–100)
	•	cleanliness (0–100)
	•	happiness (0–100)
	•	healthStatus ("healthy" | "sick" etc.)
	•	neglectTicks (count of bad-care ticks)
	•	Habitat:
	•	habitat (e.g., "forest" | "desert" | "ocean" | "arctic" | "mystic" | null)
	•	habitatBonusMultiplier (e.g., 1.0+)
	•	Happiness → income:
	•	happinessIncomeMultiplier (e.g., 0.5–1.5)
	•	Meta: createdAt timestamp

3.3 Feeding
	•	Player can feed animals:
	•	Costs coins (per feed).
	•	Increases hunger back toward 100.
	•	Reduces neglectTicks.
	•	Impacts happiness positively if hunger was low.

3.4 Cleaning & Bath House
	•	Animals get dirtier over time or via events.
	•	Player can queue animals for a bath:
	•	Animals are added to bathQueue.
	•	currentBath holds the animal currently being cleaned, with start time + duration.
	•	After bath completes:
	•	cleanliness set high (e.g., 100).
	•	neglectTicks reduced.
	•	happiness improves.

3.5 Disease & Clinic
	•	Poor care (low hunger/cleanliness, high neglect, bad events) can make animals sick.
	•	Sick animals:
	•	healthStatus = "sick"
	•	Lower happiness and possibly income.
	•	Player can send animals to clinic:
	•	Adds animal to clinicQueue.
	•	currentPatient is treated over a duration.
	•	After treatment:
	•	healthStatus = "healthy"
	•	Some stats (happiness/neglect) improved.
	•	Clinic treatment may cost coins.

3.6 Habitats
	•	Zoo has multiple habitats:
	•	Example keys: forest, desert, ocean, arctic, mystic
	•	Each habitat:
	•	key, level, capacity, animalIds[]
	•	Animals assigned to a suitable habitat:
	•	Gain habitat bonus to income (habitatBonusMultiplier).
	•	Overcrowding or wrong habitat can reduce happiness or bonus.

3.7 Happiness
	•	Happiness depends on:
	•	Hunger
	•	Cleanliness
	•	HealthStatus
	•	Habitat match / overcrowding
	•	Active events (positive or negative)
	•	Happiness changes per tick; affects:
	•	happinessIncomeMultiplier
	•	Lose condition if all animals have happiness <= 0.

3.8 Economy
	•	Each tick, for every animal:
	•	Compute income (see multipliers in 6.3).
	•	Add to GameState.coins.
	•	GameState.incomePerSecond holds the current total.
	•	Costs:
	•	Buying eggs
	•	Feeding
	•	Clinic treatment
	•	Possibly other features/events

3.9 Events
	•	Random events can occur:
	•	Example: Double income for X seconds, disease outbreak, mood boost, etc.
	•	Stored in:
	•	events.activeEvents[] (current)
	•	events.history[] (for display)
	•	Can modify:
	•	incomeBoostMultiplier
	•	Happiness
	•	Disease risk, etc.

3.10 Prestige
	•	Player can Prestige after reaching some thresholds (high coins/animals).
	•	On Prestige:
	•	Reset zoo for a new run.
	•	Keep permanent bonuses:
	•	prestige.count
	•	prestige.totalPrestigePoints
	•	modifiers.globalPrestigeMultiplier (income multiplier).
	•	Optionally record run in leaderboard.

3.11 Leaderboard
	•	Stores finished runs (usually when Prestiging).
	•	Uses localStorage.
	•	Each entry stores:
	•	Coins, pets hatched, highest rarity, time played, etc.
	•	Renders top N runs with rank.

⸻

4. UI Layout / Panels

Panels (index.html + render.js):
	1.	Top Bar (#top-bar)
	•	Shows coins, income per second, animals count, eggs count, prestige count.
	2.	Game Over (#game-over-section)
	•	Empty normally.
	•	When GameState.isGameOver === true:
	•	Show reason-specific message:
	•	bankrupt
	•	no_animals
	•	all_unhappy
	•	Show Restart Game button.
	3.	Egg Shop (#egg-shop-section)
	•	Shows each egg type with:
	•	Name, emoji, price, hatch time.
	•	Buy buttons with data-action="buy-egg".
	4.	Incubator (#incubator-section)
	•	Shows eggs currently hatching.
	•	Progress bars & time remaining.
	5.	Your Zoo (#zoo-section)
	•	Shows animal cards:
	•	Emoji, name, rarity
	•	Base income & effective income
	•	Happiness (emoji + %)
	•	Health status (badge)
	•	Habitat name
	•	Multipliers
	•	Buttons:
	•	Feed (data-action="feed")
	•	Clean (data-action="clean")
	•	Sell (data-action="sell")
	•	Send to Clinic (data-action="send-to-clinic")
	•	Habitat move buttons:
	•	data-action="assign-habitat"
	•	data-habitat-key="forest" | "desert" | "ocean" | "arctic" | "mystic"
	6.	Bath House (#bath-house-section)
	•	Shows current animal in bath (if any).
	•	Progress bar for cleaning time.
	•	Queue list of waiting animals.
	7.	Clinic (#clinic-section)
	•	Shows current patient with treatment progress.
	•	Queue of animals waiting for clinic.
	8.	Habitats (#habitat-section)
	•	Shows card per habitat:
	•	Name, level, capacity, current animals count.
	9.	Events (#events-section)
	•	Shows last few (e.g., 5) events from events.history.
	10.	Leaderboard (#leaderboard-section)
	•	Table of top runs (Rank, Coins, Pets, Best Rarity, Time).
	11.	Prestige (#prestige-section)
	•	Shows:
	•	Total prestiges
	•	Global income multiplier
	•	Prestige button (data-action="prestige"), disabled if not allowed.

⸻

5. Global Game State (GameState)

5.1 Top-Level Fields
	•	coins: number
	•	incomePerSecond: number
	•	animals: AnimalInstance[]
	•	eggs: EggInstance[]
	•	bathQueue: string[] (animal IDs)
	•	currentBath: { id, start, durationMs } | null
	•	clinicQueue: string[]
	•	currentPatient: { id, start, durationMs } | null
	•	habitats: { [key: string]: { key, level, capacity, animalIds[] } }
	•	events: { activeEvents: [], history: [], lastEventTime: number }
	•	leaderboard: RunSummary[]
	•	prestige: { count: number, totalPrestigePoints: number, lastPrestigeTime: number }
	•	modifiers: { globalPrestigeMultiplier: number, incomeBoostMultiplier: number }
	•	runStartTime: number | null
	•	lastTick: number | null
	•	isGameOver: boolean
	•	gameOverReason: "bankrupt" | "no_animals" | "all_unhappy" | null

5.2 Per-Animal Defaults (set in hatching system)

When an egg hatches, each new animal gets:
	•	hunger = 100
	•	cleanliness = 100
	•	happiness = 70
	•	healthStatus = "healthy"
	•	neglectTicks = 0
	•	habitat = null
	•	habitatBonusMultiplier = 1
	•	happinessIncomeMultiplier = 1
	•	effectiveIncome = baseIncome
	•	fromEggType = "common" | "rare" | "mystic"

⸻

6. Economy Formula

For each animal each tick:
	•	Let:
	•	base = animal.income
	•	happyMult = animal.happinessIncomeMultiplier
	•	habitatMult = animal.habitatBonusMultiplier
	•	prestigeMult = GameState.modifiers.globalPrestigeMultiplier
	•	eventMult = GameState.modifiers.incomeBoostMultiplier
	•	Effective income:

income = base * happyMult * habitatMult * prestigeMult * eventMult


	•	Sum all animal incomes → GameState.incomePerSecond and add to coins.

⸻

7. Files & Folder Structure

zoo/
│
├── index.html
├── README.md
│
├── css/
│   └── style.css
│
├── js/
│   ├── state.js           # Global GameState
│   ├── utils.js           # Helpers (random, id, time, etc.)
│   ├── eggs.js            # Egg definitions
│   ├── animals.js         # Animal pools per egg type
│   ├── render.js          # All UI rendering
│   ├── ui.js              # Event listeners + calling systems
│   ├── leaderboard.js     # Leaderboard storage + ranking
│   ├── main.js            # Main loop + orchestration
│   │
│   ├── systems/
│   │   ├── hatching.js    # Eggs → animals
│   │   ├── feeding.js     # Feed animals, cost logic
│   │   ├── cleaning.js    # Bath queue, cleaning timers
│   │   ├── economy.js     # Income per second, coin updates
│   │   ├── happiness.js   # Happiness changes and multipliers
│   │   ├── events.js      # Random events, buffs/debuffs
│   │   ├── habitat.js     # Habitat assignment & bonuses
│   │   ├── disease.js     # Sickness, clinic queue
│   │   ├── prestige.js    # Prestige logic & resets
│   │   └── lose.js        # Lose criteria & game-over flags
│
└── assets/
    └── (optional images/icons)

