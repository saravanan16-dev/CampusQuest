/**
 * Student Dashboard Controller
 * Synchronizes metrics, weak areas, AI recommendations, recent attempts, and achievements.
 */

document.addEventListener("DOMContentLoaded", async () => {
    if (!Auth.requireAuth()) return;

    try {
        await Promise.all([
            loadLearningNavigator(),
            loadExamPrepDashboardHub(),
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

async function loadLearningNavigator() {
    try {
        const dashRes = await API.getDashboard();
        if (dashRes.success) {
            const subCountEl = document.getElementById("nav-subjects-count");
            const noteCountEl = document.getElementById("nav-notes-count");
            if (subCountEl) subCountEl.innerText = `${dashRes.subjects_count} Subjects`;
            if (noteCountEl) noteCountEl.innerText = `${dashRes.notes_count} Notes`;

            const subjects = dashRes.subjects || [];
            const listEl = document.getElementById("nav-subject-list");
            if (!listEl) return;

            if (subjects.length > 0) {
                listEl.innerHTML = subjects.map((s, idx) => `
                    <button type="button" class="list-group-item list-group-item-action ${idx === 0 ? 'active' : ''} d-flex justify-content-between align-items-center"
                            onclick="selectNavSubject(${s.id}, this)">
                        <div class="text-truncate">
                            <div class="fw-semibold text-truncate">${s.name}</div>
                            <small class="opacity-75">Semester ${s.semester}</small>
                        </div>
                        <i class="bi bi-chevron-right ms-2 small"></i>
                    </button>
                `).join("");

                // Automatically load units for first subject
                selectNavSubject(subjects[0].id, listEl.children[0]);
            } else {
                listEl.innerHTML = `<div class="text-center py-3 text-muted small">No subjects available.</div>`;
            }
        }
    } catch (e) {
        console.error("Error loading learning navigator:", e);
    }
}

async function selectNavSubject(subjectId, el) {
    document.querySelectorAll("#nav-subject-list .list-group-item").forEach(b => b.classList.remove("active"));
    if (el) el.classList.add("active");

    const unitList = document.getElementById("nav-unit-list");
    const notesList = document.getElementById("nav-notes-list");
    if (!unitList) return;

    unitList.innerHTML = `<div class="text-center py-3 text-muted small"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Loading units...</div>`;
    if (notesList) notesList.innerHTML = `<div class="text-center py-3 text-muted small">Select a unit to view notes</div>`;

    try {
        const res = await API.getUnitsBySubject(subjectId);
        if (res.success && res.data.length > 0) {
            unitList.innerHTML = res.data.map((u, idx) => `
                <button type="button" class="list-group-item list-group-item-action ${idx === 0 ? 'active' : ''} d-flex justify-content-between align-items-center"
                        onclick="selectNavUnit(${subjectId}, ${u.id}, this)">
                    <div class="text-truncate">
                        <span class="badge bg-secondary rounded-pill me-1" style="font-size: 0.7rem;">Unit ${u.unit_number}</span>
                        <span class="fw-semibold small text-truncate">${u.name}</span>
                    </div>
                    <span class="badge bg-light text-dark border rounded-pill">${u.notes_count || 0}</span>
                </button>
            `).join("");

            // Automatically load notes for first unit
            selectNavUnit(subjectId, res.data[0].id, unitList.children[0]);
        } else {
            unitList.innerHTML = `<div class="text-center py-3 text-muted small">No units configured for this subject.</div>`;
        }
    } catch (e) {
        unitList.innerHTML = `<div class="text-center py-3 text-danger small">Failed to load units.</div>`;
    }
}
window.selectNavSubject = selectNavSubject;

async function selectNavUnit(subjectId, unitId, el) {
    document.querySelectorAll("#nav-unit-list .list-group-item").forEach(b => b.classList.remove("active"));
    if (el) el.classList.add("active");

    const notesList = document.getElementById("nav-notes-list");
    if (!notesList) return;

    notesList.innerHTML = `<div class="text-center py-3 text-muted small"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Loading notes...</div>`;

    try {
        const res = await API.getAllNotes({ subject_id: subjectId, unit_id: unitId });
        if (res.success && res.data.length > 0) {
            notesList.innerHTML = res.data.map(n => `
                <div class="p-2.5 rounded bg-light border">
                    <div class="d-flex justify-content-between align-items-start mb-1">
                        <h6 class="fw-bold text-dark mb-0 small text-truncate" style="max-width: 170px;">${n.title}</h6>
                        <span class="badge bg-primary rounded-pill" style="font-size: 0.65rem;">Unit ${n.unit_number || n.unit}</span>
                    </div>
                    <p class="text-muted small mb-2 text-truncate" style="font-size: 0.75rem;">${n.description || "Comprehensive syllabus notes"}</p>
                    <div class="d-flex gap-1">
                        <button class="btn btn-sm btn-primary rounded-pill flex-grow-1 py-0.5" style="font-size: 0.72rem;" onclick="openDashNote(${n.id})">
                            <i class="bi bi-book-half me-1"></i>Read
                        </button>
                        ${n.file_url ? `
                            <a href="${n.file_url}" target="_blank" class="btn btn-sm btn-outline-secondary rounded-pill px-2 py-0.5" style="font-size: 0.72rem;">
                                <i class="bi bi-download"></i>
                            </a>
                        ` : ''}
                    </div>
                </div>
            `).join("");
        } else {
            notesList.innerHTML = `
                <div class="text-center py-3 text-muted small">
                    <i class="bi bi-journal-x d-block mb-1 fs-5 text-secondary"></i>
                    No notes for this unit yet.
                </div>
            `;
        }
    } catch (e) {
        notesList.innerHTML = `<div class="text-center py-3 text-danger small">Failed to load notes.</div>`;
    }
}
window.selectNavUnit = selectNavUnit;

async function openDashNote(noteId) {
    try {
        const res = await API.getNote(noteId);
        if (res.success) {
            const note = res.data;
            document.getElementById("dash-modal-note-title").innerText = note.title;
            document.getElementById("dash-modal-note-badge").innerText = `Unit ${note.unit_number || note.unit}: ${note.subject_name}`;
            document.getElementById("dash-modal-note-content").innerText = note.content || note.description || "Note content preview.";
            const dl = document.getElementById("dash-modal-note-download");
            if (note.file_url) {
                dl.href = note.file_url;
                dl.classList.remove("d-none");
            } else {
                dl.classList.add("d-none");
            }
            new bootstrap.Modal(document.getElementById("dashNoteModal")).show();
        }
    } catch (e) {
        Auth.showToast("Could not load note", "error");
    }
}
window.openDashNote = openDashNote;

async function loadExamPrepDashboardHub() {
    try {
        const res = await API.getDashboard();
        if (res.success && res.data) {
            const data = res.data;

            // 1. Continue Learning Subjects with percentages (e.g. DBMS 72%, OS 65%, Networks 80%)
            const contContainer = document.getElementById("continue-learning-container");
            if (contContainer && data.continue_learning) {
                contContainer.innerHTML = data.continue_learning.slice(0, 3).map(s => {
                    const pct = s.progress_percent || 65;
                    const color = pct >= 75 ? 'bg-success' : (pct >= 60 ? 'bg-primary' : 'bg-warning');
                    return `
                        <div class="col-md-4">
                            <div class="p-3 rounded-3 bg-light border d-flex flex-column h-100">
                                <div class="d-flex justify-content-between align-items-center mb-1">
                                    <span class="fw-bold text-dark text-truncate" title="${s.name}">${s.name}</span>
                                    <span class="badge ${pct >= 75 ? 'bg-success-subtle text-success' : 'bg-primary-subtle text-primary'} border fw-bold">${pct}%</span>
                                </div>
                                <div class="progress mb-3" style="height: 6px;">
                                    <div class="progress-bar ${color}" style="width: ${pct}%"></div>
                                </div>
                                <a href="practice.html?subjectId=${s.id}" class="btn btn-sm btn-outline-primary rounded-pill mt-auto fw-semibold">
                                    Continue Learning &rarr;
                                </a>
                            </div>
                        </div>
                    `;
                }).join("");
            }

            // 2. PYQ Years
            const pyqContainer = document.getElementById("dash-pyq-years-container");
            if (pyqContainer && data.pyqs_years && data.pyqs_years.length > 0) {
                pyqContainer.innerHTML = data.pyqs_years.map(y => `
                    <a href="pyqs.html?year=${y}" class="btn btn-sm btn-outline-primary rounded-pill px-3 fw-semibold">
                        <i class="bi bi-calendar-check me-1"></i>${y} Exam
                    </a>
                `).join("");
            }

            // 3. Mock Tests
            const mockContainer = document.getElementById("dash-mock-tests-container");
            if (mockContainer && data.mock_tests && data.mock_tests.length > 0) {
                mockContainer.innerHTML = data.mock_tests.slice(0, 3).map(m => `
                    <a href="mock-tests.html?start=${m.id}" class="btn btn-sm btn-danger rounded-pill px-3 fw-semibold">
                        <i class="bi bi-play-fill me-1"></i>[${m.title}]
                    </a>
                `).join("");
            }
        }
    } catch (e) {
        console.error("Error loading exam prep dashboard hub:", e);
    }
}
window.loadExamPrepDashboardHub = loadExamPrepDashboardHub;
