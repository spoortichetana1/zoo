/* 
    =============================================================================
    FANTASY ZOO - ECONOMY SYSTEM (js/systems/economy.js)
    =============================================================================
    RESPONSIBILITY:
    ---------------
    This system handles ALL money and income logic:

      1. Every game tick:
         - Calculates total income per second from all eligible animals.
         - Adds that income to the player's coin balance.
         - Updates GameState.incomePerSecond (for UI display).

      2. Buying eggs:
         - Checks if the player has enough coins.
         - Deducts the egg price.
         - Adds a new egg instance into GameState.eggs.

      3. Selling animals:
         - Converts an animal into coins (based on its income).
         - Removes the animal from GameState.animals.
         - Cleans up any bath references.

    WHAT THIS FILE DOES NOT DO:
    ---------------------------
    - It does NOT render UI (render.js handles that).
    - It does NOT attach button listeners (ui.js handles that).
    - It does NOT decide feeding/cleaning rules.
    - It does NOT manage timers for eggs (hatching.js) or baths (cleaning.js).

    OTHER FILES THAT CALL THIS:
    ---------------------------
    - main.js → EconomySystem.tick()
    - ui.js   → EconomySystem.buyEgg(typeKey)
             → EconomySystem.sellAnimalById(animalId)

    DEBUGGING ECONOMY PROBLEMS:
    ---------------------------
    - If coins never increase:
        ✔ Check that main.js is calling EconomySystem.tick() every second.
        ✔ Check GameState.animals has animals with income > 0.
        ✔ Check hunger > 0, cleanliness > 0 (animals must not be starving/filthy).

    - If buying eggs doesn't work:
        ✔ Confirm EggData[typeKey] exists in js/eggs.js.
        ✔ Check GameState.coins is enough.
        ✔ Check ui.js calls EconomySystem.buyEgg(typeKey) correctly.

    - If selling doesn't work:
        ✔ Confirm the animal ID is correct (from Render.zoo).
        ✔ Check EconomySystem.sellAnimalById is defined and global.
*/


