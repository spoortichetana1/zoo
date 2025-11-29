/* 
    =============================================================================
    FANTASY ZOO - FEEDING SYSTEM (js/systems/feeding.js)
    =============================================================================
    RESPONSIBILITY:
    ---------------
    This system manages EVERYTHING related to feeding animals.

    It does three main things:
      1. Provides a public method:
            FeedingSystem.feedAnimalById(animalId)
      2. Checks if the player has enough coins to feed the animal.
      3. Restores the animal’s hunger back to full (100) if feeding succeeds.

    IMPORTANT:
    ----------
    - This system DOES NOT render UI (Render.js handles that).
    - This system DOES NOT attach event listeners (UI.js handles that).
    - This system ONLY updates GameState (coins + animal.hunger [+ happiness]).

    EXPECTED USAGE:
    ---------------
    - UI.js calls:
          FeedingSystem.feedAnimalById(animalId)
      when a "🍎 Feed" button is clicked.

    RETURN VALUE:
    -------------
    - true  → feeding succeeded (state changed)
    - false → feeding failed (not enough coins, animal missing, etc.)

    COMMON BUGS TO CHECK:
    ---------------------
    - If clicking "Feed" does NOTHING:
        ✔ Open DevTools → Console and check for errors.
        ✔ Ensure js/systems/feeding.js is loaded BEFORE js/ui.js in index.html.
        ✔ Ensure FeedingSystem.feedAnimalById is correctly defined and global.
        ✔ Ensure button has a valid data-animal-id (Render.js).

    - If coins don't change:
        ✔ Check FEED_COST_MULTIPLIER.
        ✔ Ensure GameState.coins is being updated and not NaN.
        ✔ Make sure no other system overwrites coins right after feeding.

    - If hunger bar doesn't move:
        ✔ Confirm animal.hunger is updated in GameState.animals.
        ✔ Ensure Render.zoo() is called after feeding (UI.js does Render.all()).
*/


(function () {
    "use strict";

    // Short aliases to make code easier to read
    const GS = window.GameState;
    const U  = window.Utils;

    // Safety check: If GameState or Utils are missing, log warning.
    if (!GS) {
        console.warn("FeedingSystem: GameState is not defined. Check js/state.js load order.");
    }
    if (!U) {
        console.warn("FeedingSystem: Utils is not defined. Check js/utils.js load order.");
    }

    // =========================================================================
    // CONFIGURATION CONSTANTS
    // =========================================================================
    /*
        FEED_COST_MULTIPLIER:
        ----------------------
        This constant controls how expensive feeding is.

        Feeding cost formula:
            feedCost = animal.income * FEED_COST_MULTIPLIER

        Example:
            income = 2, multiplier = 5 → cost = 10 coins

        You can tweak this value later for balancing.
    */
    const FEED_COST_MULTIPLIER = 5;

    /*
        MAX_HUNGER:
        -----------
        We always cap hunger at 100.
        This is also used by other systems for clamping if needed.
    */
    const MAX_HUNGER = 100;

    // =========================================================================
    // PUBLIC FUNCTION: feedAnimalById
    // =========================================================================
    /*
        Tries to feed the animal with a given ID.

        STEPS:
        ------
        1. Find the animal in GameState.animals.
        2. If not found → log warning → return false.
        3. Calculate feeding cost from animal.income.
        4. If coins < cost → do NOT change anything → return false.
        5. Deduct coins.
        6. Restore hunger to full (100).
        7. Optionally boost happiness a little (if using happiness system later).
        8. Return true.

        PARAM:
        ------
        animalId (string)  : ID of the animal (from animal.id)

        RETURNS:
        --------
        boolean:
            true  → feeding success
            false → failure
    */
    function feedAnimalById(animalId) {
        if (!GS || !Array.isArray(GS.animals)) {
            console.warn("FeedingSystem.feedAnimalById: GameState.animals is missing or invalid.");
            return false;
        }

        // Find the animal with the matching ID
        const animal = GS.animals.find(a => String(a.id) === String(animalId));

        if (!animal) {
            console.warn("FeedingSystem.feedAnimalById: No animal found with id =", animalId);
            return false;
        }

        // Ensure income is a valid number
        const baseIncome = Number(animal.income) || 0;

        // Calculate feeding cost
        const feedCost = baseIncome * FEED_COST_MULTIPLIER;

        // If cost is zero or negative, we still allow feeding (but free)
        if (feedCost > 0 && GS.coins < feedCost) {
            // Not enough coins to feed this animal
            console.warn(
                `FeedingSystem: Not enough coins to feed '${animal.name}'. ` +
                `Needs ${feedCost}, but player has ${GS.coins}.`
            );
            return false;
        }

        // Deduct coins if there is a positive cost
        if (feedCost > 0) {
            GS.coins -= feedCost;
        }

        // Restore hunger to full (clamped to MAX_HUNGER)
        animal.hunger = U ? U.clamp(100, 0, MAX_HUNGER) : 100;

        // Optional: small happiness bonus, capped at 100
        if (typeof animal.happiness === "number") {
            // Increase happiness by +5 (tweakable), but do not exceed 100
            const newHappiness = animal.happiness + 5;
            animal.happiness = U ? U.clamp(newHappiness, 0, 100) : Math.min(newHappiness, 100);
        }

        console.log(
            `FeedingSystem: Fed '${animal.name}' (cost ${feedCost} coins). ` +
            `New hunger = ${animal.hunger}. Coins left = ${GS.coins}.`
        );

        return true;
    }

    // =========================================================================
    // PUBLIC EXPORT
    // =========================================================================
    /*
        We expose FeedingSystem as a global object with one method:
            - feedAnimalById(id)

        UI.js will call this when the user presses the "Feed" button.
    */
    window.FeedingSystem = {
        feedAnimalById
    };
})();
