/**
 * AI Study Buddy & Exam Intelligence Controller
 */

document.addEventListener("DOMContentLoaded", async () => {
    Auth.requireAuth();

    await loadAIRecommendations();
    await loadSubjectsDropdown();

    // Check if subjectId passed in URL
    const urlParams = new URLSearchParams(window.location.search);
    const subjectId = urlParams.get("subjectId");
    if (subjectId) {
        // Activate exam intelligence tab
        const examTabTrigger = document.querySelector('#tab-exam');
        if (examTabTrigger) {
            const tab = new bootstrap.Tab(examTabTrigger);
            tab.show();
            document.getElementById("exam-subject-select").value = subjectId;
            runExamIntelligence();
        }
    }

    document.getElementById("concept-form").addEventListener("submit", handleConceptExplain);
});

async function loadAIRecommendations() {
    try {
        const res = await API.getAIRecommendations();
        if (res.success) {
            const data = res.data;

            document.getElementById("ai-advice-display").innerText = data.advice;

            // Weak topics
            const weakContainer = document.getElementById("rec-weak-topics");
            if (data.focus_areas && data.focus_areas.length > 0) {
                weakContainer.innerHTML = data.focus_areas.map(w => `
                    <div class="p-2 rounded bg-danger-subtle border border-danger-subtle small">
                        <div class="fw-bold text-dark">${w.topic}</div>
                        <div class="text-muted" style="font-size: 0.75rem;">${w.subject} · Unit ${w.unit}</div>
                        <span class="badge bg-danger mt-1">${w.current_accuracy} accuracy</span>
                    </div>
                `).join("");
            } else {
                weakContainer.innerHTML = `<div class="text-success small fw-semibold p-2 bg-success-subtle rounded">No critical weak areas identified!</div>`;
            }

            // Recommended Notes
            const notesContainer = document.getElementById("rec-notes");
            if (data.recommended_notes && data.recommended_notes.length > 0) {
                notesContainer.innerHTML = data.recommended_notes.map(n => `
                    <div class="p-2 rounded bg-light border small">
                        <div class="fw-bold text-dark text-truncate">${n.title}</div>
                        <div class="text-muted" style="font-size: 0.75rem;">${n.subject_name} · Unit ${n.unit}</div>
                        <a href="notes.html?id=${n.id}" class="text-primary text-decoration-none fw-semibold d-inline-block mt-1">Read Note &rarr;</a>
                    </div>
                `).join("");
            } else {
                notesContainer.innerHTML = `<div class="text-muted small">No specific notes recommended at this time.</div>`;
            }

            // Recommended Tests
            const testsContainer = document.getElementById("rec-tests");
            if (data.recommended_tests && data.recommended_tests.length > 0) {
                testsContainer.innerHTML = data.recommended_tests.map(t => `
                    <div class="p-2 rounded bg-light border small">
                        <div class="fw-bold text-dark">${t.title}</div>
                        <div class="text-muted" style="font-size: 0.75rem;">${t.subject_name} · ${t.duration_minutes} mins</div>
                        <a href="mock-tests.html" class="text-success text-decoration-none fw-semibold d-inline-block mt-1">Start Assessment &rarr;</a>
                    </div>
                `).join("");
            } else {
                testsContainer.innerHTML = `<div class="text-muted small">All mock tests up to date!</div>`;
            }
        }
    } catch (e) {
        console.error("Failed to load recommendations:", e);
    }
}

async function handleConceptExplain(e) {
    e.preventDefault();
    const concept = document.getElementById("concept-input").value.trim();
    const subject = document.getElementById("subject-input").value.trim();
    const btn = document.getElementById("concept-btn");

    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Analyzing concept...`;

    try {
        const res = await API.explainConcept(concept, subject);
        if (res.success) {
            renderConceptOutput(res.data);
        } else {
            Auth.showToast(res.message || "Failed to explain concept", "error");
        }
    } catch (err) {
        Auth.showToast("Could not generate explanation", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="bi bi-magic me-1"></i>Generate Explanation`;
    }
}

function quickConcept(concept, subject) {
    document.getElementById("concept-input").value = concept;
    document.getElementById("subject-input").value = subject;
    document.getElementById("concept-form").dispatchEvent(new Event("submit"));
}
window.quickConcept = quickConcept;

function renderConceptOutput(data) {
    document.getElementById("concept-placeholder").classList.add("d-none");
    const resBox = document.getElementById("concept-results");
    resBox.classList.remove("d-none");

    document.getElementById("concept-title").innerText = data.concept;
    document.getElementById("concept-def").innerText = data.definition;

    const pointsList = document.getElementById("concept-points");
    pointsList.innerHTML = (data.key_points || []).map(pt => `<li>${pt}</li>`).join("");

    document.getElementById("concept-example").innerText = data.example || "Practical industry example.";
    document.getElementById("concept-tip").innerText = data.exam_tip || "Highlight key definitions and formulas in exam answers.";
}

async function loadSubjectsDropdown() {
    try {
        const res = await API.getSubjects();
        if (res.success) {
            const select = document.getElementById("exam-subject-select");
            res.data.forEach(s => {
                const opt = document.createElement("option");
                opt.value = s.id;
                opt.textContent = `${s.name} (Semester ${s.semester})`;
                select.appendChild(opt);
            });
        }
    } catch (e) {
        console.error("Failed to load subjects for exam intelligence:", e);
    }
}

async function runExamIntelligence() {
    const subjectId = document.getElementById("exam-subject-select").value;
    if (!subjectId) {
        Auth.showToast("Please choose a subject first", "warning");
        return;
    }

    try {
        const res = await API.getExamIntelligence(subjectId);
        if (res.success) {
            const data = res.data;
            document.getElementById("exam-intel-results").classList.remove("d-none");

            // Revision priorities
            const prioritiesContainer = document.getElementById("intel-priorities");
            prioritiesContainer.innerHTML = (data.revision_priorities || []).map(p => `
                <div class="d-flex justify-content-between align-items-center p-2 rounded bg-light border">
                    <div>
                        <div class="fw-bold small text-dark">${p.topic}</div>
                        <div class="text-muted" style="font-size: 0.72rem;">Unit ${p.unit} · Expected: ${p.expected_marks_range}</div>
                    </div>
                    <span class="badge ${p.priority.includes('High') ? 'bg-danger' : 'bg-warning text-dark'} rounded-pill">
                        ${p.priority}
                    </span>
                </div>
            `).join("");

            // Important units
            const unitsContainer = document.getElementById("intel-units");
            unitsContainer.innerHTML = (data.important_units || []).map(u => `
                <div class="p-2 rounded bg-light border">
                    <div class="d-flex justify-content-between small fw-semibold text-dark mb-1">
                        <span>Unit ${u.unit}: ${u.name}</span>
                        <span class="text-primary">${u.weightage}</span>
                    </div>
                    <div class="progress" style="height: 6px;">
                        <div class="progress-bar bg-primary" style="width: ${u.weightage}"></div>
                    </div>
                </div>
            `).join("");

            // Tips
            const tipsContainer = document.getElementById("intel-tips");
            tipsContainer.innerHTML = (data.practice_priorities || []).map(tip => `<li>${tip}</li>`).join("");

            document.getElementById("intel-disclaimer").innerText = data.disclaimer;
        }
    } catch (e) {
        Auth.showToast("Failed to fetch exam intelligence", "error");
    }
}
window.runExamIntelligence = runExamIntelligence;