(function () {
    "use strict";

    // Short aliases for cleaner code
    const GS = window.GameState;
    const U  = window.Utils;

    if (!GS) {
        console.warn("EconomySystem: GameState is not defined. Check js/state.js load order.");
    }
    if (!U) {
        console.warn("EconomySystem: Utils is not defined. Check js/utils.js load order.");
    }
    if (!window.EggData) {
        console.warn("EconomySystem: EggData is not defined. Check js/eggs.js load order.");
    }

    // =========================================================================
    // CONFIGURATION CONSTANTS
    // =========================================================================

    /*
        SELL_MULTIPLIER:
        ----------------
        Determines how many coins you get when selling an animal, based on
        the animal's income.

        Formula:
            sellValue = animal.income * SELL_MULTIPLIER

        Example:
            animal.income = 3, SELL_MULTIPLIER = 15
            → sellValue = 45 coins

        You can tweak this number to make selling more or less rewarding.
    */
    const SELL_MULTIPLIER = 15;

    // =========================================================================
    // TICK: CALCULATE INCOME AND UPDATE COINS
    // =========================================================================
    /*
        Called once per game tick (e.g., once per second) from main.js.

        STEPS:
        ------
        1. Loop through all animals in GameState.animals.
        2. For each animal:
             - It only earns coins if:
                 * income > 0
                 * hunger > 0
                 * cleanliness > 0
                 * (optionally) not sick (future)
             - Add its income to a running total.
        3. After the loop:
             - Add total income to GameState.coins.
             - Set GameState.incomePerSecond = total income.
    */
    function tick() {
        if (!GS || !Array.isArray(GS.animals)) {
            // If animals list is not ready yet, just skip this tick.
            return;
        }

        let totalIncomePerSecond = 0;

        // Sum up income from all eligible animals
        for (let i = 0; i < GS.animals.length; i++) {
            const animal = GS.animals[i];

            // Defensive checks and defaults
            const income      = Number(animal.income) || 0;
            const hunger      = Number(animal.hunger ?? 0);
            const cleanliness = Number(animal.cleanliness ?? 0);

            // Optionally support future disease system:
            // - If healthStatus === "sick", no income.
            const isSick = (animal.healthStatus === "sick");

            // Animal can earn only if:
            // - it has positive income
            // - hunger > 0
            // - cleanliness > 0
            // - not sick
            const canEarn =
                income > 0 &&
                hunger > 0 &&
                cleanliness > 0 &&
                !isSick;

            if (canEarn) {
                totalIncomePerSecond += income;
            }
        }

        // Add the income to the player's coins.
        // We assume this tick runs once per second, so we add income as-is.
        GS.coins += totalIncomePerSecond;

        // Update display value for UI.
        GS.incomePerSecond = totalIncomePerSecond;
    }

    // =========================================================================
    // BUY EGG: EconomySystem.buyEgg(typeKey)
    // =========================================================================
    /*
        Buys an egg of the given type and adds it to GameState.eggs.

        Called from:
            ui.js → handleBuyEgg(typeKey)

        PARAM:
        ------
        typeKey (string) : key in EggData, e.g. "common", "rare", "mystic"

        STEPS:
        ------
        1. Validate: EggData[typeKey] exists.
        2. Read egg price and hatchTime.
        3. Check if GS.coins >= price.
        4. Deduct price from coins.
        5. Create a new egg instance:
               {
                   id: "egg-...",
                   type: eggDef.type OR typeKey,
                   start: timestamp (now),
                   hatchTime: eggDef.hatchTime
               }
        6. Push it into GameState.eggs.
        7. Return true on success, false on failure.
    */
    function buyEgg(typeKey) {
        if (!GS) {
            console.warn("EconomySystem.buyEgg: GameState is missing.");
            return false;
        }

        const eggDef = window.EggData ? window.EggData[typeKey] : null;

        if (!eggDef) {
            console.warn(
                `EconomySystem.buyEgg: No egg definition found for type '${typeKey}'. ` +
                "Check js/eggs.js."
            );
            return false;
        }

        const price = Number(eggDef.price) || 0;

        if (GS.coins < price) {
            console.warn(
                `EconomySystem.buyEgg: Not enough coins to buy '${eggDef.name}'. ` +
                `Needs ${price}, has ${GS.coins}.`
            );
            return false;
        }

        // Deduct coin cost
        GS.coins -= price;

        // Ensure eggs array exists
        if (!Array.isArray(GS.eggs)) {
            GS.eggs = [];
        }

        // Create a new egg instance for the incubator
        const eggInstance = {
            id: U ? U.id("egg") : `egg-${Date.now()}`,
            type: eggDef.type || typeKey, // use explicit type if defined on eggDef
            start: U ? U.now() : Date.now(),
            hatchTime: Number(eggDef.hatchTime) || 0
        };

        GS.eggs.push(eggInstance);

        console.log(
            `EconomySystem: Bought ${eggDef.name} for ${price} coins. ` +
            `New balance: ${GS.coins}.`
        );

        return true;
    }

    // =========================================================================
    // SELL ANIMAL: EconomySystem.sellAnimalById(animalId)
    // =========================================================================
    /*
        Sells an animal and converts it into coins.

        Called from:
            ui.js → handleSellAnimal(animalId)

        PARAM:
        ------
        animalId (string | number)

        STEPS:
        ------
        1. Find the animal in GameState.animals.
        2. If not found, return false.
        3. Calculate sell value:
               sellValue = animal.income * SELL_MULTIPLIER
        4. Add sellValue to GS.coins.
        5. Remove the animal from the animals array.
        6. Remove animal ID from bathQueue and clear currentBath if needed.
        7. Return true.

        Returns:
        --------
        boolean:
            true  → sold successfully
            false → failure (animal missing, etc.)
    */
    function sellAnimalById(animalId) {
        if (!GS || !Array.isArray(GS.animals)) {
            console.warn("EconomySystem.sellAnimalById: GameState.animals is missing or invalid.");
            return false;
        }

        const idStr = String(animalId);

        // Find animal index
        const index = GS.animals.findIndex(a => String(a.id) === idStr);
        if (index === -1) {
            console.warn("EconomySystem.sellAnimalById: No animal found with id =", animalId);
            return false;
        }

        const animal = GS.animals[index];

        // Calculate sell value based on income
        const income = Number(animal.income) || 0;
        const sellValue = income * SELL_MULTIPLIER;

        // Add coins from selling the animal
        GS.coins += sellValue;

        // Remove the animal from the zoo
        GS.animals.splice(index, 1);

        // Clean up bathQueue: remove any occurrences of this ID
        if (Array.isArray(GS.bathQueue)) {
            GS.bathQueue = GS.bathQueue.filter(id => String(id) !== idStr);
        }

        // If the animal is currently in the bath, clear currentBath
        if (GS.currentBath && String(GS.currentBath.id) === idStr) {
            GS.currentBath = null;
        }

        console.log(
            `EconomySystem: Sold '${animal.name}' for ${sellValue} coins. ` +
            `New balance: ${GS.coins}.`
        );

        return true;
    }

    // =========================================================================
    // PUBLIC EXPORT
    // =========================================================================
    /*
        Expose EconomySystem as a global object so other files can use it:

            EconomySystem.tick()
            EconomySystem.buyEgg(typeKey)
            EconomySystem.sellAnimalById(animalId)
    */
    window.EconomySystem = {
        tick,
        buyEgg,
        sellAnimalById
    };
})();
