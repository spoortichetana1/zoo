/* 
    =============================================================================
    FANTASY ZOO - GLOBAL GAME STATE (js/state.js)
    =============================================================================
    RESPONSIBILITY:
    ---------------
    This file defines ONE shared global object: window.GameState.

    All systems (hatching, economy, cleaning, disease, habitats, events,
    prestige, leaderboard, render, ui, etc.) read and write data on this
    object.

    IMPORTANT:
    ----------
    - This file should be loaded BEFORE any other game logic files.
      (index.html: include state.js near the top of the JS list.)
    - We only define data here, NOT behavior. No timers, no DOM code.

    WHAT WE STORE HERE:
    -------------------
    1. Basic economy & collections:
         - coins
         - incomePerSecond
         - animals[]
         - eggs[]

    2. Bath house:
         - bathQueue[]
         - currentBath

    3. Disease / clinic:
         - clinicQueue[]
         - currentPatient

    4. Habitats:
         - habitats {}   (structure is filled/maintained by HabitatSystem)

    5. Events:
         - events { activeEvents[], history[], lastEventTime }

    6. Leaderboard:
         - leaderboard[]  (list of finished run summaries)

    7. Prestige & global modifiers:
         - prestige { count, totalPrestigePoints, lastPrestigeTime }
         - modifiers { globalPrestigeMultiplier, incomeBoostMultiplier }

    8. Timing:
         - runStartTime
         - lastTick
*/

(function () {
    "use strict";

    /*
        STARTING_COINS:
        ---------------
        How many coins the player starts with at the very beginning
        of the very first run.

        - After a prestige, PRESTIGE SYSTEM may override this with its own
          starting coins logic.
    */
    const STARTING_COINS = 100;

    /*
        We define GameState as a plain JavaScript object and attach it to
        window so all other files can access it as window.GameState.
    */
    window.GameState = {
        // ---------------------------------------------------------------------
        // 1. BASIC ECONOMY & COLLECTIONS
        // ---------------------------------------------------------------------

        /*
            Player's current coins.
            - Modified mainly by EconomySystem, EconomySystem.buyEgg(),
              EconomySystem.sellAnimalById(), DiseaseSystem (clinic costs),
              PrestigeSystem (reset), etc.
        */
        coins: STARTING_COINS,

        /*
            How many coins the zoo is earning PER SECOND right now.
            - EconomySystem updates this every tick.
            - Render.js uses it in the top bar.
        */
        incomePerSecond: 0,

        /*
            All currently owned animals live in this array.
            - Each entry is an "animal instance" created by HatchingSystem
              from a template in AnimalPools (animals.js).
        */
        animals: [],

        /*
            All eggs currently incubating live in this array.
            - Each entry is an "egg instance" created by EconomySystem.buyEgg()
              and transformed into animals by HatchingSystem.tick().
        */
        eggs: [],

        // ---------------------------------------------------------------------
        // 2. BATH HOUSE
        // ---------------------------------------------------------------------

        /*
            Queue of animal IDs waiting to use the bath.
            - CleaningSystem uses this.
        */
        bathQueue: [],

        /*
            Information about the animal that is currently being cleaned.
            - Either:
                 null
              OR:
                 {
                   id: <animalId>,
                   start: <timestamp ms>,
                   durationMs: <number>
                 }
        */
        currentBath: null,

        // ---------------------------------------------------------------------
        // 3. DISEASE / CLINIC
        // ---------------------------------------------------------------------

        /*
            Queue of animal IDs waiting for treatment in the clinic.
            - Managed by DiseaseSystem.
        */
        clinicQueue: [],

        /*
            Current patient being treated in the clinic.
            - Either null or same shape as currentBath:
                { id, start, durationMs }
        */
        currentPatient: null,

        // ---------------------------------------------------------------------
        // 4. HABITATS
        // ---------------------------------------------------------------------

        /*
            All habitat data goes here.

            Shape:
                {
                  forest: { key, level, capacity, animalIds: [...] },
                  desert: { ... },
                  ...
                }

            - HabitatSystem.ensureHabitatState() fills and maintains this
              structure each tick. We start with an empty object here.
        */
        habitats: {},

        // ---------------------------------------------------------------------
        // 5. EVENTS
        // ---------------------------------------------------------------------

        /*
            Random events system state.

            - activeEvents: currently running timed events
            - history     : recent past events (for log / UI)
            - lastEventTime: last time a new event was triggered (ms)
        */
        events: {
            activeEvents: [],
            history: [],
            lastEventTime: 0
        },

        // ---------------------------------------------------------------------
        // 6. LEADERBOARD
        // ---------------------------------------------------------------------

        /*
            Local leaderboard entries (finished runs).

            - Leaderboard.init() loads this from localStorage on startup.
            - PrestigeSystem + Leaderboard.recordRun() add new entries here
              when the player prestiges.
        */
        leaderboard: [],

        // ---------------------------------------------------------------------
        // 7. PRESTIGE & GLOBAL MODIFIERS
        // ---------------------------------------------------------------------

        /*
            Prestige meta-progress across runs.
        */
        prestige: {
            /*
                How many times the player has prestiged so far.
             */
            count: 0,

            /*
                Total prestige points earned.
                - For now, each prestige gives +1.
                - You can later use this to buy permanent unlocks.
            */
            totalPrestigePoints: 0,

            /*
                Timestamp (ms) of the last prestige.
            */
            lastPrestigeTime: 0
        },

        /*
            Global modifiers that affect the whole zoo.

            - globalPrestigeMultiplier:
                  * Permanent income multiplier from prestige.
                  * Starts at 1.0 (no bonus).
            - incomeBoostMultiplier:
                  * Temporary multiplier from events (e.g., "Double Tips").
                  * EventsSystem will update this.
        */
        modifiers: {
            globalPrestigeMultiplier: 1,
            incomeBoostMultiplier: 1
        },

        // ---------------------------------------------------------------------
        // 8. TIMING
        // ---------------------------------------------------------------------

        /*
            Time when the CURRENT RUN started, in ms.
            - main.js sets this when the game boots or when prestige reset
              happens.
        */
        runStartTime: null,

        /*
            Timestamp of the last tick executed by the main loop.
            - main.js updates this every tick.
        */
        lastTick: null
    };
})();
