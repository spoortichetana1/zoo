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

