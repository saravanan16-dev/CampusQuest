/**
 * Practice Arena Controller
 * Handles setup → question flow → submission → review screens
 */

let currentSession = null;
let currentQuestionIndex = 0;
let answersCollected = [];
let questionTimers = [];
let sessionStartTime = null;
let questionStartTime = null;
let timerInterval = null;

document.addEventListener("DOMContentLoaded", async () => {
    Auth.requireAuth();
    await loadSubjects();

    // Check URL params for pre-selection
    const urlParams = new URLSearchParams(window.location.search);
    const subjectId = urlParams.get("subjectId");
    const unit = urlParams.get("unit");

    if (subjectId) {
        document.getElementById("setup-subject").value = subjectId;
    }
    if (unit) {
        document.getElementById("setup-unit").value = unit;
    }

    // Count selector buttons
    document.querySelectorAll(".count-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".count-btn").forEach(b => {
                b.classList.remove("btn-primary", "active");
                b.classList.add("btn-outline-secondary");
            });
            btn.classList.add("btn-primary", "active");
            btn.classList.remove("btn-outline-secondary");
            document.getElementById("setup-count").value = btn.getAttribute("data-count");
        });
    });

    document.getElementById("practice-setup-form").addEventListener("submit", handleStart);
    document.getElementById("next-btn").addEventListener("click", handleNext);
});

async function loadSubjects() {
    try {
        const res = await API.getSubjects();
        if (res.success) {
            const select = document.getElementById("setup-subject");
            res.data.forEach(s => {
                const opt = document.createElement("option");
                opt.value = s.id;
                opt.textContent = `${s.name} (Sem ${s.semester})`;
                select.appendChild(opt);
            });
        }
    } catch (e) {
        console.error("Failed to load subjects:", e);
    }
}

async function handleStart(e) {
    e.preventDefault();

    const subjectId = document.getElementById("setup-subject").value;
    const unit = document.getElementById("setup-unit").value;
    const difficulty = document.getElementById("setup-difficulty").value;
    const count = document.getElementById("setup-count").value;
    const startBtn = document.getElementById("start-btn");
    const errEl = document.getElementById("setup-error");

    errEl.classList.add("d-none");
    startBtn.disabled = true;
    startBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Starting...`;

    try {
        const res = await API.startPractice({
            subject_id: subjectId,
            unit: unit || undefined,
            difficulty: difficulty || undefined,
            count: Number(count)
        });

        if (res.success) {
            currentSession = res.data;
            currentQuestionIndex = 0;
            answersCollected = [];
            questionTimers = [];
            sessionStartTime = Date.now();

            renderQuestion(0);
            showScreen("quiz-screen");
        } else {
            errEl.innerText = res.message || "Failed to start session";
            errEl.classList.remove("d-none");
        }
    } catch (err) {
        errEl.innerText = err.message || "Could not connect to server";
        errEl.classList.remove("d-none");
    } finally {
        startBtn.disabled = false;
        startBtn.innerHTML = `<i class="bi bi-lightning-charge-fill me-1"></i>Start Practice Session`;
    }
}

function renderQuestion(index) {
    const questions = currentSession.questions;
    const q = questions[index];

    // Update progress dots
    const dotsEl = document.getElementById("progress-dots");
    dotsEl.innerHTML = questions.map((_, i) => {
        const state = i < index ? "done" : i === index ? "active" : "";
        return `<div class="progress-step ${state}">${i + 1}</div>`;
    }).join("");

    // Counters
    document.getElementById("current-q-num").innerText = index + 1;
    document.getElementById("total-q-num").innerText = questions.length;

    // Question content
    const diffColors = { EASY: "bg-success-subtle text-success", MEDIUM: "bg-warning-subtle text-warning", HARD: "bg-danger-subtle text-danger" };
    document.getElementById("q-difficulty-badge").className = `badge ${diffColors[q.difficulty] || "bg-secondary-subtle text-secondary"}`;
    document.getElementById("q-difficulty-badge").innerText = q.difficulty;
    document.getElementById("q-topic-badge").innerText = q.topic || "General";
    document.getElementById("question-text").innerText = q.question_text;

    // Options
    const optionsContainer = document.getElementById("options-container");
    optionsContainer.innerHTML = q.options.map(opt => `
        <div class="quiz-option" data-key="${opt.option_key}" onclick="selectOption(this, '${opt.option_key}')">
            <span class="option-badge">${opt.option_key}</span>
            <span>${opt.option_text}</span>
        </div>
    `).join("");

    // Explanation
    document.getElementById("explanation-box").classList.add("d-none");
    document.getElementById("next-btn").disabled = true;
    document.getElementById("next-btn").innerText = index < questions.length - 1 ? "Next Question →" : "Finish & Submit";

    // Timer
    if (timerInterval) clearInterval(timerInterval);
    questionStartTime = Date.now();

    let seconds = 0;
    const timerDisplay = document.getElementById("timer-display");
    timerInterval = setInterval(() => {
        seconds++;
        timerDisplay.innerText = `${seconds}s`;
    }, 1000);
}

function selectOption(el, key) {
    const allOptions = document.querySelectorAll(".quiz-option");
    // Prevent re-selection
    if ([...allOptions].some(o => o.classList.contains("selected") || o.classList.contains("correct") || o.classList.contains("incorrect"))) return;

    allOptions.forEach(o => o.classList.remove("selected"));
    el.classList.add("selected");

    // Record answer & time
    const timeTaken = Math.round((Date.now() - questionStartTime) / 1000);
    questionTimers.push(timeTaken);

    const q = currentSession.questions[currentQuestionIndex];
    answersCollected.push({
        question_id: q.id,
        selected_option: key
    });

    // Update live score
    document.getElementById("next-btn").disabled = false;
}

function handleNext() {
    const questions = currentSession.questions;

    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        renderQuestion(currentQuestionIndex);
    } else {
        if (timerInterval) clearInterval(timerInterval);
        submitPractice();
    }
}

async function submitPractice() {
    const nextBtn = document.getElementById("next-btn");
    nextBtn.disabled = true;
    nextBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Submitting...`;

    const totalSeconds = Math.round((Date.now() - sessionStartTime) / 1000);

    try {
        const res = await API.submitPractice(currentSession.attempt_id, {
            answers: answersCollected,
            time_taken_seconds: totalSeconds
        });

        if (res.success) {
            showResultScreen(res.data);
            showScreen("result-screen");
        } else {
            Auth.showToast(res.message || "Submission failed", "error");
        }
    } catch (err) {
        Auth.showToast(err.message || "Failed to submit", "error");
    }
}

