/* 
    =============================================================================
    FANTASY ZOO - CLEANING SYSTEM (js/systems/cleaning.js)
    =============================================================================
    RESPONSIBILITY:
    ---------------
    This system manages EVERYTHING related to the Bath House:
      1. Sending animals to the bath queue (when user clicks "Clean").
      2. Running the bath timer for the current animal.
      3. Resetting an animal’s cleanliness to full when the bath is finished.

    It exposes two main public functions:
      - CleaningSystem.sendToBathById(animalId)
      - CleaningSystem.tick()

    HOW IT WORKS (HIGH LEVEL):
    --------------------------
    - Zoo UI has a "Clean" button for each animal.
      → UI.js calls CleaningSystem.sendToBathById(animalId).

    - The system:
        ✔ Checks if animal exists.
        ✔ Checks if not already in bath or queue.
        ✔ Checks if player has enough coins.
        ✔ Deducts cleaning cost.
        ✔ Adds the animal's ID to GameState.bathQueue.

    - Each game tick:
        → CleaningSystem.tick() is called from main.js.
        → If there is no current bath and queue is non-empty:
              start a new bath using the first ID in queue.
        → If there is a current bath:
              check if bath time is over.
              if done:
                 - set cleanliness to 100
                 - optionally give a small happiness boost
                 - clear current bath
                 - (next tick, the next pet in queue will start)

    IMPORTANT:
    ----------
    - This system does NOT render any UI; it ONLY changes GameState.
    - Render.bathHouse reads GameState.bathQueue and GameState.currentBath
      to show the right visuals.
    - If pets stay dirty or bath never finishes, the problem is likely here.

    EXPECTED STATE FIELDS USED:
    ---------------------------
    - GameState.animals     : array of animal objects
    - GameState.bathQueue   : array of animal IDs (waiting)
    - GameState.currentBath : null or { id, start, durationMs }
    - GameState.coins       : number (player currency)
*/


