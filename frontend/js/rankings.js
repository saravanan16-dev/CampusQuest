/**
 * Rankings & Leaderboard Controller
 */

let currentLeaderType = "overall";
const TYPE_LABELS = {
    overall: { title: "All-Time XP Ranking", scoreKey: "total_xp", scoreLabel: "Total XP" },
    weekly: { title: "Weekly XP Ranking", scoreKey: "weekly_xp", scoreLabel: "Weekly XP" },
    monthly: { title: "Monthly XP Ranking", scoreKey: "monthly_xp", scoreLabel: "Monthly XP" },
    accuracy: { title: "Accuracy Ranking", scoreKey: "overall_accuracy", scoreLabel: "Accuracy" }
};

document.addEventListener("DOMContentLoaded", () => {
    loadLeaderboard("overall");
});

async function loadLeaderboard(type) {
    currentLeaderType = type;

    // Update tab active states
    document.querySelectorAll("#leaderboard-tabs .nav-link").forEach(btn => {
        btn.classList.remove("active");
    });
    event?.target?.classList?.add("active");

    const config = TYPE_LABELS[type];
    document.getElementById("table-title").innerText = config.title;
    document.getElementById("leaderboard-tbody").innerHTML = `<tr><td colspan="5" class="text-center py-4"><div class="spinner-border text-primary" role="status"></div></td></tr>`;

    try {
        const res = await API.getLeaderboard(type);
        if (res.success) {
            const data = res.data;
            const currentUser = Auth.getUser();
            const scoreKey = config.scoreKey;
            const scoreLabel = config.scoreLabel;

            document.getElementById("entry-count").innerText = `${data.length} students`;

            // Podium (top 3)
            renderPodium(data.slice(0, 3), scoreKey, scoreLabel);

            // Full table
            const tbody = document.getElementById("leaderboard-tbody");
            if (data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">No ranking data available yet.</td></tr>`;
                return;
            }

            tbody.innerHTML = data.map(s => {
                const isMe = currentUser && Number(s.user_id) === Number(currentUser.id);
                const rankDisplay = s.rank === 1 ? "🥇" : s.rank === 2 ? "🥈" : s.rank === 3 ? "🥉" : `#${s.rank}`;
                const scoreDisplay = type === "accuracy" ? `${s[scoreKey]}%` : `${s[scoreKey]} XP`;

                return `
                    <tr class="rank-row ${isMe ? 'you-row' : ''}">
                        <td class="text-center fw-bold fs-5">${rankDisplay}</td>
                        <td>
                            <div class="d-flex align-items-center gap-2">
                                <div class="avatar-circle" style="background: ${isMe ? 'linear-gradient(135deg, #4f46e5, #818cf8)' : 'linear-gradient(135deg, #475569, #94a3b8)'}; width: 34px; height: 34px;">
                                    ${s.name ? s.name.charAt(0).toUpperCase() : "?"}
                                </div>
                                <div>
                                    <div class="fw-semibold">${s.name} ${isMe ? '<span class="badge bg-primary ms-1" style="font-size: 0.65rem;">You</span>' : ''}</div>
                                    <div class="text-muted small">@${s.username}</div>
                                </div>
                            </div>
                        </td>
                        <td>
                            <span class="badge bg-primary text-white rounded-pill px-3 py-1.5 fw-bold">
                                ${scoreDisplay}
                            </span>
                        </td>
                        <td class="d-none d-md-table-cell">
                            <span class="fw-semibold text-warning">🔥 ${s.current_streak || 0}d</span>
                        </td>
                        <td class="d-none d-lg-table-cell">
                            <span class="text-muted small">${s.achievements_count || "--"} badges</span>
                        </td>
                    </tr>
                `;
            }).join("");
        }
    } catch (e) {
        document.getElementById("leaderboard-tbody").innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Failed to load leaderboard.</td></tr>`;
    }
}

function renderPodium(top3, scoreKey, scoreLabel) {
    const container = document.getElementById("top3-container");
    if (top3.length === 0) {
        container.innerHTML = `<div class="col-12 text-center text-muted py-3">No rankings yet. Practice more to appear on the podium!</div>`;
        return;
    }

    const getCard = (s, size) => {
        const medals = { 1: "🥇", 2: "🥈", 3: "🥉" };
        const colors = { 1: "#f59e0b", 2: "#94a3b8", 3: "#b45309" };
        const heights = { 1: "100%", 2: "80%", 3: "65%" };
        const scoreVal = scoreKey === "overall_accuracy" ? `${s[scoreKey]}%` : `${s[scoreKey]} XP`;

        return `
            <div class="text-center">
                <div class="avatar-circle mx-auto mb-2" style="width: ${size}px; height: ${size}px; font-size: ${size/3}px; background: linear-gradient(135deg, ${colors[s.rank]}, ${colors[s.rank]}88);">
                    ${s.name ? s.name.charAt(0).toUpperCase() : "?"}
                </div>
                <div class="fw-bold">${medals[s.rank] || `#${s.rank}`} ${s.name}</div>
                <div class="text-muted small">@${s.username}</div>
                <div class="badge bg-primary mt-1 rounded-pill">${scoreVal}</div>
                <div class="text-warning small mt-1">🔥 ${s.current_streak || 0}d</div>
            </div>
        `;
    };

    // Render order: 2nd, 1st, 3rd (podium style)
    const ordered = [top3[1], top3[0], top3[2]].filter(Boolean);
    container.innerHTML = ordered.map(s => {
        const sizes = { 1: 64, 2: 50, 3: 44 };
        return `<div class="col-4">${getCard(s, sizes[s.rank] || 44)}</div>`;
    }).join("");
}

window.loadLeaderboard = loadLeaderboard;
