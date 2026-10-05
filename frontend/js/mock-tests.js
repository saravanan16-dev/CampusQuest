/**
 * Mock Tests Controller
 * Handles listing, timed exam, submission, and result review
 */

let currentExam = null;
let examAnswers = {};
let examCountdownInterval = null;
let examSecondsLeft = 0;
let examTotalSeconds = 0;

document.addEventListener("DOMContentLoaded", () => {
    Auth.requireAuth();
    loadMockTests();
});

async function loadMockTests() {
    const container = document.getElementById("mock-tests-container");
    try {
        const res = await API.getMockTests();
        if (res.success && res.data.length > 0) {
            container.innerHTML = res.data.map(t => `
                <div class="col-md-6 col-lg-4">
                    <div class="card-cq h-100 p-4 d-flex flex-column">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <span class="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-2.5 py-1">
                                <i class="bi bi-stopwatch me-1"></i>${t.duration_minutes} min
                            </span>
                            <span class="badge bg-secondary-subtle text-secondary border rounded-pill">
                                ${t.question_count || 0} Questions
                            </span>
                        </div>

                        <div class="text-muted small fw-semibold mb-1">${t.subject_name}</div>
                        <h5 class="fw-bold text-dark flex-grow-1 mb-2">${t.title}</h5>

                        ${t.description ? `<p class="text-muted small mb-3">${t.description}</p>` : ''}

                        <div class="d-flex gap-2 justify-content-between text-muted small mb-3 border-top pt-3">
                            <span><i class="bi bi-award me-1 text-primary"></i>Total: <strong>${t.total_marks || t.question_count} marks</strong></span>
                            <span><i class="bi bi-check-circle me-1 text-success"></i>Pass: <strong>${t.passing_marks}</strong></span>
                        </div>

                        <button class="btn btn-primary rounded-pill fw-semibold" onclick="startExam(${t.id}, '${escStr(t.title)}', '${escStr(t.subject_name)}', ${t.duration_minutes})">
                            <i class="bi bi-play-fill me-1"></i>Start Exam
                        </button>
                    </div>
                </div>
            `).join("");
        } else {
            container.innerHTML = `
                <div class="col-12 text-center py-5 text-muted">
                    <i class="bi bi-clipboard2-x fs-1 d-block mb-2 text-secondary"></i>
                    No mock tests available. Admins can create new tests via the Admin Portal.
                </div>
            `;
        }
    } catch (e) {
        container.innerHTML = `<div class="col-12 text-center py-5 text-danger">Failed to load mock tests.</div>`;
    }
}

function escStr(str) {
    return (str || "").replace(/'/g, "\\'");
}

async function startExam(testId, title, subject, durationMinutes) {
    try {
        Auth.showToast("Starting exam session...", "info");
        const res = await API.startMockTest(testId);
        if (!res.success) {
            Auth.showToast(res.message || "Failed to start exam", "error");
            return;
        }

        currentExam = res.data;
        examAnswers = {};

        // Set exam title/subject
        document.getElementById("exam-title").innerText = title;
        document.getElementById("exam-subject").innerText = subject;

        // Render questions
        renderExamQuestions(currentExam.questions);

        // Start countdown timer
        examTotalSeconds = durationMinutes * 60;
        examSecondsLeft = examTotalSeconds;
        startCountdown();

        showView("exam-view");
    } catch (e) {
        Auth.showToast(e.message || "Failed to start exam", "error");
    }
}

function renderExamQuestions(questions) {
    const container = document.getElementById("exam-questions-container");
    container.innerHTML = questions.map((q, i) => `
        <div class="card-cq p-4" id="exam-q-${q.id}">
            <div class="d-flex justify-content-between align-items-start mb-3">
                <span class="fw-bold text-dark">Question ${i + 1}</span>
                <div class="d-flex gap-2">
                    <span class="badge bg-primary-subtle text-primary">${q.topic || "General"}</span>
                    <span class="badge bg-secondary-subtle text-secondary">${q.marks || 1} mark${(q.marks || 1) > 1 ? 's' : ''}</span>
                </div>
            </div>
            <p class="fw-semibold mb-3">${q.question_text}</p>
            <div class="d-flex flex-column gap-2" id="opts-${q.id}">
                ${q.options.map(opt => `
                    <div class="quiz-option" id="opt-${q.id}-${opt.option_key}" onclick="selectExamOption(${q.id}, '${opt.option_key}', this)">
                        <span class="option-badge">${opt.option_key}</span>
                        <span>${opt.option_text}</span>
                    </div>
                `).join("")}
            </div>
        </div>
    `).join("");

    // Update live score display
    document.getElementById("exam-live-score").innerText = `0 / ${questions.length}`;
}

function selectExamOption(questionId, key, el) {
    // Clear previous selection for this question
    const allOpts = document.querySelectorAll(`#opts-${questionId} .quiz-option`);
    allOpts.forEach(o => {
        o.classList.remove("selected");
        o.querySelector(".option-badge").style.background = "";
        o.querySelector(".option-badge").style.color = "";
    });

    el.classList.add("selected");
    examAnswers[questionId] = key;

    // Update live answered count
    const total = currentExam.questions.length;
    const answered = Object.keys(examAnswers).length;
    document.getElementById("exam-live-score").innerText = `${answered} / ${total} answered`;
}

function startCountdown() {
    if (examCountdownInterval) clearInterval(examCountdownInterval);

    const display = document.getElementById("countdown-display");

    examCountdownInterval = setInterval(() => {
        examSecondsLeft--;

        const mins = Math.floor(examSecondsLeft / 60).toString().padStart(2, "0");
        const secs = (examSecondsLeft % 60).toString().padStart(2, "0");
        display.innerText = `${mins}:${secs}`;

        const pct = Math.round((examSecondsLeft / examTotalSeconds) * 100);
        const color = pct > 50 ? "#4f46e5" : pct > 20 ? "#f59e0b" : "#ef4444";
        display.style.setProperty("--pct", `${pct}%`);
        display.style.background = `conic-gradient(${color} ${pct}%, #f3f4f6 0%)`;

        if (examSecondsLeft <= 0) {
            clearInterval(examCountdownInterval);
            Auth.showToast("⏰ Time is up! Submitting your exam...", "warning");
            submitExam();
        }
    }, 1000);
}

async function submitExam() {
    if (examCountdownInterval) clearInterval(examCountdownInterval);

    const submitBtn = document.getElementById("submit-exam-btn");
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Submitting...`;

    const answersArray = Object.entries(examAnswers).map(([qId, opt]) => ({
        question_id: Number(qId),
        selected_option: opt
    }));

    try {
        const res = await API.submitMockTest(currentExam.attempt_id, { answers: answersArray });
        if (res.success) {
            showExamResult(res.data);
            showView("result-view");
        } else {
            Auth.showToast(res.message || "Submission failed", "error");
        }
    } catch (e) {
        Auth.showToast(e.message || "Failed to submit exam", "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="bi bi-send-check-fill me-2"></i>Submit Examination`;
    }
}