function showResultScreen(data) {
    // Score summary
    const accuracy = data.accuracy;
    const emoji = accuracy >= 90 ? "🏆" : accuracy >= 70 ? "🎯" : accuracy >= 50 ? "👍" : "💪";
    const title = accuracy >= 90 ? "Outstanding!" : accuracy >= 70 ? "Great Job!" : accuracy >= 50 ? "Good Effort!" : "Keep Practicing!";
    const subtitle = `You answered ${data.correct_answers}/${data.total_questions} correctly in this session.`;

    document.getElementById("result-emoji").innerText = emoji;
    document.getElementById("result-title").innerText = title;
    document.getElementById("result-subtitle").innerText = subtitle;
    document.getElementById("res-correct").innerText = data.correct_answers;
    document.getElementById("res-wrong").innerText = data.incorrect_answers;
    document.getElementById("res-accuracy").innerText = `${data.accuracy}%`;
    document.getElementById("res-xp-earned").innerText = `+${data.xp_earned} XP Earned!`;
    document.getElementById("res-total-xp").innerText = `Total: ${data.total_xp} XP | Level ${data.level_info?.level || "--"} (${data.level_info?.title || ""})`;

    // New achievements
    if (data.new_achievements && data.new_achievements.length > 0) {
        const achBox = document.getElementById("new-achievements-box");
        const achList = document.getElementById("new-achievements-list");
        achBox.classList.remove("d-none");
        achList.innerHTML = data.new_achievements.map(a => `
            <div class="badge bg-warning text-dark p-2 d-flex align-items-center gap-1">
                <i class="bi bi-trophy-fill"></i> ${a.title}
            </div>
        `).join("");
    }

    // Detailed answer review
    const container = document.getElementById("result-answers-container");
    container.innerHTML = data.results.map((ans, i) => {
        const isCorrect = ans.is_correct;
        return `
            <div class="border rounded-3 p-3 ${isCorrect ? 'border-success bg-success-subtle' : 'border-danger bg-danger-subtle'}">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <span class="fw-semibold small text-dark">Q${i + 1}: ${ans.topic}</span>
                    <span class="badge ${isCorrect ? 'bg-success' : 'bg-danger'}">${isCorrect ? '✓ Correct' : '✗ Wrong'}</span>
                </div>
                <p class="mb-2 small">${ans.question_text}</p>
                <div class="small">
                    <span class="text-muted">Your answer:</span> <strong class="${isCorrect ? 'text-success' : 'text-danger'}">${ans.selected_option || "Not answered"}</strong>
                    ${!isCorrect ? `&nbsp;|&nbsp; <span class="text-muted">Correct:</span> <strong class="text-success">${ans.correct_answer}</strong>` : ""}
                </div>
                ${ans.explanation ? `<div class="mt-2 small text-muted border-top pt-2"><i class="bi bi-lightbulb-fill text-warning me-1"></i>${ans.explanation}</div>` : ""}
            </div>
        `;
    }).join("");
}

function resetPractice() {
    currentSession = null;
    currentQuestionIndex = 0;
    answersCollected = [];
    if (timerInterval) clearInterval(timerInterval);
    showScreen("setup-screen");
}

function showScreen(id) {
    ["setup-screen", "quiz-screen", "result-screen"].forEach(s => {
        document.getElementById(s).classList.add("d-none");
    });
    document.getElementById(id).classList.remove("d-none");
}

window.selectOption = selectOption;
window.resetPractice = resetPractice;
