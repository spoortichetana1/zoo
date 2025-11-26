// Fantasy Zoo Game logic
// Animals generate coins every second, must be fed and cleaned (both cost coins), and can be sold.
// Bath House cleans pets one by one, in order, with a visible queue.

document.addEventListener("DOMContentLoaded", () => {
    // === GAME STATE ===

    // Starting coins
    let coins = 100;

    // Hunger & cleanliness settings
    const HUNGER_DECAY_PER_TICK = 1;   // per second
    const CLEAN_DECAY_PER_TICK = 0.7;  // per second
    const MAX_HUNGER = 100;
    const MAX_CLEAN = 100;

    // Bath house settings
    const BATH_DURATION_MS = 5000; // 5 seconds for one full bath
    let bathQueue = [];            // [animalId, ...] waiting in line
    let currentBath = null;        // { animalId, startTime, durationMs }

    // Egg types and possible animals for each type
    const eggTypes = {
        common: {
            name: "Common Egg",
            price: 20,
            hatchTime: 8000,
            icon: "🥚",
            animals: [
                { name: "Cloudy Chick", emoji: "🐤", rarity: "Common", income: 1 },
                { name: "Leafy Bun", emoji: "🐰", rarity: "Common", income: 1 },
                { name: "Pebble Turtle", emoji: "🐢", rarity: "Common", income: 1 },
                { name: "Stripe Pup", emoji: "🐶", rarity: "Uncommon", income: 2 },
                { name: "Berry Mouse", emoji: "🐭", rarity: "Uncommon", income: 2 },
                { name: "Sunspot Calf", emoji: "🐮", rarity: "Uncommon", income: 2 },
                { name: "Meadow Lamb", emoji: "🐑", rarity: "Common", income: 1 },
                { name: "Puddle Duck", emoji: "🦆", rarity: "Common", income: 1 },
                { name: "Pumpkin Pig", emoji: "🐷", rarity: "Common", income: 1 },
                { name: "Garden Hedgehog", emoji: "🦔", rarity: "Common", income: 1 },
                { name: "Acorn Squirrel", emoji: "🐿️", rarity: "Uncommon", income: 2 },
                { name: "River Otter", emoji: "🦦", rarity: "Uncommon", income: 2 },
                { name: "Meadow Fawn", emoji: "🦌", rarity: "Uncommon", income: 2 },
                { name: "Coco Panda", emoji: "🐼", rarity: "Uncommon", income: 2 },
                { name: "Petal Kitty", emoji: "🐱", rarity: "Uncommon", income: 2 },
                { name: "Sprout Chick", emoji: "🐣", rarity: "Uncommon", income: 2 }
            ]
        },
        rare: {
            name: "Rare Egg",
            price: 40,
            hatchTime: 12000,
            icon: "🐣",
            animals: [
                { name: "Spark Fox", emoji: "🦊", rarity: "Rare", income: 3 },
                { name: "Crystal Cat", emoji: "🐱", rarity: "Rare", income: 3 },
                { name: "Stormy Owl", emoji: "🦉", rarity: "Rare", income: 3 },
                { name: "Glacier Wolf", emoji: "🐺", rarity: "Epic", income: 5 },
                { name: "Ember Crow", emoji: "🐦", rarity: "Epic", income: 5 },
                { name: "Thunder Serpent", emoji: "🐍", rarity: "Epic", income: 5 },
                { name: "Frost Lynx", emoji: "🐈‍⬛", rarity: "Rare", income: 3 },
                { name: "Coral Dolphin", emoji: "🐬", rarity: "Rare", income: 3 },
                { name: "Shadow Raven", emoji: "🐦", rarity: "Rare", income: 3 },
                { name: "Lava Lizard", emoji: "🦎", rarity: "Rare", income: 3 },
                { name: "Aurora Penguin", emoji: "🐧", rarity: "Rare", income: 3 },
                { name: "Storm Seahorse", emoji: "🐴", rarity: "Rare", income: 3 },
                { name: "Bronze Griffin", emoji: "🦅", rarity: "Epic", income: 5 },
                { name: "Mist Stag", emoji: "🦌", rarity: "Epic", income: 5 },
                { name: "Prism Chameleon", emoji: "🦎", rarity: "Epic", income: 5 },
                { name: "Thunder Rhino", emoji: "🦏", rarity: "Epic", income: 5 }
            ]
        },
        mystic: {
            name: "Mystic Egg",
            price: 80,
            hatchTime: 16000,
            icon: "🐉",
            animals: [
                { name: "Nebula Dragon", emoji: "🐲", rarity: "Epic", income: 5 },
                { name: "Galaxy Unicorn", emoji: "🦄", rarity: "Epic", income: 5 },
                { name: "Phantom Phoenix", emoji: "🐦‍🔥", rarity: "Epic", income: 5 },
                { name: "Void Tiger", emoji: "🐯", rarity: "Legendary", income: 8 },
                { name: "Aurora Lion", emoji: "🦁", rarity: "Legendary", income: 8 },
                { name: "Starwhale Guardian", emoji: "🐋", rarity: "Legendary", income: 8 },
                { name: "Cosmos Serpent", emoji: "🐍", rarity: "Legendary", income: 8 },
                { name: "Eclipse Griffin", emoji: "🦅", rarity: "Legendary", income: 8 },
                { name: "Moonlight Kirin", emoji: "🐐", rarity: "Epic", income: 5 },
                { name: "Solar Pegasus", emoji: "🐎", rarity: "Legendary", income: 8 },
                { name: "Starlight Fox", emoji: "🦊", rarity: "Epic", income: 5 },
                { name: "Dream Stag", emoji: "🦌", rarity: "Epic", income: 5 },
                { name: "Void Jelly", emoji: "🪼", rarity: "Epic", income: 5 },
                { name: "Comet Wolf", emoji: "🐺", rarity: "Legendary", income: 8 },
                { name: "Oracle Owl", emoji: "🦉", rarity: "Epic", income: 5 },
                { name: "Crystal Kraken", emoji: "🐙", rarity: "Legendary", income: 8 }
            ]
        }
    };

    // Eggs and animals
    let eggs = [];       // { id, typeKey, startTime, hatchTime }
    let zooAnimals = []; // { id, name, emoji, rarity, fromEggType, income, hunger, cleanliness }

    // === DOM ELEMENTS ===
    const coinCountEl = document.getElementById("coin-count");
    const incomeRateEl = document.getElementById("income-rate");
    const incubatorEl = document.getElementById("incubator");
    const zooEl = document.getElementById("zoo");
    const bathQueueEl = document.getElementById("bath-queue");
    const eggButtons = document.querySelectorAll(".egg-button");

    // === INITIAL RENDER ===
    if (coinCountEl) coinCountEl.textContent = coins.toString();
    if (incomeRateEl) incomeRateEl.textContent = "0";

    // === EVENT LISTENERS ===
    eggButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            const typeKey = btn.getAttribute("data-type");
            buyEgg(typeKey);
        });
    });

    // === GAME FUNCTIONS ===

    function buyEgg(typeKey) {
        const eggType = eggTypes[typeKey];
        if (!eggType) return;

        if (coins < eggType.price) {
            alert("Not enough coins for this egg!");
            return;
        }

        coins -= eggType.price;
        if (coinCountEl) coinCountEl.textContent = coins.toString();

        const newEgg = {
            id: Date.now() + Math.random(),
            typeKey,
            startTime: Date.now(),
            hatchTime: eggType.hatchTime
        };

        eggs.push(newEgg);
        renderIncubator();
    }

    function processBath(now) {
        // Start a new bath if none in progress
        if (!currentBath && bathQueue.length > 0) {
            const nextAnimalId = bathQueue.shift();
            currentBath = {
                animalId: nextAnimalId,
                startTime: now,
                durationMs: BATH_DURATION_MS
            };
        }

        // If a pet is currently in the bath, check progress
        if (currentBath) {
            const elapsed = now - currentBath.startTime;
            if (elapsed >= currentBath.durationMs) {
                // Bath finished
                const animal = zooAnimals.find(
                    (a) => a.id === currentBath.animalId
                );
                if (animal) {
                    animal.cleanliness = MAX_CLEAN;
                }
                currentBath = null; // Free the bath for the next pet
            }
        }
    }

    function tick() {
        const now = Date.now();

        // 1) Egg hatching
        eggs.forEach((egg) => {
            const timePassed = now - egg.startTime;
            if (timePassed >= egg.hatchTime) {
                hatchEgg(egg);
            }
        });

        eggs = eggs.filter((egg) => {
            const timePassed = now - egg.startTime;
            return timePassed < egg.hatchTime;
        });

        // 2) Bath processing (queue in order)
        processBath(now);

        // 3) Hunger, cleanliness (decay), income
        let incomePerSecond = 0;

        zooAnimals.forEach((animal) => {
            const isInBath =
                (currentBath && currentBath.animalId === animal.id) || false;

            // Pets in the bath don't decay and don't earn coins while inside
            if (!isInBath) {
                animal.hunger = Math.max(0, animal.hunger - HUNGER_DECAY_PER_TICK);
                animal.cleanliness = Math.max(
                    0,
                    animal.cleanliness - CLEAN_DECAY_PER_TICK
                );
            }

            const canEarn =
                animal.hunger > 0 &&
                animal.cleanliness > 0 &&
                !isInBath;

            if (canEarn) {
                incomePerSecond += animal.income;
            }
        });

        if (incomePerSecond > 0) {
            coins += incomePerSecond;
            if (coinCountEl) coinCountEl.textContent = coins.toString();
        }

        if (incomeRateEl) incomeRateEl.textContent = incomePerSecond.toString();

        renderIncubator();
        renderZoo();
        renderBathHouse();
    }

    function hatchEgg(egg) {
        const eggType = eggTypes[egg.typeKey];
        if (!eggType) return;

        const list = eggType.animals;
        const randomIndex = Math.floor(Math.random() * list.length);
        const chosen = list[randomIndex];

        const animal = {
            id: Date.now() + Math.random(),
            name: chosen.name,
            emoji: chosen.emoji,
            rarity: chosen.rarity,
            fromEggType: eggType.name,
            income: chosen.income,
            hunger: MAX_HUNGER,
            cleanliness: MAX_CLEAN
        };

        zooAnimals.push(animal);

        console.log(
            `An egg hatched into: ${animal.name}! (${animal.rarity}, +${animal.income} coins/sec)`
        );
    }

    // Feeding costs coins
    function feedAnimal(animalId) {
        const animal = zooAnimals.find((a) => a.id === animalId);
        if (!animal) return;

        const feedCost = animal.income * 5;
        if (coins < feedCost) {
            alert(`Not enough coins to feed ${animal.name}! (Needs ${feedCost})`);
            return;
        }

        coins -= feedCost;
        if (coinCountEl) coinCountEl.textContent = coins.toString();

        animal.hunger = MAX_HUNGER;
        renderZoo();
    }

    // Cleaning now sends the pet into the bath queue (FIFO)
    function cleanAnimal(animalId) {
        const animal = zooAnimals.find((a) => a.id === animalId);
        if (!animal) return;

        const alreadyInBath =
            (currentBath && currentBath.animalId === animalId) ||
            bathQueue.includes(animalId);

        if (alreadyInBath) {
            alert(`${animal.name} is already in the bath queue!`);
            return;
        }

        const cleanCost = animal.income * 6;
        if (coins < cleanCost) {
            alert(`Not enough coins to clean ${animal.name}! (Needs ${cleanCost})`);
            return;
        }

        // Pay once when sending to bath
        coins -= cleanCost;
        if (coinCountEl) coinCountEl.textContent = coins.toString();

        bathQueue.push(animalId);
        renderBathHouse();
        renderZoo();
    }

    // Selling gives coins and removes the pet
    function sellAnimal(animalId) {
        // Can't sell while in bath queue or in bath
        const inBath =
            (currentBath && currentBath.animalId === animalId) ||
            bathQueue.includes(animalId);

        if (inBath) {
            alert("You can't sell a pet while it is in the bath house.");
            return;
        }

        const index = zooAnimals.findIndex((a) => a.id === animalId);
        if (index === -1) return;

        const animal = zooAnimals[index];
        const sellPrice = animal.income * 20;

        coins += sellPrice;
        if (coinCountEl) coinCountEl.textContent = coins.toString();

        zooAnimals.splice(index, 1);
        renderZoo();
        renderBathHouse();
    }

    function renderIncubator() {
        if (!incubatorEl) return;

        incubatorEl.innerHTML = "";

        if (eggs.length === 0) {
            incubatorEl.innerHTML = "<p>No eggs incubating. Buy one from the shop!</p>";
            return;
        }

        const now = Date.now();

        eggs.forEach((egg) => {
            const eggType = eggTypes[egg.typeKey];
            const timePassed = now - egg.startTime;
            const timeLeft = Math.max(0, egg.hatchTime - timePassed);
            const secondsLeft = Math.ceil(timeLeft / 1000);

            const progress = Math.min(1, timePassed / egg.hatchTime) * 100;

            const card = document.createElement("div");
            card.className = "card";

            card.innerHTML = `
                <div class="icon">${eggType.icon}</div>
                <div><strong>${eggType.name}</strong></div>
                <div>Hatching in: ${secondsLeft}s</div>
                <div class="progress-bar">
                    <div class="progress-inner" style="width: ${progress}%;"></div>
                </div>
            `;

            incubatorEl.appendChild(card);
        });
    }

    function renderZoo() {
        if (!zooEl) return;

        zooEl.innerHTML = "";

        if (zooAnimals.length === 0) {
            zooEl.innerHTML = "<p>No animals yet. Hatch some eggs!</p>";
            return;
        }

        zooAnimals.forEach((animal) => {
            const hungerPercent = Math.round((animal.hunger / MAX_HUNGER) * 100);
            const cleanPercent = Math.round((animal.cleanliness / MAX_CLEAN) * 100);

            const isStarving = animal.hunger <= 0;
            const isDirty = animal.cleanliness <= 20;

            const inBathNow = currentBath && currentBath.animalId === animal.id;
            const inQueue = bathQueue.includes(animal.id);
            const inBathHouse = inBathNow || inQueue;

            const feedCost = animal.income * 5;
            const cleanCost = animal.income * 6;
            const sellPrice = animal.income * 20;

            const hungerText = isStarving
                ? "Hungry! (no coins)"
                : `Hunger: ${hungerPercent}%`;

            let cleanText;
            if (animal.cleanliness <= 0) {
                cleanText = "Filthy! (no coins)";
            } else if (isDirty) {
                cleanText = "Dirty! Needs a bath 🛁";
            } else {
                cleanText = `Cleanliness: ${cleanPercent}%`;
            }

            const canEarn =
                !isStarving &&
                animal.cleanliness > 0 &&
                !inBathNow;

            const card = document.createElement("div");
            card.className = "card";

            const cleanButtonLabel = inBathHouse
                ? (inBathNow ? "In Bath..." : "In Queue...")
                : `🛁 Clean (${cleanCost})`;

            const cleanButtonClass = inBathHouse ? "card-button clean disabled" : "card-button clean";

            card.innerHTML = `
                <div class="icon">${animal.emoji}</div>
                <div><strong>${animal.name}</strong></div>
                <div class="tag">${animal.rarity}</div>

                <div class="income-text">
                    💰 ${animal.income} coins/sec
                    ${canEarn ? "" : "(stopped)"}
                </div>

                <div class="hunger-label">${hungerText}</div>
                <div class="progress-bar hunger-bar">
                    <div class="progress-inner" style="width: ${hungerPercent}%;"></div>
                </div>

                <div class="clean-label">${cleanText}</div>
                <div class="progress-bar clean-bar">
                    <div class="progress-inner" style="width: ${cleanPercent}%;"></div>
                </div>

                <div class="button-row">
                    <button class="card-button feed" data-id="${animal.id}">
                        🍎 Feed (${feedCost})
                    </button>
                    <button class="${cleanButtonClass}" data-id="${animal.id}">
                        ${cleanButtonLabel}
                    </button>
                    <button class="card-button sell" data-id="${animal.id}">
                        💸 Sell (${sellPrice})
                    </button>
                </div>

                <div style="margin-top:4px; font-size: 0.75rem;">
                    From: ${animal.fromEggType}
                </div>
            `;

            zooEl.appendChild(card);
        });

        // Attach buttons
        const feedButtons = zooEl.querySelectorAll(".card-button.feed");
        feedButtons.forEach((btn) => {
            btn.addEventListener("click", () => {
                const id = Number(btn.getAttribute("data-id"));
                feedAnimal(id);
            });
        });

        const cleanButtons = zooEl.querySelectorAll(".card-button.clean");
        cleanButtons.forEach((btn) => {
            if (btn.classList.contains("disabled")) return;
            btn.addEventListener("click", () => {
                const id = Number(btn.getAttribute("data-id"));
                cleanAnimal(id);
            });
        });

        const sellButtons = zooEl.querySelectorAll(".card-button.sell");
        sellButtons.forEach((btn) => {
            btn.addEventListener("click", () => {
                const id = Number(btn.getAttribute("data-id"));
                sellAnimal(id);
            });
        });
    }

    function renderBathHouse() {
        if (!bathQueueEl) return;

        bathQueueEl.innerHTML = "";

        const idsInOrder = [];
        if (currentBath) {
            idsInOrder.push(currentBath.animalId);
        }
        idsInOrder.push(...bathQueue);

        if (idsInOrder.length === 0) {
            bathQueueEl.innerHTML =
                "<p>No pets in the bath house. Click <strong>Clean</strong> on a pet to send it here.</p>";
            return;
        }

        idsInOrder.forEach((animalId, index) => {
            const animal = zooAnimals.find((a) => a.id === animalId);
            if (!animal) return;

            const isCurrent =
                currentBath && currentBath.animalId === animalId && index === 0;

            let statusText;
            let progressPercent = 0;

            if (isCurrent) {
                const elapsed = Date.now() - currentBath.startTime;
                progressPercent = Math.min(
                    1,
                    elapsed / currentBath.durationMs
                ) * 100;
                statusText = "Getting cleaned ✨";
            } else if (index === 0 && !currentBath) {
                statusText = "Next up in bath";
            } else {
                statusText = `Waiting #${isCurrent ? 1 : index + 1}`;
            }

            const card = document.createElement("div");
            card.className = "card";

            card.innerHTML = `
                <div class="icon">${animal.emoji}</div>
                <div><strong>${animal.name}</strong></div>
                <div class="tag">${animal.rarity}</div>
                <div style="margin-top:4px; font-size:0.8rem;">${statusText}</div>
                ${
                    isCurrent
                        ? `
                <div class="progress-bar clean-bar" style="margin-top:6px;">
                    <div class="progress-inner" style="width: ${progressPercent}%;"></div>
                </div>
                `
                        : ""
                }
            `;

            bathQueueEl.appendChild(card);
        });
    }

    // === START GAME LOOP ===
    setInterval(tick, 1000);

    renderIncubator();
    renderZoo();
    renderBathHouse();
});
