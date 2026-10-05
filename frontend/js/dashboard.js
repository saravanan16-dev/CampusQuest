/**
 * Student Dashboard Controller
 * Synchronizes metrics, weak areas, AI recommendations, recent attempts, and achievements.
 */

document.addEventListener("DOMContentLoaded", async () => {
    if (!Auth.requireAuth()) return;

    try {
        await Promise.all([
            loadUserProfileAndStats(),
            loadProgressAndWeakAreas(),
            loadRecentActivity(),
            loadAIRecommendations(),
            loadAchievementsShowcase(),
            loadLeaderboardPreview()
        ]);
    } catch (err) {
        console.error("Dashboard initialization error:", err);
    }
});

async function loadUserProfileAndStats() {
    try {
        const res = await API.getProfile();
        if (res.success) {
            const user = res.data.user;
            const gamification = res.data.gamification;

            document.getElementById("dash-welcome").innerText = `Welcome back, ${user.name}!`;
            document.getElementById("dash-subtext").innerText = `@${user.username} • Let's build your engineering mastery`;

            // Streak & Level
            document.getElementById("dash-streak-badge").innerHTML = `🔥 <strong>${gamification.current_streak}</strong> Day Streak`;
            document.getElementById("dash-level-badge").innerHTML = `⚡ Level ${gamification.level} (${gamification.level_title})`;

            // XP Bar
            const nextThresh = gamification.next_threshold ? `${gamification.next_threshold} XP` : "Max Level";
            document.getElementById("dash-xp-text").innerText = `XP: ${gamification.total_xp} / ${nextThresh}`;
            document.getElementById("dash-xp-percent").innerText = `${gamification.level_progress_percent}%`;
            document.getElementById("dash-xp-bar").style.width = `${gamification.level_progress_percent}%`;
        }
    } catch (e) {
        console.error("Error loading profile stats:", e);
    }
}

async function loadProgressAndWeakAreas() {
    try {
        const [progressRes, weakRes] = await Promise.all([
            API.getProgress(),
            API.getWeakAreas()
        ]);

        if (progressRes.success) {
            const stats = progressRes.data.stats;
            document.getElementById("stat-accuracy").innerText = `${stats.overall_accuracy}%`;
            document.getElementById("stat-attempted").innerText = `${stats.questions_attempted}`;
            document.getElementById("stat-sessions").innerText = `${stats.practice_sessions}`;
            document.getElementById("stat-mocktests").innerText = `${stats.tests_completed}`;

            // Render subject progress
            const container = document.getElementById("subject-progress-container");
            const subjects = progressRes.data.subjects;

            if (subjects && subjects.length > 0) {
                container.innerHTML = subjects.map(s => `
                    <div>
                        <div class="d-flex justify-content-between align-items-center mb-1">
                            <span class="fw-semibold">${s.subject_name}</span>
                            <span class="small text-muted">${s.questions_correct}/${s.questions_attempted} correct (${s.accuracy}%)</span>
                        </div>
                        <div class="progress" style="height: 8px;">
                            <div class="progress-bar ${Number(s.accuracy) >= 75 ? 'bg-success' : Number(s.accuracy) >= 50 ? 'bg-warning' : 'bg-danger'}" 
                                 style="width: ${s.accuracy}%"></div>
                        </div>
                    </div>
                `).join("");
            } else {
                container.innerHTML = `
                    <div class="text-muted small py-2">
                        No subject practice attempts recorded yet.
                        <a href="practice.html" class="fw-semibold">Start your first session &rarr;</a>
                    </div>
                `;
            }
        }

        // Render weak areas
        if (weakRes.success) {
            const weakAreas = weakRes.data.weak_areas;
            const weakListEl = document.getElementById("weak-topics-list");
            const countBadge = document.getElementById("weak-count-badge");

            countBadge.innerText = `${weakAreas.length} Identified`;

            if (weakAreas.length > 0) {
                weakListEl.innerHTML = weakAreas.slice(0, 3).map(w => `
                    <div class="d-flex justify-content-between align-items-center p-2 bg-white rounded border border-warning-subtle">
                        <div>
                            <div class="fw-bold text-dark small">${w.topic} <span class="badge bg-danger-subtle text-danger ms-1">${w.accuracy}%</span></div>
                            <div class="text-muted" style="font-size: 0.75rem;">${w.subject_name} (Unit ${w.unit})</div>
                        </div>
                        <a href="practice.html?subjectId=${w.subject_id}&unit=${w.unit}" class="btn btn-sm btn-outline-primary rounded-pill px-3 py-1 text-nowrap" style="font-size: 0.8rem;">
                            Practice Now
                        </a>
                    </div>
                `).join("");
            } else {
                weakListEl.innerHTML = `
                    <div class="p-2 bg-white rounded text-success small fw-semibold">
                        <i class="bi bi-check-circle-fill me-1"></i> No weak areas detected! All attempted topics are above 60% accuracy.
                    </div>
                `;
            }
        }
    } catch (e) {
        console.error("Error loading progress & weak areas:", e);
    }
}

