/* 
    =============================================================================
    FANTASY ZOO - UI WIRING (js/ui.js)
    =============================================================================
    This file connects **user actions** (clicks) to the **game systems**.

    WHAT THIS FILE DOES:
    --------------------
    - Listens for clicks on:
        * Egg shop buttons          → buy egg
        * Zoo animal buttons        → feed / clean / sell
    - Calls the correct system methods:
        * EconomySystem.buyEgg(typeKey)
        * FeedingSystem.feedAnimalById(animalId)
        * CleaningSystem.sendToBathById(animalId)
        * EconomySystem.sellAnimalById(animalId)
    - Triggers a re-render after actions so the UI updates immediately.

    WHAT THIS FILE DOES **NOT** DO:
    --------------------------------
    - It does NOT contain actual game rules (no coin math, no hunger math).
    - It does NOT modify GameState directly (systems should do that).
    - It does NOT handle timers (that’s in main.js and systems).

    DEBUGGING UI PROBLEMS:
    ----------------------
    - If clicking buttons does nothing:
        ✔ Check if js/ui.js is included after render.js and systems in index.html.
        ✔ Open DevTools → Console and check for errors (especially "undefined").
        ✔ Make sure the DOM elements have correct IDs and classes from render.js.
        ✔ Check if the system methods exist (e.g., EconomySystem.buyEgg).
*/


