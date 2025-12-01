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

    // We don't cache these globally because they may be null during module
    // execution in some load orders. Instead, we fetch them inside init().

    // =========================================================================
    // INITIALIZATION
    // =========================================================================
    /*
        All event listeners are registered once by calling UI.init().
        main.js will call UI.init() once DOMContentLoaded is confirmed.
    */
    let _initialized = false;
    function init() {
        if (_initialized) return;
        _initialized = true;
        setupEggShopHandlers();
        setupZooHandlers();
        setupPrestigeHandlers();
        setupGameOverHandlers();
        setupClinicHandlers();
    }

    // =========================================================================
    // EGG SHOP HANDLERS
    // =========================================================================
    /*
        Uses **event delegation** on the egg shop container.

        Instead of attaching a separate listener to each egg button, we:
        - Attach ONE listener to #egg-shop-section
        - Check if the click came from (or inside) an element with data-action="buy-egg"
        - Read data-egg-type attribute
        - Call EconomySystem.buyEgg(typeKey)
    */

    function setupEggShopHandlers() {
        const elEggShop = $("egg-shop-section");
        if (!elEggShop) {
            console.warn("UI: #egg-shop-section element not found. Egg shop clicks won't work.");
            return;
        }

        elEggShop.addEventListener("click", function onEggShopClick(event) {
            const button = event.target.closest("[data-action=\"buy-egg\"]");
            if (!button) return; // Click was not on an egg button

            if (window.GameState?.isGameOver) {
                console.warn("UI: Ignoring egg purchase while game is over.");
                return;
            }

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
            - data-action="feed"            → Feed animal
            - data-action="clean"           → Clean / send to bath
            - data-action="sell"            → Sell animal
            - data-action="send-to-clinic"  → Send sick animal to clinic
            - data-action="assign-habitat"  → Move animal into habitat

        Each button has:
            data-animal-id="<id>"
    */

    function setupZooHandlers() {
        const elZoo = $("zoo-section");
        if (!elZoo) {
            console.warn("UI: #zoo-section element not found. Zoo actions won't work.");
            return;
        }

        elZoo.addEventListener("click", function onZooClick(event) {
            const btn = event.target.closest("[data-action]");
            if (!btn) return; // Click not on a zoo action button

            const animalId = btn.getAttribute("data-animal-id");
            const action = btn.getAttribute("data-action");

            if (window.GameState?.isGameOver) {
                console.warn("UI: Ignoring zoo action while game is over.");
                return;
            }

            if (action === "feed") {
                if (!animalId) return;
                handleFeedAnimal(animalId);
            } else if (action === "clean") {
                if (!animalId) return;
                handleCleanAnimal(animalId);
            } else if (action === "sell") {
                if (!animalId) return;
                handleSellAnimal(animalId);
            } else if (action === "send-to-clinic") {
                if (!animalId) return;
                handleSendToClinic(animalId);
            } else if (action === "cancel-clinic") {
                if (!animalId) return;
                handleCancelClinic(animalId);
            } else if (action === "assign-habitat") {
                if (!animalId) return;
                const habitatKey = btn.getAttribute("data-habitat-key");
                handleAssignHabitat(animalId, habitatKey);
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

    // -------------------------------------------------------------------------
    // SEND TO CLINIC
    // -------------------------------------------------------------------------
    function handleSendToClinic(animalId) {
        if (!window.DiseaseSystem || typeof DiseaseSystem.sendToClinicById !== "function") {
            console.warn("UI: DiseaseSystem.sendToClinicById(id) is not defined.");
            return;
        }

        const success = DiseaseSystem.sendToClinicById(animalId);
        if (success) {
            Render.all();
        }
    }

    // -------------------------------------------------------------------------
    // ASSIGN HABITAT
    // -------------------------------------------------------------------------
    function handleAssignHabitat(animalId, habitatKey) {
        if (!window.HabitatSystem || typeof HabitatSystem.assignToHabitat !== "function") {
            console.warn("UI: HabitatSystem.assignToHabitat(id, key) is not defined.");
            return;
        }
        if (!habitatKey) {
            console.warn("UI: Habitat key missing on habitat button.");
            return;
        }

        const success = HabitatSystem.assignToHabitat(animalId, habitatKey);
        if (success) {
            Render.all();
        }
    }

    // =========================================================================
    // PRESTIGE HANDLERS
    // =========================================================================
    function setupPrestigeHandlers() {
        const elPrestige = $("prestige-section");
        if (!elPrestige) return;

        elPrestige.addEventListener("click", (event) => {
            const btn = event.target.closest("[data-action=\"prestige\"]");
            if (!btn) return;
            if (!window.PrestigeSystem || typeof PrestigeSystem.doPrestige !== "function") {
                console.warn("UI: PrestigeSystem.doPrestige() missing.");
                return;
            }
            const result = PrestigeSystem.doPrestige();
            if (result?.success) {
                Render.all();
            } else if (result?.reason) {
                console.warn("UI: Prestige failed →", result.reason);
            }
        });
    }

    // =========================================================================
    // CLINIC HANDLERS (CANCEL IN QUEUE / STOP TREATMENT)
    // =========================================================================
    function setupClinicHandlers() {
        const elClinic = $("clinic-section");
        if (!elClinic) return;

        elClinic.addEventListener("click", (event) => {
            const btn = event.target.closest("[data-action='cancel-clinic']");
            if (!btn) return;

            const animalId = btn.getAttribute("data-animal-id");
            if (!animalId) return;

            handleCancelClinic(animalId);
        });
    }

    function handleCancelClinic(animalId) {
        if (!window.DiseaseSystem || typeof DiseaseSystem.cancelClinicById !== "function") {
            console.warn("UI: DiseaseSystem.cancelClinicById(id) not defined.");
            return;
        }

        const success = DiseaseSystem.cancelClinicById(animalId);
        if (success) {
            Render.all();
        }
    }

    // =========================================================================
    // GAME OVER / RESTART HANDLER
    // =========================================================================
    function setupGameOverHandlers() {
        const elGameOver = $("game-over-section");
        if (!elGameOver) return;

        elGameOver.addEventListener("click", (event) => {
            const btn = event.target.closest("[data-action=\"restart\"]");
            if (!btn) return;
            if (!window.LoseSystem || typeof LoseSystem.restartGame !== "function") {
                console.warn("UI: LoseSystem.restartGame() missing.");
                return;
            }
            LoseSystem.restartGame();
            if (window.GameMain && typeof window.GameMain.restart === "function") {
                window.GameMain.restart();
            }
            Render.all();
        });
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
        init,
        handleBuyEgg,
        handleFeedAnimal,
        handleCleanAnimal,
        handleSellAnimal,
        handleAssignHabitat,
        handleSendToClinic
    };
})();