(function () {
    "use strict";

    // Short aliases to keep code less verbose
    const GS = window.GameState;
    const U  = window.Utils;

    if (!GS) {
        console.warn("CleaningSystem: GameState is not defined. Check js/state.js load order.");
    }
    if (!U) {
        console.warn("CleaningSystem: Utils is not defined. Check js/utils.js load order.");
    }

    // =========================================================================
    // CONFIGURATION CONSTANTS
    // =========================================================================
    /*
        CLEAN_COST_MULTIPLIER:
        ----------------------
        Cleaning cost is based on animal income.

        Formula:
            cleanCost = animal.income * CLEAN_COST_MULTIPLIER

        You can tweak this number for balancing.
    */
    const CLEAN_COST_MULTIPLIER = 6;

    /*
        BATH_DURATION_MS:
        -----------------
        How long a bath should last for each animal (in milliseconds).

        This value is also used by Render.bathHouse() to compute progress
        using GameState.currentBath.durationMs.
    */
    const BATH_DURATION_MS = 7000; // 7 seconds per bath (tweak as you like)

    /*
        MAX_CLEANLINESS:
        ----------------
        Cleanliness is a percentage value from 0 to 100.
    */
    const MAX_CLEANLINESS = 100;

    // =========================================================================
    // PUBLIC FUNCTION: sendToBathById
    // =========================================================================
    /*
        Called when the user clicks the "Clean" (🛁) button for an animal.

        STEPS:
        ------
        1. Validate GameState and animal list.
        2. Find animal with matching ID.
        3. Ensure animal is not already in the bath or queue.
        4. Check if player has enough coins to pay cleaning cost.
        5. Deduct coins.
        6. Push animal's ID to GameState.bathQueue.
        7. Return true on success, false otherwise.

        PARAM:
        ------
        animalId (string | number)

        RETURNS:
        --------
        boolean:
            true  → Animal successfully added to bath queue.
            false → Something went wrong (missing animal, insufficient coins, etc.).
    */
    function sendToBathById(animalId) {
        if (!GS) {
            console.warn("CleaningSystem.sendToBathById: GameState is missing.");
            return false;
        }

        if (!Array.isArray(GS.animals)) {
            console.warn("CleaningSystem.sendToBathById: GameState.animals is not an array.");
            return false;
        }

        // Ensure bathQueue exists as an array
        if (!Array.isArray(GS.bathQueue)) {
            GS.bathQueue = [];
        }

        const idStr = String(animalId);

        // Find the animal by ID
        const animal = GS.animals.find(a => String(a.id) === idStr);
        if (!animal) {
            console.warn("CleaningSystem.sendToBathById: No animal found with id =", animalId);
            return false;
        }

        // Check if already in queue
        if (GS.bathQueue.some(id => String(id) === idStr)) {
            console.warn("CleaningSystem: Animal already in bath queue:", animal.name);
            return false;
        }

        // Check if currently in bath
        if (GS.currentBath && String(GS.currentBath.id) === idStr) {
            console.warn("CleaningSystem: Animal is already in the bath:", animal.name);
            return false;
        }

        // If animal is already very clean, you may decide to block cleaning.
        // For now, we allow cleaning even if they are still somewhat clean.
        const cleanliness = Number(animal.cleanliness) || 0;

        // Calculate cleaning cost from income
        const baseIncome = Number(animal.income) || 0;
        const cleanCost = baseIncome * CLEAN_COST_MULTIPLIER;

        // If cost is positive, ensure we have enough coins
        if (cleanCost > 0 && GS.coins < cleanCost) {
            console.warn(
                `CleaningSystem: Not enough coins to clean '${animal.name}'. ` +
                `Needs ${cleanCost}, has ${GS.coins}.`
            );
            return false;
        }

        // Deduct coins (if cost > 0)
        if (cleanCost > 0) {
            GS.coins -= cleanCost;
        }

        // Add to bath queue
        GS.bathQueue.push(animal.id);

        console.log(
            `CleaningSystem: Added '${animal.name}' to bath queue (cleanliness ${cleanliness}%, ` +
            `cost ${cleanCost}, coins left ${GS.coins}).`
        );

        return true;
    }

    // =========================================================================
    // PUBLIC FUNCTION: tick
    // =========================================================================
    /*
        Called once per game tick (e.g., once per second) from main.js.

        MAIN RESPONSIBILITIES:
        ----------------------
        1. If there is NO currentBath but bathQueue is NOT empty:
              - Start a new bath with the first animal ID in the queue.
        2. If there IS a currentBath:
              - Check if bath duration has elapsed.
              - If finished:
                    * Find the animal
                    * Set cleanliness to full (100)
                    * Optionally increase happiness
                    * Clear currentBath (so next tick can start a new one)

        NOTE:
        -----
        - This function does NOT render anything.
          Render.bathHouse will read GameState.currentBath and GameState.bathQueue
          to visually represent the queue and progress bar.
    */
    function tick() {
        if (!GS) return;

        // Ensure bathQueue exists
        if (!Array.isArray(GS.bathQueue)) {
            GS.bathQueue = [];
        }

        const now = U ? U.now() : Date.now();

        // 1. If there is NO current bath, but there are animals waiting, start a new bath.
        if (!GS.currentBath && GS.bathQueue.length > 0) {
            const nextId = GS.bathQueue.shift(); // Remove first ID from queue

            GS.currentBath = {
                id: nextId,
                start: now,
                durationMs: BATH_DURATION_MS
            };

            const animal = GS.animals.find(a => String(a.id) === String(nextId));
            if (animal) {
                console.log(`CleaningSystem: Started bath for '${animal.name}'.`);
            } else {
                console.warn(
                    "CleaningSystem.tick: Started bath for unknown animal ID =", nextId
                );
            }
        }

        // 2. If there IS a current bath, check if bath is finished.
        if (GS.currentBath) {
            const { id, start, durationMs } = GS.currentBath;

            // Defensive check: in case durationMs is missing or invalid
            const bathDuration = typeof durationMs === "number" && durationMs > 0
                ? durationMs
                : BATH_DURATION_MS;

            const elapsed = now - start;

            // If time elapsed >= bath duration, the bath is complete.
            if (elapsed >= bathDuration) {
                // Find the animal
                const animal = GS.animals.find(a => String(a.id) === String(id));
                if (animal) {
                    // Restore cleanliness to full
                    if (U && typeof U.clamp === "function") {
                        animal.cleanliness = U.clamp(MAX_CLEANLINESS, 0, MAX_CLEANLINESS);
                    } else {
                        animal.cleanliness = MAX_CLEANLINESS;
                    }

                    // Optional: small happiness boost for being pampered
                    if (typeof animal.happiness === "number") {
                        const newHappiness = animal.happiness + 5; // tweakable
                        animal.happiness = U && typeof U.clamp === "function"
                            ? U.clamp(newHappiness, 0, 100)
                            : Math.min(newHappiness, 100);
                    }

                    console.log(
                        `CleaningSystem: Finished bath for '${animal.name}'. ` +
                        `Cleanliness = ${animal.cleanliness}%.`
                    );
                } else {
                    console.warn(
                        "CleaningSystem.tick: Bath finished, but animal not found for ID =", id
                    );
                }

                // Clear current bath so next animal can start on the next tick.
                GS.currentBath = null;
            }
        }
    }

    // =========================================================================
    // PUBLIC EXPORT
    // =========================================================================
    /*
        Expose CleaningSystem as a global object with two methods:
            - sendToBathById(animalId)
            - tick()

        UI.js calls sendToBathById when the user clicks "Clean".
        main.js calls tick() every game tick.
    */
    window.CleaningSystem = {
        sendToBathById,
        tick
    };
})();
