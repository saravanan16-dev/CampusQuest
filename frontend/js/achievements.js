/**
 * Achievements & Gamification Controller
 */

let allAchievementsData = [];

document.addEventListener("DOMContentLoaded", async () => {
    if (!Auth.requireAuth()) return;

    await loadGamificationData();

    // Setup filter buttons
    document.querySelectorAll(".filter-ach-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".filter-ach-btn").forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            filterAndRenderAchievements(btn.getAttribute("data-filter"));
        });
    });
});

async function loadGamificationData() {
    try {
        const res = await API.getGamification();
        if (res.success) {
            const data = res.data;
            allAchievementsData = data.achievements || [];

            // Level & Streak Banner
            document.getElementById("ach-level-badge").innerText = `⚡ Level ${data.level} — ${data.level_title}`;
            document.getElementById("ach-streak-badge").innerText = `🔥 ${data.current_streak} Day Streak`;
            document.getElementById("ach-total-xp").innerText = data.total_xp;
            document.getElementById("ach-unlocked-count").innerText = data.unlocked_achievements;
            document.getElementById("ach-total-count").innerText = data.total_achievements;

            const nextThresh = data.next_threshold ? `${data.next_threshold} XP` : "Max Level Achieved!";
            document.getElementById("ach-xp-progress-text").innerText = `XP: ${data.total_xp} / ${nextThresh}`;
            document.getElementById("ach-xp-percentage").innerText = `${data.level_progress_percent}% to next rank`;
            document.getElementById("ach-xp-bar").style.width = `${data.level_progress_percent}%`;

            // Highlight current level card
            const currentLevelEl = document.getElementById(`level-card-${data.level}`);
            if (currentLevelEl) {
                currentLevelEl.classList.remove("bg-light");
                currentLevelEl.classList.add("bg-primary-subtle", "border-primary", "shadow-sm");
                currentLevelEl.innerHTML += `<span class="badge bg-primary text-white mt-1 d-inline-block">Active Level</span>`;
            }

            // Render Achievements
            filterAndRenderAchievements("all");

            // Render XP History
            renderXpTransactions(data.recent_xp_transactions || []);
        }
    } catch (e) {
        console.error("Failed to load gamification data:", e);
    }
}

function filterAndRenderAchievements(filter = "all") {
    let list = allAchievementsData;
    if (filter === "unlocked") {
        list = list.filter(a => a.is_unlocked === 1);
    } else if (filter === "locked") {
        list = list.filter(a => a.is_unlocked === 0);
    }

    const container = document.getElementById("achievements-container");

    if (list.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-4 text-muted">
                No achievements found matching this filter.
            </div>
        `;
        return;
    }

    const badgeIcons = {
        compass: "bi-compass",
        award: "bi-award",
        zap: "bi-lightning-charge-fill",
        shield: "bi-shield-check",
        flame: "bi-fire",
        star: "bi-star-fill",
        database: "bi-database",
        code: "bi-code-slash"
    };

    container.innerHTML = list.map(a => {
        const isUnlocked = a.is_unlocked === 1;
        const iconClass = badgeIcons[a.badge_icon] || "bi-trophy-fill";

        return `
            <div class="col-md-6">
                <div class="card-cq h-100 p-3 d-flex flex-row align-items-center gap-3 ${isUnlocked ? 'border-success bg-white shadow-sm' : 'opacity-60 bg-light'}">
                    <div class="avatar-circle flex-shrink-0 ${isUnlocked ? 'bg-success text-white' : 'bg-secondary text-white'}" style="width: 48px; height: 48px; font-size: 1.35rem;">
                        <i class="bi ${iconClass}"></i>
                    </div>
                    <div class="flex-grow-1 overflow-hidden">
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <h6 class="fw-bold text-dark mb-0 text-truncate">${a.title}</h6>
                            <span class="badge ${isUnlocked ? 'bg-success text-white' : 'bg-secondary text-white'} rounded-pill" style="font-size: 0.7rem;">
                                ${isUnlocked ? 'Unlocked' : `+${a.xp_reward} XP`}
                            </span>
                        </div>
                        <p class="text-muted small mb-1" style="font-size: 0.8rem;">${a.description}</p>
                        ${isUnlocked && a.unlocked_at ? `
                            <small class="text-success fw-semibold" style="font-size: 0.72rem;">
                                <i class="bi bi-check2-circle me-1"></i>Unlocked on ${new Date(a.unlocked_at).toLocaleDateString()}
                            </small>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join("");
}

function renderXpTransactions(transactions) {
    const container = document.getElementById("xp-history-container");
    if (transactions.length === 0) {
        container.innerHTML = `<div class="text-muted small py-2 text-center">No transactions recorded yet.</div>`;
        return;
    }

    container.innerHTML = transactions.map(t => `
        <div class="d-flex justify-content-between align-items-center p-2 rounded bg-light border">
            <div>
                <div class="small fw-semibold text-dark">${t.reason}</div>
                <div class="text-muted" style="font-size: 0.72rem;">${new Date(t.created_at).toLocaleDateString()}</div>
            </div>
            <span class="badge bg-warning text-dark fw-bold rounded-pill">+${t.amount} XP</span>
        </div>
    `).join("");
}
