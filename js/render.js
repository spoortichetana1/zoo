/* 
    ============================================================================
    FANTASY ZOO - RENDERING LAYER (js/render.js)
    ============================================================================
    This file is responsible ONLY for updating the DOM (HTML on the page)
    based on the current GameState.

    VERY IMPORTANT DESIGN RULE:
    ---------------------------
    - This file MUST NOT contain game logic (no feeding, cleaning, coins math).
    - It should ONLY:
        * Read from GameState, EggData, etc.
        * Create/remove/update DOM elements.
    - All button click behavior is handled in js/ui.js.

    If the game "logic" is correct but:
        ✔ cards don't update
        ✔ bars don't move
        ✔ lists don't refresh
    → the bug is very likely in this file.

    The main entry point is Render.all(), which should be called every tick
    (e.g., once per second) from js/main.js.
*/


// Wrap everything in an IIFE and attach a single global object "Render"
(function () {
    "use strict";

    // =========================================================================
    // HELPER: SAFELY GET DOM ELEMENT BY ID
    // =========================================================================
    function $(id) {
        return document.getElementById(id);
    }

    // Cache references to frequently used DOM elements.
    // If any of these are null, check index.html for missing IDs.
    const elCoinCount   = $("coin-count");
    const elIncomeRate  = $("income-rate");
    const elEggShop     = $("egg-shop");
    const elIncubator   = $("incubator");
    const elZoo         = $("zoo");
    const elBathQueue   = $("bath-queue");
    const elLeaderboard = $("leaderboard");
    const elFooterYear  = $("footer-year");

    // Set footer year once (optional, not required for the game).
    if (elFooterYear) {
        elFooterYear.textContent = new Date().getFullYear().toString();
    }

    // =========================================================================
    // RENDER: TOP STATS (COINS + INCOME)
    // =========================================================================
    function renderTopStats() {
        // If these elements don't exist, silently stop instead of crashing.
        if (elCoinCount) {
            elCoinCount.textContent = GameState.coins.toString();
        }

        if (elIncomeRate) {
            elIncomeRate.textContent = GameState.incomePerSecond.toString();
        }
    }

    // =========================================================================
    // RENDER: EGG SHOP
    // =========================================================================
    /*
        The egg shop shows one button per egg type (Common / Rare / Mystic).
        Button DOM is created here, but click behavior is handled in js/ui.js.

        Each button gets:
            class="egg-button"
            data-egg-type="<typeKey>"   (e.g. "common", "rare", "mystic")
    */
    function renderEggShop() {
        if (!elEggShop) return;

        // Clear any previous contents to avoid duplicate buttons.
        elEggShop.innerHTML = "";

        // EggData should be a global object defined in js/eggs.js
        const eggKeys = Object.keys(window.EggData || {});
        if (eggKeys.length === 0) {
            elEggShop.textContent = "No egg types defined. Check EggData in js/eggs.js.";
            return;
        }

        eggKeys.forEach((typeKey) => {
            const eggDef = EggData[typeKey];

            // Create <button> for each egg type
            const btn = document.createElement("button");
            btn.className = "egg-button";
            // Data attribute used later in UI.js to know which egg was clicked
            btn.setAttribute("data-egg-type", typeKey);

            // Inner HTML: icon, name, price, and short description
            btn.innerHTML = `
                <div style="font-size:1.6rem; margin-bottom:4px;">${eggDef.icon}</div>
                <div style="font-weight:600;">${eggDef.name}</div>
                <div style="font-size:0.85rem; margin-top:2px;">Cost: ${eggDef.price} 💰</div>
                <div style="font-size:0.7rem; margin-top:2px; color:#555;">${eggDef.description}</div>
            `;

            elEggShop.appendChild(btn);
        });
    }

    // =========================================================================
    // RENDER: INCUBATOR (EGGS WITH TIMERS)
    // =========================================================================
    /*
        Shows all eggs currently incubating.

        For each egg in GameState.eggs, we show:
            - Egg icon
            - Name
            - Time remaining (formatted)
            - Progress bar (0–100%)
    */
    function renderIncubator() {
        if (!elIncubator) return;

        // Clear previous egg cards.
        elIncubator.innerHTML = "";

        // If no eggs, show a friendly message instead of an empty area.
        if (!GameState.eggs || GameState.eggs.length === 0) {
            const emptyMessage = document.createElement("p");
            emptyMessage.textContent = "No eggs incubating. Buy an egg to start hatching!";
            elIncubator.appendChild(emptyMessage);
            return;
        }

        const now = Utils.now();

        GameState.eggs.forEach((egg) => {
            const eggDef = EggData[egg.type];

            // If eggDef is missing, it usually means the type string is wrong.
            if (!eggDef) {
                console.warn("Unknown egg type in GameState.eggs:", egg.type);
                return;
            }

            // Calculate time passed and time remaining
            const elapsed = now - egg.start;
            const remaining = Math.max(0, egg.hatchTime - elapsed);

            // Calculate progress percentage: 0 to 100
            const progress = Utils.clamp(
                Utils.percent(elapsed, egg.hatchTime),
                0,
                100
            );

            // Create card for this egg
            const card = document.createElement("div");
            card.className = "card";

            card.innerHTML = `
                <div class="icon">${eggDef.icon}</div>
                <div><strong>${eggDef.name}</strong></div>
                <div style="margin-top:4px; font-size:0.8rem;">
                    Hatching in: ${Utils.formatTime(remaining)}
                </div>
                <div class="progress-bar">
                    <div class="progress-inner" style="width:${progress}%;"></div>
                </div>
            `;

            elIncubator.appendChild(card);
        });
    }

    // =========================================================================
    // RENDER: ZOO (ANIMAL CARDS)
    // =========================================================================
    /*
        For each animal in GameState.animals, we show:
            - Emoji
            - Name + rarity tag
            - Income per second (with "stopped" if not earning)
            - Hunger bar + label
            - Cleanliness bar + label
            - Action buttons:
                * Feed (class="card-button feed")
                * Clean (class="card-button clean")
                * Sell (class="card-button sell")
            Each button also has data-animal-id="<id>" for UI.js.

        IMPORTANT:
        ----------
        This function does not attach event listeners; UI.js is responsible
        for listening to clicks on these buttons.
    */
    function renderZoo() {
        if (!elZoo) return;

        elZoo.innerHTML = "";

        if (!GameState.animals || GameState.animals.length === 0) {
            const emptyMessage = document.createElement("p");
            emptyMessage.textContent = "Your zoo is empty. Hatch some eggs to get new animals!";
            elZoo.appendChild(emptyMessage);
            return;
        }

        GameState.animals.forEach((animal) => {
            // Convert hunger/cleanliness (0–100) to percentages (0–100)
            const hungerPercent = Utils.clamp(animal.hunger || 0, 0, 100);
            const cleanPercent  = Utils.clamp(animal.cleanliness || 0, 0, 100);

            const isStarving = hungerPercent <= 0;
            const isDirty    = cleanPercent <= 20;

            // TODO: when happiness/disease systems are added, add checks here.

            // Condition for whether the animal currently earns income
            const canEarn = !isStarving && cleanPercent > 0;

            // Text for hunger label
            let hungerLabelText;
            if (isStarving) {
                hungerLabelText = "Hungry! (no coins)";
            } else {
                hungerLabelText = `Hunger: ${hungerPercent}%`;
            }

            // Text for cleanliness label
            let cleanLabelText;
            if (cleanPercent <= 0) {
                cleanLabelText = "Filthy! (no coins)";
            } else if (isDirty) {
                cleanLabelText = "Dirty! Needs a bath 🛁";
            } else {
                cleanLabelText = `Cleanliness: ${cleanPercent}%`;
            }

            // Income text
            const incomeText = canEarn
                ? `💰 ${animal.income} coins/sec`
                : `💰 ${animal.income} coins/sec (stopped)`;

            // Create the animal card
            const card = document.createElement("div");
            card.className = "card";

            // Use template literal to build the inner HTML
            card.innerHTML = `
                <div class="icon">${animal.emoji}</div>
                <div><strong>${animal.name}</strong></div>
                <div class="tag">${animal.rarity || "Unknown"}</div>

                <div class="income-text">${incomeText}</div>

                <!-- HUNGER BAR -->
                <div class="hunger-label">${hungerLabelText}</div>
                <div class="progress-bar hunger-bar">
                    <div class="progress-inner" style="width:${hungerPercent}%;"></div>
                </div>

                <!-- CLEANLINESS BAR -->
                <div class="clean-label">${cleanLabelText}</div>
                <div class="progress-bar clean-bar">
                    <div class="progress-inner" style="width:${cleanPercent}%;"></div>
                </div>

                <!-- ACTION BUTTONS -->
                <div class="button-row">
                    <button 
                        class="card-button feed"
                        data-animal-id="${animal.id}"
                    >
                        🍎 Feed
                    </button>
                    <button 
                        class="card-button clean"
                        data-animal-id="${animal.id}"
                    >
                        🛁 Clean
                    </button>
                    <button 
                        class="card-button sell"
                        data-animal-id="${animal.id}"
                    >
                        💸 Sell
                    </button>
                </div>
            `;

            elZoo.appendChild(card);
        });
    }

    // =========================================================================
    // RENDER: BATH HOUSE (QUEUE + CURRENT BATH)
    // =========================================================================
    /*
        Shows:
            - Current pet in bath (with progress bar), if any.
            - Pets waiting in queue in the order they will be cleaned.

        Data sources:
            - GameState.currentBath → { id, start, ... } OR null
            - GameState.bathQueue → [animalId1, animalId2, ...]
    */
    function renderBathHouse() {
        if (!elBathQueue) return;

        elBathQueue.innerHTML = "";

        const idsToShow = [];

        // First, the animal currently in the bath (if any)
        if (GameState.currentBath && typeof GameState.currentBath.id !== "undefined") {
            idsToShow.push(GameState.currentBath.id);
        }

        // Then all IDs in the waiting queue
        if (Array.isArray(GameState.bathQueue)) {
            idsToShow.push(...GameState.bathQueue);
        }

        // If nothing at all is in bath or queue
        if (idsToShow.length === 0) {
            const msg = document.createElement("p");
            msg.innerHTML = `No pets in the bath house.<br>Send a dirty pet to the bath from the zoo.`;
            elBathQueue.appendChild(msg);
            return;
        }

        const now = Utils.now();

        idsToShow.forEach((animalId, index) => {
            const animal = GameState.animals.find((a) => a.id === animalId);
            if (!animal) {
                console.warn("Bath house references missing animal ID:", animalId);
                return;
            }

            // Determine if this is the one actually in the bath
            const isCurrent =
                GameState.currentBath &&
                GameState.currentBath.id === animalId &&
                index === 0; // Should be the first in list

            let statusText = "";
            let progressPercent = 0;

            if (isCurrent) {
                statusText = "Getting cleaned ✨";

                // If bathTime is not known here, the CleaningSystem will need to
                // expose a constant. For now, we assume it sets durationMs on currentBath.
                const durationMs = GameState.currentBath.durationMs || 1; // Avoid division by 0
                const elapsed = now - GameState.currentBath.start;
                progressPercent = Utils.clamp(
                    Utils.percent(elapsed, durationMs),
                    0,
                    100
                );
            } else {
                // Waiting in queue
                statusText = `Waiting #${index + 1}`;
            }

            const card = document.createElement("div");
            card.className = "card";

            card.innerHTML = `
                <div class="icon">${animal.emoji}</div>
                <div><strong>${animal.name}</strong></div>
                <div class="tag">${animal.rarity || "Unknown"}</div>
                <div style="margin-top:4px; font-size:0.8rem;">${statusText}</div>
                ${
                    isCurrent
                        ? `
                            <div class="progress-bar clean-bar" style="margin-top:6px;">
                                <div class="progress-inner" style="width:${progressPercent}%;"></div>
                            </div>
                        `
                        : ""
                }
            `;

            elBathQueue.appendChild(card);
        });
    }

    // =========================================================================
    // RENDER: LEADERBOARD
    // =========================================================================
    /*
        Displays GameState.leaderboard as a simple list of runs.

        Each entry displays:
            - Rank
            - Max coins
            - Pets hatched
            - Highest rarity
            - Prestiges
            - Time played (if available)
    */
    function renderLeaderboard() {
        if (!elLeaderboard) return;

        elLeaderboard.innerHTML = "";

        // Prefer Leaderboard.getRankedRuns() when available so runs are sorted
        // and normalized consistently. Fall back to GameState.leaderboard.
        let runs = [];
        if (window.Leaderboard && typeof Leaderboard.getRankedRuns === "function") {
            runs = Leaderboard.getRankedRuns();
        } else if (Array.isArray(GameState.leaderboard)) {
            runs = GameState.leaderboard;
        }

        if (runs.length === 0) {
            const msg = document.createElement("p");
            msg.textContent =
                "No leaderboard data yet. Play the game and finish a run to record a score.";
            elLeaderboard.appendChild(msg);
            return;
        }

        // Create a simple list of cards for each leaderboard entry
        runs.forEach((run, index) => {
            const card = document.createElement("div");
            card.className = "card";

            // Use normalized fields where available
            const maxCoins      = run.maxCoins ?? run.coins ?? 0;
            const petsHatched   = run.petsHatched ?? 0;
            const highestRarity = run.highestRarity ?? "Unknown";
            const prestiges     = run.prestigesAfter ?? run.prestigesBefore ?? run.prestiges ?? 0;
            const timePlayedMs  = run.timePlayed ?? 0;

            // Convert ms to seconds/minutes text for readability
            const timeText = Utils.formatTime(timePlayedMs);

            card.innerHTML = `
                <div style="font-weight:700; margin-bottom:4px;">
                    #${index + 1} – Best Zoo
                </div>
                <div style="font-size:0.85rem;">
                    Max Coins: <strong>${maxCoins}</strong><br>
                    Pets Hatched: <strong>${petsHatched}</strong><br>
                    Highest Rarity: <strong>${highestRarity}</strong><br>
                    Prestiges: <strong>${prestiges}</strong><br>
                    Time Played: <strong>${timeText}</strong>
                </div>
            `;

            elLeaderboard.appendChild(card);
        });
    }

    // =========================================================================
    // MAIN RENDER ENTRY POINT
    // =========================================================================
    /*
        Call Render.all() whenever:
            - The game ticks (once per second from main.js)
            - The state changes significantly (like buying eggs / hatching)

        It will:
            - Update top stats
            - Redraw egg shop (in case prices or egg types change later)
            - Redraw incubator
            - Redraw zoo
            - Redraw bath house
            - Redraw leaderboard
    */
    function renderAll() {
        renderTopStats();
        renderEggShop();
        renderIncubator();
        renderZoo();
        renderBathHouse();
        renderLeaderboard();
    }

    // Expose functions on a single global object
    window.Render = {
        topStats: renderTopStats,
        eggShop: renderEggShop,
        incubator: renderIncubator,
        zoo: renderZoo,
        bathHouse: renderBathHouse,
        leaderboard: renderLeaderboard,
        all: renderAll
    };
})();