async function loadRecentActivity() {
    try {
        const historyRes = await API.getPracticeHistory();
        const tbody = document.getElementById("recent-activity-tbody");

        if (historyRes.success && historyRes.data.length > 0) {
            tbody.innerHTML = historyRes.data.slice(0, 5).map(h => {
                const dateStr = new Date(h.created_at).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit"
                });
                return `
                    <tr>
                        <td>
                            <span class="badge bg-primary-subtle text-primary fw-semibold">Practice</span>
                            <span class="ms-1 small">${h.total_questions} Questions</span>
                        </td>
                        <td class="fw-semibold text-dark">${h.subject_name}</td>
                        <td>
                            <span class="fw-bold ${Number(h.accuracy) >= 70 ? 'text-success' : 'text-danger'}">${h.accuracy}%</span>
                            <span class="text-muted small">(${h.correct_answers}/${h.total_questions})</span>
                        </td>
                        <td class="text-muted small">${dateStr}</td>
                    </tr>
                `;
            }).join("");
        }
    } catch (e) {
        console.error("Error loading recent activity:", e);
    }
}

async function loadAIRecommendations() {
    try {
        const res = await API.getAIRecommendations();
        if (res.success) {
            const data = res.data;
            document.getElementById("ai-advice-text").innerText = data.advice;

            const itemsContainer = document.getElementById("ai-recommended-items");
            let html = "";

            if (data.recommended_notes && data.recommended_notes.length > 0) {
                const note = data.recommended_notes[0];
                html += `
                    <div class="p-2 rounded bg-white bg-opacity-10 small">
                        <div class="text-warning fw-bold"><i class="bi bi-journal-check me-1"></i>Review Note:</div>
                        <div class="text-white text-truncate">${note.title}</div>
                        <a href="notes.html?id=${note.id}" class="text-info text-decoration-none mt-1 d-inline-block">Read note &rarr;</a>
                    </div>
                `;
            }

            if (data.recommended_questions && data.recommended_questions.length > 0) {
                const q = data.recommended_questions[0];
                html += `
                    <div class="p-2 rounded bg-white bg-opacity-10 small">
                        <div class="text-warning fw-bold"><i class="bi bi-question-circle me-1"></i>High-Yield Question:</div>
                        <div class="text-white text-truncate">${q.topic} - ${q.question_text}</div>
                        <a href="practice.html?subjectId=${q.subject_id}" class="text-info text-decoration-none mt-1 d-inline-block">Solve question &rarr;</a>
                    </div>
                `;
            }

            itemsContainer.innerHTML = html;
        }
    } catch (e) {
        console.error("Error loading AI recommendations:", e);
    }
}

async function loadAchievementsShowcase() {
    try {
        const res = await API.getAchievements();
        if (res.success) {
            const container = document.getElementById("achievements-showcase");
            const achievements = res.data.slice(0, 4);

            container.innerHTML = achievements.map(a => `
                <div class="d-flex align-items-center gap-3 p-2 rounded ${a.is_unlocked ? 'bg-light border border-success-subtle' : 'opacity-50'}">
                    <div class="avatar-circle ${a.is_unlocked ? 'bg-success' : 'bg-secondary'} text-white" style="width: 36px; height: 36px;">
                        <i class="bi bi-trophy"></i>
                    </div>
                    <div class="flex-grow-1 overflow-hidden">
                        <div class="fw-semibold text-truncate small">${a.title}</div>
                        <div class="text-muted text-truncate" style="font-size: 0.75rem;">${a.description}</div>
                    </div>
                    <span class="badge ${a.is_unlocked ? 'bg-success text-white' : 'bg-secondary text-white'}" style="font-size: 0.7rem;">
                        ${a.is_unlocked ? 'Unlocked' : `+${a.xp_reward} XP`}
                    </span>
                </div>
            `).join("");
        }
    } catch (e) {
        console.error("Error loading achievements:", e);
    }
}

async function loadLeaderboardPreview() {
    try {
        const res = await API.getLeaderboard("overall");
        if (res.success) {
            const container = document.getElementById("leaderboard-preview");
            const topStudents = res.data.slice(0, 4);

            const user = Auth.getUser();
            const myRank = res.data.find(u => u.user_id === user.id);
            if (myRank) {
                document.getElementById("dash-rank-badge").innerHTML = `🏆 Rank: #${myRank.rank}`;
            }

            container.innerHTML = topStudents.map(s => `
                <div class="d-flex align-items-center justify-content-between p-2 rounded ${s.user_id === user.id ? 'bg-primary-subtle border border-primary' : 'bg-light'}">
                    <div class="d-flex align-items-center gap-2">
                        <span class="badge ${s.rank === 1 ? 'bg-warning text-dark' : s.rank === 2 ? 'bg-secondary' : 'bg-light text-dark'} rounded-circle" style="width: 24px; height: 24px; display: inline-flex; align-items: center; justify-content: center;">
                            ${s.rank}
                        </span>
                        <div>
                            <div class="fw-semibold small">${s.name} ${s.user_id === user.id ? '<span class="text-primary">(You)</span>' : ''}</div>
                            <div class="text-muted" style="font-size: 0.75rem;">🔥 ${s.current_streak || 0}d streak</div>
                        </div>
                    </div>
                    <span class="badge bg-primary text-white rounded-pill">${s.total_xp} XP</span>
                </div>
            `).join("");
        }
    } catch (e) {
        console.error("Error loading leaderboard preview:", e);
    }
}
