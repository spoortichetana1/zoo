/* 
    =============================================================================
    FANTASY ZOO - HATCHING SYSTEM (js/systems/hatching.js)
    =============================================================================
    RESPONSIBILITY:
    ---------------
    This system manages everything related to EGGS TURNING INTO ANIMALS.

    It does **two main things**:
      1. TICK: Check all eggs in GameState.eggs on each game tick.
         - If an egg’s hatch timer is complete → hatch it into an animal.
         - Remove hatched eggs from the incubator.
      2. HATCH: Convert a single egg into an animal instance.
         - Pick a random animal template from AnimalPools[egg.type].
         - Create a full animal object with stats.
         - Push it into GameState.animals.

    WHAT THIS FILE DOES **NOT** DO:
    --------------------------------
    - It does NOT handle buying eggs (EconomySystem does that).
    - It does NOT render UI (Render.js does that).
    - It does NOT handle income, hunger, cleanliness logic.

    DEBUGGING HATCHING PROBLEMS:
    ----------------------------
    If:
      ✔ Eggs never hatch → tick() might not be called or time checks are wrong.
      ✔ Egg disappears but no animal appears → hatch() might fail.
      ✔ Wrong animal type from egg → check AnimalPools and egg.type mapping.
      ✔ JS errors mention "AnimalPools" / "EggData" / "GameState" undefined:
          → Check that js/animals.js, js/eggs.js, js/state.js are loaded BEFORE
            this file in index.html.
*/


(function () {
    "use strict";

    // Safety check: Ensure required globals exist, but don't crash the game.
    if (!window.GameState) {
        console.warn("HatchingSystem: GameState is not defined. Check js/state.js load order.");
    }
    if (!window.Utils) {
        console.warn("HatchingSystem: Utils is not defined. Check js/utils.js load order.");
    }
    if (!window.EggData) {
        console.warn("HatchingSystem: EggData is not defined. Check js/eggs.js load order.");
    }
    if (!window.AnimalPools) {
        console.warn("HatchingSystem: AnimalPools is not defined. Check js/animals.js load order.");
    }

    // Shortcut references for cleaner code (optional)
    const GS = window.GameState;
    const U  = window.Utils;

    // =========================================================================
    // PUBLIC API: HatchingSystem.tick()
    // =========================================================================
    /*
        This function should be called once every game tick (e.g., once per
        second) from js/main.js.

        STEPS:
        ------
        1. Iterate through GameState.eggs.
        2. For each egg:
             - If currentTime - egg.start >= egg.hatchTime:
                  → hatchEgg(egg)
                  → mark egg to be removed.
        3. Remove all hatched eggs from GameState.eggs.
    */
    function tick() {
        if (!GS || !Array.isArray(GS.eggs)) return;

        const now = U.now();
        const remainingEggs = [];

        // Loop through all current eggs
        for (let i = 0; i < GS.eggs.length; i++) {
            const egg = GS.eggs[i];

            // Defensive checks: ensure egg has needed fields
            if (!egg || typeof egg.start !== "number" || typeof egg.hatchTime !== "number") {
                console.warn("HatchingSystem: invalid egg object detected:", egg);
                continue; // Skip this egg
            }

            const elapsed = now - egg.start;

            // Egg is ready to hatch
            if (elapsed >= egg.hatchTime) {
                hatchEgg(egg);
            } else {
                // Still incubating, keep it in the list
                remainingEggs.push(egg);
            }
        }

        // Replace GameState.eggs with only those that are still incubating
        GS.eggs = remainingEggs;
    }

    // =========================================================================
    // INTERNAL: hatchEgg(egg)
    // =========================================================================
    /*
        Converts a single egg object into an animal instance and pushes it
        into GameState.animals.

        egg object structure (from EconomySystem.buyEgg):
            {
                id: "egg-...",
                type: "common" | "rare" | "mystic",
                start: <timestamp>,
                hatchTime: <ms number>
            }

        PROCESS:
        --------
        1. Look up the correct animal pool based on egg.type in AnimalPools.
        2. Pick a random animal template.
        3. Build a full animal instance with:
            - id
            - name, emoji, rarity, income
            - hunger, cleanliness, happiness defaults
            - metadata like fromEggType
        4. Push to GameState.animals.

        If anything is missing (unknown egg type, empty pool), we log a warning
        and simply skip hatching that egg instead of crashing.
    */
    function hatchEgg(egg) {
        if (!egg || !egg.type) {
            console.warn("HatchingSystem: Cannot hatch egg; missing type:", egg);
            return;
        }

        const pool = window.AnimalPools ? AnimalPools[egg.type] : null;

        // If there is no pool for this egg type, it's a configuration issue.
        if (!Array.isArray(pool) || pool.length === 0) {
            console.warn(
                `HatchingSystem: No animal pool found or pool is empty for egg type '${egg.type}'.`
            );
            return;
        }

        // Pick a random template from the appropriate pool
        const template = U.randomChoice(pool);
        if (!template) {
            console.warn("HatchingSystem: randomChoice returned null for pool:", pool);
            return;
        }

        // Create a unique ID for this new animal
        const animalId = U.id("animal");

        // Create the actual animal instance
        const newAnimal = {
            id: animalId,

            // Template based fields
            name: template.name,
            emoji: template.emoji,
            rarity: template.rarity,
            income: template.income,

            // Core stats: start at full hunger/cleanliness; happiness is future use
            hunger: 100,       // 100% full
            cleanliness: 100,  // 100% clean
            happiness: 100,    // Reserved for future happiness system

            // Health & habitat will be used once those systems are implemented
            healthStatus: "healthy", // healthy | sick (for DiseaseSystem)
            habitat: null,           // e.g., "forest", "arctic" (for HabitatSystem)

            // Metadata: which egg type it came from
            fromEggType: egg.type
        };

        // Push into the global animals list
        if (!Array.isArray(GS.animals)) {
            GS.animals = [];
        }
        GS.animals.push(newAnimal);

        // Optional: console log to help debugging and give feedback
        console.log(
            `HatchingSystem: Egg of type '${egg.type}' hatched into '${newAnimal.name}' (${newAnimal.rarity}, income ${newAnimal.income}/s).`
        );
    }

    // =========================================================================
    // PUBLIC EXPORT
    // =========================================================================
    /*
        Expose HatchingSystem as a global object with a single public method:
            - HatchingSystem.tick()
        This is what js/main.js will call every tick.
    */
    window.HatchingSystem = {
        tick
    };
})();
