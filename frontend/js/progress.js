/**
 * Progress Analytics Controller
 */

document.addEventListener("DOMContentLoaded", async () => {
    Auth.requireAuth();
    await Promise.all([
        loadOverallProgress(),
        loadWeakAndStrong(),
        loadStreakData(),
        loadAIAdvice()
    ]);
});

async function loadOverallProgress() {
    try {
        const res = await API.getProgress();
        if (res.success) {
            const stats = res.data.stats;
            const subjects = res.data.subjects;

            document.getElementById("pg-accuracy").innerText = `${stats.overall_accuracy}%`;
            document.getElementById("pg-attempted").innerText = stats.questions_attempted;
            document.getElementById("pg-streak").innerText = stats.current_streak;
            document.getElementById("pg-test-avg").innerText = `${stats.average_test_score}%`;

            // Subject mastery
            const container = document.getElementById("subject-mastery-container");
            if (subjects.length > 0) {
                container.innerHTML = subjects.map(s => {
                    const acc = Number(s.accuracy);
                    const color = acc >= 75 ? "bg-success" : acc >= 50 ? "bg-warning" : "bg-danger";
                    const icon = acc >= 75 ? "🟢" : acc >= 50 ? "🟡" : "🔴";
                    return `
                        <div class="mb-3">
                            <div class="d-flex justify-content-between align-items-center mb-1">
                                <div class="d-flex align-items-center gap-2">
                                    <span>${icon}</span>
                                    <span class="fw-semibold text-dark">${s.subject_name}</span>
                                </div>
                                <div class="text-muted small">
                                    ${s.questions_correct}/${s.questions_attempted} correct 
                                    <strong class="${acc >= 75 ? 'text-success' : acc >= 50 ? 'text-warning' : 'text-danger'}"> (${acc}%)</strong>
                                </div>
                            </div>
                            <div class="progress" style="height: 10px; border-radius: 6px;">
                                <div class="progress-bar ${color}" style="width: ${acc}%"></div>
                            </div>
                        </div>
                    `;
                }).join("");
            } else {
                container.innerHTML = `
                    <div class="text-center text-muted py-4">
                        No subject practice data yet. <a href="practice.html" class="fw-semibold">Start a practice session</a> to see your performance here.
                    </div>
                `;
            }
        }
    } catch (e) {
        console.error("Error loading progress:", e);
    }
}

async function loadWeakAndStrong() {
    try {
        const res = await API.getWeakAreas();
        if (res.success) {
            const weak = res.data.weak_areas;
            const strong = (res.data.strong_topics || []);

            // Weak areas
            const weakContainer = document.getElementById("weak-areas-container");
            document.getElementById("weak-count").innerText = `${weak.length} topics`;

            if (weak.length > 0) {
                weakContainer.innerHTML = weak.map(w => `
                    <div class="d-flex align-items-center justify-content-between p-3 bg-danger-subtle border border-danger-subtle rounded-3 mb-2">
                        <div>
                            <div class="fw-bold small text-dark">${w.topic}</div>
                            <div class="text-muted" style="font-size: 0.75rem;">
                                ${w.subject_name} · Unit ${w.unit} · 
                                <span class="text-danger fw-bold">${w.accuracy}% accuracy</span>
                            </div>
                            ${w.recommendation_text ? `<div class="text-muted" style="font-size: 0.72rem; margin-top: 3px;">${w.recommendation_text}</div>` : ""}
                        </div>
                        <a href="practice.html?subjectId=${w.subject_id}&unit=${w.unit}" 
                           class="btn btn-sm btn-danger rounded-pill px-3 text-nowrap" style="font-size: 0.78rem;">
                            Practice Now
                        </a>
                    </div>
                `).join("");
            } else {
                weakContainer.innerHTML = `
                    <div class="p-3 bg-success-subtle border border-success-subtle rounded-3 text-success fw-semibold small">
                        <i class="bi bi-check-circle-fill me-2"></i>
                        Excellent! No weak areas found. All practiced topics are above 60% accuracy.
                    </div>
                `;
            }

            // Strong areas
            const strongContainer = document.getElementById("strong-areas-container");
            if (strong.length > 0) {
                strongContainer.innerHTML = strong.map(s => `
                    <div class="d-flex align-items-center justify-content-between p-2 rounded-2 bg-success-subtle mb-2">
                        <div>
                            <div class="fw-semibold small">${s.topic}</div>
                            <div class="text-muted" style="font-size: 0.75rem;">${s.subject_name} · Unit ${s.unit}</div>
                        </div>
                        <span class="badge bg-success rounded-pill">${s.accuracy}%</span>
                    </div>
                `).join("");
            } else {
                strongContainer.innerHTML = `<div class="text-muted small py-2">Practice more topics to identify strong areas!</div>`;
            }
        }
    } catch (e) {
        console.error("Error loading weak areas:", e);
    }
}

async function loadStreakData() {
    try {
        const res = await API.getStreak();
        if (res.success) {
            const streak = res.data;
            document.getElementById("streak-current").innerText = streak.current_streak;
            document.getElementById("streak-max").innerText = streak.max_streak;
            document.getElementById("streak-last-active").innerText = streak.last_active_date
                ? `Last active: ${new Date(streak.last_active_date).toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}`
                : "Last active: No activity yet";
        }
    } catch (e) {
        console.error("Error loading streak:", e);
    }
}

async function loadAIAdvice() {
    try {
        const res = await API.getAIRecommendations();
        if (res.success) {
            document.getElementById("ai-study-advice").innerText = res.data.advice;

            const priorityContainer = document.getElementById("ai-priority-list");
            const focusAreas = res.data.focus_areas?.slice(0, 3) || [];

            if (focusAreas.length > 0) {
                priorityContainer.innerHTML = focusAreas.map(f => `
                    <div class="p-2 rounded-2 bg-white bg-opacity-10 small text-white">
                        <div class="fw-semibold"><i class="bi bi-exclamation-circle text-warning me-1"></i>${f.topic}</div>
                        <div class="text-white-50">${f.subject} · Unit ${f.unit} · ${f.current_accuracy}</div>
                    </div>
                `).join("");
            }
        }
    } catch (e) {
        console.error("Error loading AI advice:", e);
    }
}
