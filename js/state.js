// js/state.js
/* 
    =============================================================================
    FANTASY ZOO - GLOBAL GAME STATE
    =============================================================================
    This file defines ONE shared object: window.GameState

    All other modules (systems, render, ui, etc.) read/write from this.
    No timers, no DOM code here – just data.
*/

(function () {
    "use strict";

    // How many coins the player starts with on a completely fresh run.
    // PrestigeSystem may override this for later runs.
    const STARTING_COINS = 100;

    /*
        GameState:
        ----------
        Central store for all game data.
    */
    window.GameState = {
        // ---------------------------------------------------------------------
        // 1. BASIC ECONOMY & COLLECTIONS
        // ---------------------------------------------------------------------

        // Player's current coins
        coins: STARTING_COINS,

        // Total income per second (computed by EconomySystem.tick)
        incomePerSecond: 0,

        // All living animals in the zoo (array of "animal instances")
        animals: [],

        // All eggs currently incubating (array of "egg instances")
        eggs: [],

        // ---------------------------------------------------------------------
        // 2. BATH HOUSE
        // ---------------------------------------------------------------------

        // Queue of animal IDs waiting to be cleaned
        bathQueue: [],

        // Currently active bath job (or null)
        // { id: <animalId>, start: <timestamp>, durationMs: <number> }
        currentBath: null,

        // ---------------------------------------------------------------------
        // 3. DISEASE / CLINIC
        // ---------------------------------------------------------------------

        // Queue of animal IDs waiting for treatment in the clinic
        clinicQueue: [],

        // Currently active clinic job (or null)
        // { id: <animalId>, start: <timestamp>, durationMs: <number> }
        currentPatient: null,
        // clinicQueueCosts: mapping id -> clinic cost (used for refunds / UI)
        clinicQueueCosts: {},

        // ---------------------------------------------------------------------
        // 4. HABITATS
        // ---------------------------------------------------------------------

        // Habitats are created/managed by HabitatSystem.
        // Shape:
        // {
        //   forest: { key, level, capacity, animalIds: [] },
        //   desert: { ... },
        //   ...
        // }
        habitats: {},

        // ---------------------------------------------------------------------
        // 5. EVENTS
        // ---------------------------------------------------------------------

        // Random events state
        events: {
            activeEvents: [],   // currently running events
            history: [],        // recent past events for log display
            lastEventTime: 0    // last time a new event started (timestamp ms)
        },

        // ---------------------------------------------------------------------
        // 6. LEADERBOARD
        // ---------------------------------------------------------------------

        // Finished runs (prestiges) stored here.
        // Leaderboard.init() loads/saves this via localStorage.
        leaderboard: [],

        // ---------------------------------------------------------------------
        // 7. PRESTIGE & GLOBAL MODIFIERS
        // ---------------------------------------------------------------------

        // Persistent meta-progress across runs
        prestige: {
            count: 0,               // how many times the player has prestiged
            totalPrestigePoints: 0, // can be used later for unlocks
            lastPrestigeTime: 0     // timestamp ms of last prestige
        },

        // Global multipliers that affect income and other stats
        modifiers: {
            // Permanent income multiplier from prestige (1 = no bonus)
            globalPrestigeMultiplier: 1,

            // Temporary multiplier from events (e.g. Double Tips)
            incomeBoostMultiplier: 1
        },

        // ---------------------------------------------------------------------
        // 8. TIMING
        // ---------------------------------------------------------------------

        // When the current run started (ms timestamp). Set in main.js.
        runStartTime: null,

        // Last time the main tick ran (ms timestamp). Updated in main.js.
        lastTick: null,

        // ---------------------------------------------------------------------
        // 9. GAME OVER STATE
        // ---------------------------------------------------------------------

        // Whether the player has lost this run.
        isGameOver: false,

        // Why the game ended:
        // "bankrupt"   → coins < 0
        // "no_animals" → no animals, no eggs, and cannot afford cheapest egg
        // "all_unhappy"→ all animals have happiness <= 0
        // null         → game is still running
        gameOverReason: null
    };
})();