(function () {
    "use strict";

    // =========================================================================
    // HELPER: SAFE DOM GETTER
    // =========================================================================
    function $(id) {
        return document.getElementById(id);
    }

    // Cache main interactive containers
    const elEggShop = $("egg-shop");
    const elZoo     = $("zoo");

    // =========================================================================
    // INITIALIZATION
    // =========================================================================
    /*
        All event listeners are registered once DOM is ready.

        NOTE:
        - index.html loads this script at the bottom of <body>, so DOM should
          already be ready, but using DOMContentLoaded is an extra safety.
    */
    document.addEventListener("DOMContentLoaded", function initUI() {
        setupEggShopHandlers();
        setupZooHandlers();
    });

    // =========================================================================
    // EGG SHOP HANDLERS
    // =========================================================================
    /*
        Uses **event delegation** on the egg shop container.

        Instead of attaching a separate listener to each egg button, we:
        - Attach ONE listener to #egg-shop
        - Check if the click came from (or inside) an element with .egg-button
        - Read data-egg-type attribute
        - Call EconomySystem.buyEgg(typeKey)
    */

    function setupEggShopHandlers() {
        if (!elEggShop) {
            console.warn("UI: #egg-shop element not found. Egg shop clicks won't work.");
            return;
        }

        elEggShop.addEventListener("click", function onEggShopClick(event) {
            // Find the closest ancestor with class .egg-button (could be the button itself)
            const button = event.target.closest(".egg-button");
            if (!button) return; // Click was not on an egg button

            const typeKey = button.getAttribute("data-egg-type");
            if (!typeKey) {
                console.warn("UI: Egg button clicked without data-egg-type attribute.");
                return;
            }

            handleBuyEgg(typeKey);
        });
    }

    /*
        Handler: buy an egg of a certain type.

        This function DOES NOT implement buying logic itself.
        Instead, it delegates to EconomySystem.buyEgg.

        If the system is missing, we log a warning instead of crashing.
    */
    function handleBuyEgg(typeKey) {
        if (!window.EconomySystem || typeof EconomySystem.buyEgg !== "function") {
            console.warn(
                "UI: EconomySystem.buyEgg(typeKey) is not defined yet. " +
                "Make sure js/systems/economy.js implements it."
            );
            return;
        }

        // Call into the game logic
        const success = EconomySystem.buyEgg(typeKey);

        // Optionally, you can use the return value (true/false) later if needed.
        // For now, we just re-render UI to show updated coins/eggs.
        if (success) {
            Render.all();
        }
    }

    // =========================================================================
    // ZOO HANDLERS (FEED / CLEAN / SELL)
    // =========================================================================
    /*
        Uses event delegation on the #zoo container.

        We listen for clicks on:
            - .card-button.feed   → Feed animal
            - .card-button.clean  → Clean / send to bath
            - .card-button.sell   → Sell animal

        Each button has:
            data-animal-id="<id>"
    */

    function setupZooHandlers() {
        if (!elZoo) {
            console.warn("UI: #zoo element not found. Zoo actions won't work.");
            return;
        }

        elZoo.addEventListener("click", function onZooClick(event) {
            // Find the closest element with .card-button (could be the button or its child)
            const btn = event.target.closest(".card-button");
            if (!btn) return; // Click not on a zoo action button

            const animalId = btn.getAttribute("data-animal-id");
            if (!animalId) {
                console.warn("UI: Card button missing data-animal-id attribute.");
                return;
            }

            // Determine the type of action based on button classes
            if (btn.classList.contains("feed")) {
                handleFeedAnimal(animalId);
            } else if (btn.classList.contains("clean")) {
                handleCleanAnimal(animalId);
            } else if (btn.classList.contains("sell")) {
                handleSellAnimal(animalId);
            }
        });
    }

    // -------------------------------------------------------------------------
    // FEED ANIMAL
    // -------------------------------------------------------------------------
    /*
        Delegates feeding to FeedingSystem.feedAnimalById.

        The FeedingSystem should:
            - Find the animal in GameState.animals
            - Calculate feeding cost
            - Deduct coins if possible
            - Restore hunger
            - Return true (success) or false (failed due to coins or missing animal)
    */
    function handleFeedAnimal(animalId) {
        if (!window.FeedingSystem || typeof FeedingSystem.feedAnimalById !== "function") {
            console.warn(
                "UI: FeedingSystem.feedAnimalById(id) is not defined. " +
                "Make sure js/systems/feeding.js implements it."
            );
            return;
        }

        const success = FeedingSystem.feedAnimalById(animalId);

        // Re-render regardless; systems can decide if state changed or not
        if (success) {
            Render.all();
        }
    }

    // -------------------------------------------------------------------------
    // CLEAN ANIMAL / SEND TO BATH
    // -------------------------------------------------------------------------
    /*
        Delegates cleaning to CleaningSystem.sendToBathById.

        The CleaningSystem should:
            - Check if animal exists
            - Check if already in bath/queue
            - Check cost
            - Deduct coins and add animal ID to GameState.bathQueue
            - Return true / false
    */
    function handleCleanAnimal(animalId) {
        if (!window.CleaningSystem || typeof CleaningSystem.sendToBathById !== "function") {
            console.warn(
                "UI: CleaningSystem.sendToBathById(id) is not defined. " +
                "Make sure js/systems/cleaning.js implements it."
            );
            return;
        }

        const success = CleaningSystem.sendToBathById(animalId);

        if (success) {
            Render.all();
        }
    }

    // -------------------------------------------------------------------------
    // SELL ANIMAL
    // -------------------------------------------------------------------------
    /*
        Delegates selling to EconomySystem.sellAnimalById.

        The EconomySystem should:
            - Find the animal in GameState.animals
            - Calculate sell price
            - Add coins
            - Remove the animal from GameState.animals
            - Return true / false
    */
    function handleSellAnimal(animalId) {
        if (!window.EconomySystem || typeof EconomySystem.sellAnimalById !== "function") {
            console.warn(
                "UI: EconomySystem.sellAnimalById(id) is not defined. " +
                "Make sure js/systems/economy.js implements it."
            );
            return;
        }

        const success = EconomySystem.sellAnimalById(animalId);

        if (success) {
            Render.all();
        }
    }

    // =========================================================================
    // EXPORT (if needed)
    // =========================================================================
    /*
        If you ever want to call UI handlers manually from the console or other
        scripts (e.g., for debugging or tutorials), you can expose them here.

        Right now, it's not strictly necessary, but we provide it for flexibility.
    */
    window.UI = {
        handleBuyEgg,
        handleFeedAnimal,
        handleCleanAnimal,
        handleSellAnimal
    };
})();
