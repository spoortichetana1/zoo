/* 
    =============================================================================
    FANTASY ZOO - LOSE CONDITIONS (js/systems/lose.js)
    =============================================================================
    RESPONSIBILITY:
    ---------------
    Checks the lose conditions described in README and flips GameState.isGameOver
    plus GameState.gameOverReason when any condition is met.

    Lose conditions:
        1) Bankrupt        → coins < 0
        2) No animals/eggs → animals.length === 0 AND eggs.length === 0 AND
                              coins < cheapestEggPrice
        3) All unhappy     → every animal has happiness <= 0

    Exposes:
        LoseSystem.tick()       → run checks each game tick
        LoseSystem.restartGame()→ reset state for a fresh run after Game Over
*/
(function () {
    "use strict";

    const GS = window.GameState;

    if (!GS) {
        console.warn("LoseSystem: GameState missing. Check js/state.js load order.");
    }

    function getCheapestEggPrice() {
        if (!window.EggData) return Infinity;
        return Object.values(window.EggData).reduce((min, egg) => {
            const price = Number(egg.price);
            if (Number.isFinite(price) && price < min) {
                return price;
            }
            return min;
        }, Infinity);
    }

    function checkBankrupt() {
        return typeof GS.coins === "number" && GS.coins < 0;
    }

    function checkNoAnimalsOrEggs() {
        const animalsEmpty = !Array.isArray(GS.animals) || GS.animals.length === 0;
        const eggsEmpty = !Array.isArray(GS.eggs) || GS.eggs.length === 0;
        const cheapestEgg = getCheapestEggPrice();
        const cannotAffordEgg = GS.coins < cheapestEgg;
        return animalsEmpty && eggsEmpty && cannotAffordEgg;
    }

    function checkAllUnhappy() {
        if (!Array.isArray(GS.animals) || GS.animals.length === 0) return false;
        return GS.animals.every((animal) => {
            const happiness = Number(animal.happiness ?? 0);
            return happiness <= 0;
        });
    }

    function setGameOver(reason) {
        if (GS.isGameOver) return;
        GS.isGameOver = true;
        GS.gameOverReason = reason;
        console.warn(`LoseSystem: Game over triggered (${reason}).`);
    }

    function resetHabitats() {
        if (!GS.habitats || typeof GS.habitats !== "object") return;
        Object.values(GS.habitats).forEach((habitat) => {
            if (habitat && Array.isArray(habitat.animalIds)) {
                habitat.animalIds = [];
            }
        });
    }

    function restartGame() {
        const now = Date.now();
        GS.coins = 100;
        GS.incomePerSecond = 0;
        GS.animals = [];
        GS.eggs = [];
        GS.bathQueue = [];
        GS.currentBath = null;
        GS.clinicQueue = [];
        GS.currentPatient = null;
        resetHabitats();
        if (!GS.events || typeof GS.events !== "object") {
            GS.events = { activeEvents: [], history: [], lastEventTime: 0 };
        } else {
            GS.events.activeEvents = [];
            GS.events.history = [];
            GS.events.lastEventTime = 0;
        }
        if (GS.modifiers && typeof GS.modifiers === "object") {
            GS.modifiers.incomeBoostMultiplier = 1;
        }
        GS.isGameOver = false;
        GS.gameOverReason = null;
        GS.lastTick = now;
        GS.runStartTime = now;
    }

    function tick() {
        if (!GS || GS.isGameOver) return;

        if (checkBankrupt()) {
            setGameOver("bankrupt");
            return;
        }

        if (checkNoAnimalsOrEggs()) {
            setGameOver("no_animals");
            return;
        }

        if (checkAllUnhappy()) {
            setGameOver("all_unhappy");
        }
    }

    window.LoseSystem = {
        tick,
        restartGame
    };
})();
