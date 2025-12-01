/* 
    ============================================================================
    FANTASY ZOO - RENDERING LAYER (js/render.js)
    ============================================================================
    Updates the DOM based on GameState. No game logic lives here.
*/

(function () {
    "use strict";

    function $(id) {
        return document.getElementById(id);
    }

    const sections = {
        topBar: $("top-bar"),
        gameOver: $("game-over-section"),
        eggShop: $("egg-shop-section"),
        incubator: $("incubator-section"),
        zoo: $("zoo-section"),
        bathHouse: $("bath-house-section"),
        clinic: $("clinic-section"),
        habitat: $("habitat-section"),
        events: $("events-section"),
        leaderboard: $("leaderboard-section"),
        prestige: $("prestige-section")
    };

    function formatNumber(num) {
        const value = Number(num) || 0;
        return value % 1 === 0 ? value.toString() : value.toFixed(1);
    }

    function renderTopBar() {
        if (!sections.topBar) return;

        const coins = formatNumber(GameState.coins);
        const income = formatNumber(GameState.incomePerSecond);
        const animals = Array.isArray(GameState.animals) ? GameState.animals.length : 0;
        const eggs = Array.isArray(GameState.eggs) ? GameState.eggs.length : 0;
        const prestiges = GameState.prestige?.count ?? 0;

        sections.topBar.className = "top-bar card";
        sections.topBar.innerHTML = `
            <div class="game-title">🦁 Fantasy Zoo</div>
            <div class="top-stats">
                <div class="stat">Coins: ${coins}</div>
                <div class="stat">Income/sec: ${income}</div>
                <div class="stat">Animals: ${animals} | Eggs: ${eggs}</div>
                <div class="stat">Prestiges: ${prestiges}</div>
            </div>
        `;
    }

    function renderGameOver() {
        if (!sections.gameOver) return;
        if (!GameState.isGameOver) {
            sections.gameOver.style.display = "none";
            sections.gameOver.innerHTML = "";
            return;
        }

        const reason = GameState.gameOverReason;
        let message = "Your zoo has ended.";
        if (reason === "bankrupt") {
            message = "Bankrupt – your coins dropped below zero.";
        } else if (reason === "no_animals") {
            message = "No animals or eggs, and you can't afford a new egg.";
        } else if (reason === "all_unhappy") {
            message = "All animals are unhappy (happiness at zero).";
        }

        sections.gameOver.style.display = "block";
        sections.gameOver.innerHTML = `
            <div class="game-over-card">
                <h2>Game Over</h2>
                <p>${message}</p>
                <button class="egg-button" data-action="restart">Restart Game</button>
            </div>
        `;
    }

    function renderEggShop() {
        if (!sections.eggShop) return;
        const eggs = window.EggData || {};
        const keys = Object.keys(eggs);

        const container = document.createElement("div");
        container.className = "egg-shop-container";

        if (keys.length === 0) {
            container.textContent = "No egg types defined. Check EggData in js/eggs.js.";
        } else {
            keys.forEach((key) => {
                const egg = eggs[key];
                const btn = document.createElement("button");
                btn.className = "egg-button";
                btn.setAttribute("data-action", "buy-egg");
                btn.setAttribute("data-egg-type", key);
                btn.innerHTML = `
                    <div style="font-size:1.6rem; margin-bottom:4px;">${egg.icon}</div>
                    <div style="font-weight:600;">${egg.name}</div>
                    <div style="font-size:0.9rem;">Cost: ${egg.price} 💰</div>
                    <div style="font-size:0.8rem;">Hatch: ${formatNumber(egg.hatchTime / 1000)}s</div>
                    <div style="font-size:0.75rem; color:#555;">${egg.description || ""}</div>
                `;
                container.appendChild(btn);
            });
        }

        sections.eggShop.className = "card";
        sections.eggShop.innerHTML = `<h2>Egg Shop</h2>`;
        sections.eggShop.appendChild(container);
    }

    function renderIncubator() {
        if (!sections.incubator) return;
        sections.incubator.className = "card";
        sections.incubator.innerHTML = `<h2>Incubator</h2>`;

        if (!GameState.eggs || GameState.eggs.length === 0) {
            const p = document.createElement("p");
            p.textContent = "No eggs incubating. Buy an egg to start hatching!";
            sections.incubator.appendChild(p);
            return;
        }

        const grid = document.createElement("div");
        grid.className = "card-grid";
        const now = Utils.now();

        GameState.eggs.forEach((egg) => {
            const def = EggData[egg.type];
            if (!def) return;

            const elapsed = now - egg.start;
            const remaining = Math.max(0, egg.hatchTime - elapsed);
            const progress = Utils.clamp(Utils.percent(elapsed, egg.hatchTime), 0, 100);

            const card = document.createElement("div");
            card.className = "card";
            card.innerHTML = `
                <div class="icon">${def.icon}</div>
                <div><strong>${def.name}</strong></div>
                <div style="font-size:0.85rem;">Hatching in: ${Utils.formatTime(remaining)}</div>
                <div class="progress-bar"><div class="progress-inner" style="width:${progress}%;"></div></div>
            `;
            grid.appendChild(card);
        });

        sections.incubator.appendChild(grid);
    }

    function renderZoo() {
        if (!sections.zoo) return;
        sections.zoo.className = "card";
        sections.zoo.innerHTML = `<h2>Your Zoo</h2>`;

        if (!GameState.animals || GameState.animals.length === 0) {
            const p = document.createElement("p");
            p.textContent = "Your zoo is empty. Hatch some eggs to get new animals!";
            sections.zoo.appendChild(p);
            return;
        }

        const grid = document.createElement("div");
        grid.className = "card-grid";
        const prestigeMult = Number(GameState.modifiers?.globalPrestigeMultiplier ?? 1) || 1;
        const eventMult = Number(GameState.modifiers?.incomeBoostMultiplier ?? 1) || 1;

        GameState.animals.forEach((animal) => {
            const hungerPercent = Utils.clamp(animal.hunger || 0, 0, 100);
            const cleanPercent = Utils.clamp(animal.cleanliness || 0, 0, 100);
            const happiness = Math.round(Utils.clamp(animal.happiness || 0, 0, 100));
            const health = animal.healthStatus || "healthy";
            const happyMult = formatNumber(animal.happinessIncomeMultiplier || 1);
            const habitatMult = formatNumber(animal.habitatBonusMultiplier || 1);
            const effectiveIncome = Number(animal.effectiveIncome ?? animal.income) || 0;

            const card = document.createElement("div");
            card.className = "card";
            card.innerHTML = `
                <div class="icon">${animal.emoji}</div>
                <div><strong>${animal.name}</strong></div>
                <div class="tag">${animal.rarity || "Unknown"}</div>
                <div class="income-text">Base: ${animal.income} | Effective: ${formatNumber(effectiveIncome)}</div>
                <div class="income-text">Happiness: ${happiness}% ${happiness <= 0 ? "😞" : happiness >= 80 ? "😄" : "🙂"}</div>
                <div class="income-text">Health: ${health}</div>
                <div class="income-text">Habitat: ${animal.habitat || "Unassigned"}</div>
                <div class="income-text">
                    Multipliers → Happy x${happyMult}, Habitat x${habitatMult}, Prestige x${formatNumber(prestigeMult)}, Events x${formatNumber(eventMult)}
                </div>
                <div class="hunger-label">Tummy Full: ${hungerPercent}%</div>
                <div class="progress-bar hunger-bar"><div class="progress-inner" style="width:${hungerPercent}%;"></div></div>
                <div class="clean-label">Cleanliness: ${cleanPercent}%</div>
                <div class="progress-bar clean-bar"><div class="progress-inner" style="width:${cleanPercent}%;"></div></div>
                <div class="button-row">
                    <button class="card-button feed" data-action="feed" data-animal-id="${animal.id}">🍎 Feed</button>
                    <button class="card-button clean" data-action="clean" data-animal-id="${animal.id}">🛁 Clean</button>
                    <button class="card-button sell" data-action="sell" data-animal-id="${animal.id}">💸 Sell</button>
                    <button class="card-button" data-action="send-to-clinic" data-animal-id="${animal.id}">🏥 Clinic</button>
                </div>
                <div class="button-row">
                    ${ (window.HabitatConfig || []).map(h => `
                        <button class="card-button" data-action="assign-habitat" data-habitat-key="${h.key}" data-animal-id="${animal.id}">
                            ${h.name.split(" ")[0]}
                        </button>
                    `).join("") }
                </div>
            `;
            grid.appendChild(card);
        });

        sections.zoo.appendChild(grid);
    }

    function renderBathHouse() {
        if (!sections.bathHouse) return;
        sections.bathHouse.className = "card";
        sections.bathHouse.innerHTML = `<h2>Bath House</h2>`;

        const ids = [];
        if (GameState.currentBath?.id) ids.push(GameState.currentBath.id);
        if (Array.isArray(GameState.bathQueue)) ids.push(...GameState.bathQueue);

        if (ids.length === 0) {
            const p = document.createElement("p");
            p.textContent = "No pets in the bath house. Send a dirty pet to get cleaned.";
            sections.bathHouse.appendChild(p);
            return;
        }

        const now = Utils.now();
        const list = document.createElement("div");
        list.className = "card-grid";

        ids.forEach((id, idx) => {
            const animal = GameState.animals.find((a) => a.id === id);
            if (!animal) return;

            const isCurrent = GameState.currentBath && GameState.currentBath.id === id && idx === 0;
            let progressPercent = 0;
            if (isCurrent) {
                const duration = GameState.currentBath.durationMs || 1;
                const elapsed = now - GameState.currentBath.start;
                progressPercent = Utils.clamp(Utils.percent(elapsed, duration), 0, 100);
            }

            const card = document.createElement("div");
            card.className = "card";
            card.innerHTML = `
                <div class="icon">${animal.emoji}</div>
                <div><strong>${animal.name}</strong></div>
                <div class="tag">${animal.rarity || "Unknown"}</div>
                <div style="font-size:0.85rem;">${isCurrent ? "Getting cleaned" : `Waiting #${idx + 1}`}</div>
                ${isCurrent ? `<div class="progress-bar clean-bar"><div class="progress-inner" style="width:${progressPercent}%;"></div></div>` : ""}
            `;
            list.appendChild(card);
        });

        sections.bathHouse.appendChild(list);
    }

    function renderClinic() {
        if (!sections.clinic) return;
        sections.clinic.className = "card";
        sections.clinic.innerHTML = `<h2>Clinic</h2>`;

        const wrapper = document.createElement("div");
        const now = Utils.now();

        if (GameState.currentPatient?.id) {
            const animal = GameState.animals.find((a) => a.id === GameState.currentPatient.id);
            const duration = GameState.currentPatient.durationMs || 1;
            const elapsed = now - GameState.currentPatient.start;
            const progressPercent = Utils.clamp(Utils.percent(elapsed, duration), 0, 100);
            wrapper.innerHTML += `
                <div class="card" style="margin-bottom:8px;">
                    <div><strong>Being treated:</strong> ${animal ? animal.name : "Unknown"}</div>
                    <div class="progress-bar"><div class="progress-inner" style="width:${progressPercent}%;"></div></div>
                </div>
            `;
        } else {
            wrapper.innerHTML += `<p>No current patient.</p>`;
        }

        if (Array.isArray(GameState.clinicQueue) && GameState.clinicQueue.length > 0) {
            const queueList = document.createElement("ul");
            GameState.clinicQueue.forEach((id) => {
                const animal = GameState.animals.find((a) => a.id === id);
                const name = animal ? animal.name : "Unknown";
                const li = document.createElement("li");
                li.textContent = `Waiting: ${name}`;
                queueList.appendChild(li);
            });
            wrapper.appendChild(queueList);
        } else {
            const p = document.createElement("p");
            p.textContent = "Clinic queue is empty.";
            wrapper.appendChild(p);
        }

        sections.clinic.appendChild(wrapper);
    }

    function renderHabitats() {
        if (!sections.habitat) return;
        sections.habitat.className = "card";
        sections.habitat.innerHTML = `<h2>Habitats</h2>`;

        const habitats = GameState.habitats ? Object.values(GameState.habitats) : [];
        if (!habitats.length) {
            const p = document.createElement("p");
            p.textContent = "Habitats will appear once the game starts.";
            sections.habitat.appendChild(p);
            return;
        }

        const grid = document.createElement("div");
        grid.className = "card-grid";

        habitats.forEach((habitat) => {
            const animalsInHabitat = Array.isArray(habitat.animalIds)
                ? habitat.animalIds.filter((id) => GameState.animals.some((a) => a.id === id))
                : [];
            const cfg = (window.HabitatConfig || []).find((h) => h.key === habitat.key);
            const name = cfg?.name || habitat.key;

            const card = document.createElement("div");
            card.className = "card";
            card.innerHTML = `
                <div><strong>${name}</strong></div>
                <div class="income-text">Level: ${habitat.level || 1}</div>
                <div class="income-text">Capacity: ${habitat.capacity || 0}</div>
                <div class="income-text">Animals: ${animalsInHabitat.length}</div>
            `;
            grid.appendChild(card);
        });

        sections.habitat.appendChild(grid);
    }

    function renderEvents() {
        if (!sections.events) return;
        sections.events.className = "card";
        sections.events.innerHTML = `<h2>Events</h2>`;

        const history = GameState.events?.history || [];
        if (history.length === 0) {
            const p = document.createElement("p");
            p.textContent = "No events yet.";
            sections.events.appendChild(p);
            return;
        }

        const recent = history.slice(-5).reverse();
        const list = document.createElement("ul");
        recent.forEach((ev) => {
            const li = document.createElement("li");
            li.textContent = `${ev.name} – ${ev.description || ""}`;
            list.appendChild(li);
        });
        sections.events.appendChild(list);
    }

    function renderLeaderboard() {
        if (!sections.leaderboard) return;
        sections.leaderboard.className = "card";
        sections.leaderboard.innerHTML = `<h2>Leaderboard</h2>`;

        const runs = window.Leaderboard?.getRankedRuns
            ? Leaderboard.getRankedRuns(5)
            : (Array.isArray(GameState.leaderboard) ? GameState.leaderboard : []);

        if (!runs || runs.length === 0) {
            const p = document.createElement("p");
            p.textContent = "No leaderboard data yet. Prestige to record a run.";
            sections.leaderboard.appendChild(p);
            return;
        }

        const table = document.createElement("table");
        table.style.width = "100%";
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Rank</th>
                    <th>Coins</th>
                    <th>Pets</th>
                    <th>Best Rarity</th>
                    <th>Time</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector("tbody");
        runs.forEach((run, idx) => {
            const formatted = window.Leaderboard?.formatRunForDisplay
                ? Leaderboard.formatRunForDisplay(run, idx)
                : { rank: idx + 1, coins: run.coins, petsHatched: run.petsHatched, highestRarity: run.highestRarity, timeMinutes: Math.round((run.timePlayed || 0) / 60000) };
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${formatted.rank}</td>
                <td>${formatted.coins}</td>
                <td>${formatted.petsHatched}</td>
                <td>${formatted.highestRarity}</td>
                <td>${formatted.timeMinutes}m</td>
            `;
            tbody.appendChild(tr);
        });

        sections.leaderboard.appendChild(table);
    }

    function renderPrestige() {
        if (!sections.prestige) return;
        sections.prestige.className = "card";
        const prestigeCount = GameState.prestige?.count ?? 0;
        const multiplier = formatNumber(GameState.modifiers?.globalPrestigeMultiplier ?? 1);
        const canPrestige = window.PrestigeSystem?.canPrestige
            ? PrestigeSystem.canPrestige()
            : false;

        sections.prestige.innerHTML = `
            <h2>Prestige</h2>
            <p>Total Prestiges: ${prestigeCount}</p>
            <p>Global Income Multiplier: x${multiplier}</p>
            <button class="egg-button" data-action="prestige" ${!canPrestige || GameState.isGameOver ? "disabled" : ""}>
                Prestige
            </button>
            ${!canPrestige ? `<p style="font-size:0.85rem; color:#555;">Need more coins/animals to prestige.</p>` : ""}
        `;
    }

    function renderAll() {
        renderTopBar();
        renderGameOver();
        renderEggShop();
        renderIncubator();
        renderZoo();
        renderBathHouse();
        renderClinic();
        renderHabitats();
        renderEvents();
        renderLeaderboard();
        renderPrestige();
    }

    window.Render = {
        all: renderAll
    };
})();