function showExamResult(data) {
    const passed = data.passed;
    document.getElementById("exam-result-emoji").innerText = passed ? "🎓" : "📚";
    document.getElementById("exam-result-title").innerText = passed ? "Congratulations! Passed!" : "Assessment Complete — Keep Going!";
    document.getElementById("exam-result-subtitle").innerText = `${data.test_title} • ${data.subject_name}`;
    document.getElementById("exam-res-score").innerText = `${data.score}/${data.total_marks}`;
    document.getElementById("exam-res-correct").innerText = data.correct_count;
    document.getElementById("exam-res-percentage").innerText = `${data.percentage}%`;

    const statusEl = document.getElementById("exam-res-status");
    statusEl.innerText = passed ? "PASS ✓" : "FAIL";
    statusEl.className = `fs-2 fw-bold ${passed ? "text-success" : "text-danger"}`;

    document.getElementById("exam-xp-earned").innerText = `+${data.xp_earned} XP Earned!`;

    if (data.new_achievements && data.new_achievements.length > 0) {
        document.getElementById("exam-new-ach-box").classList.remove("d-none");
        document.getElementById("exam-new-ach-list").innerHTML = data.new_achievements.map(a =>
            `<span class="badge bg-warning text-dark p-2"><i class="bi bi-trophy-fill me-1"></i>${a.title}</span>`
        ).join("");
    }

    // Answer review
    const container = document.getElementById("exam-answers-container");
    container.innerHTML = (data.answers || []).map((ans, i) => {
        const isCorrect = ans.is_correct;
        return `
            <div class="border rounded-3 p-3 ${isCorrect ? 'border-success bg-success-subtle' : 'border-danger bg-danger-subtle'}">
                <div class="d-flex justify-content-between mb-2">
                    <span class="fw-semibold small text-dark">Q${i + 1}: ${ans.topic || "General"}</span>
                    <span class="badge ${isCorrect ? 'bg-success' : 'bg-danger'}">${isCorrect ? `✓ +${ans.marks_awarded || 0}` : '✗ 0'} marks</span>
                </div>
                <p class="small mb-2">${ans.question_text}</p>
                <div class="small">
                    Your: <strong class="${isCorrect ? 'text-success' : 'text-danger'}">${ans.selected_option || "Not answered"}</strong>
                    ${!isCorrect ? ` | Correct: <strong class="text-success">${ans.correct_answer}</strong>` : ""}
                </div>
                ${ans.explanation ? `<div class="text-muted small mt-2 border-top pt-2"><i class="bi bi-lightbulb-fill text-warning me-1"></i>${ans.explanation}</div>` : ""}
            </div>
        `;
    }).join("");
}

function showView(id) {
    ["list-view", "exam-view", "result-view"].forEach(v => {
        document.getElementById(v).classList.add("d-none");
    });
    document.getElementById(id).classList.remove("d-none");
}

window.startExam = startExam;
window.selectExamOption = selectExamOption;
window.submitExam = submitExam;
window.showView = showView;
window.loadMockTests = loadMockTests;
