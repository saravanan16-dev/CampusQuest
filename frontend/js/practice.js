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
    const subjectId = urlParams.get("subjectId") || urlParams.get("subject_id");
    const unitId = urlParams.get("unitId") || urlParams.get("unit_id");
    const unit = urlParams.get("unit");
    const diff = urlParams.get("difficulty");

    if (subjectId) {
        document.getElementById("setup-subject").value = subjectId;
        await loadUnits(subjectId);
        if (unitId) {
            document.getElementById("setup-unit").value = unitId;
        } else if (unit) {
            // Find option matching unit number
            const opts = document.getElementById("setup-unit").options;
            for (let i = 0; i < opts.length; i++) {
                if (opts[i].dataset.unitNumber === String(unit)) {
                    document.getElementById("setup-unit").selectedIndex = i;
                    break;
                }
            }
        }
    }
    if (diff) {
        document.getElementById("setup-difficulty").value = diff.toUpperCase();
    }

    // Dynamic unit loading on subject change
    document.getElementById("setup-subject").addEventListener("change", async (e) => {
        await loadUnits(e.target.value);
    });

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

async function loadUnits(subjectId) {
    const select = document.getElementById("setup-unit");
    if (!subjectId) {
        select.innerHTML = `<option value="">All Units</option>`;
        return;
    }

    try {
        const res = await API.getUnitsBySubject(subjectId);
        if (res.success && res.data.length > 0) {
            select.innerHTML = `<option value="">All Units</option>`;
            res.data.forEach(u => {
                const opt = document.createElement("option");
                opt.value = u.id;
                opt.dataset.unitNumber = u.unit_number;
                opt.textContent = `Unit ${u.unit_number}: ${u.name}`;
                select.appendChild(opt);
            });
        }
    } catch (e) {
        console.error("Failed to load units:", e);
    }
}

async function handleStart(e) {
    e.preventDefault();

    const subjectId = document.getElementById("setup-subject").value;
    const unitSelect = document.getElementById("setup-unit");
    const selectedUnitOpt = unitSelect.selectedOptions[0];
    const unitId = selectedUnitOpt ? selectedUnitOpt.value : "";
    const unitNum = selectedUnitOpt ? selectedUnitOpt.dataset.unitNumber : "";
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
            unit_id: unitId || undefined,
            unit: unitNum || undefined,
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
    document.getElementById("q-difficulty-badge").className = `badge ${diffColors[q.difficulty?.toUpperCase()] || "bg-secondary-subtle text-secondary"}`;
    document.getElementById("q-difficulty-badge").innerText = q.difficulty;
    document.getElementById("q-topic-badge").innerText = q.topic || "General";
    document.getElementById("question-text").innerText = q.question || q.question_text;

    // Options
    const defaultKeys = ["A", "B", "C", "D", "E", "F"];
    const optionsContainer = document.getElementById("options-container");
    optionsContainer.innerHTML = (q.options || []).map((opt, optIdx) => {
        const key = opt.option_key || defaultKeys[optIdx];
        const optId = opt.id || "";
        return `
            <div class="quiz-option" data-key="${key}" data-id="${optId}" onclick="selectOption(this, '${key}', '${optId}')">
                <span class="option-badge">${key}</span>
                <span>${opt.option_text}</span>
            </div>
        `;
    }).join("");

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

function selectOption(el, key, optId) {
    const allOptions = document.querySelectorAll(".quiz-option");
    if ([...allOptions].some(o => o.classList.contains("selected"))) return;

    allOptions.forEach(o => o.classList.remove("selected"));
    el.classList.add("selected");

    const timeTaken = Math.round((Date.now() - questionStartTime) / 1000);
    questionTimers.push(timeTaken);

    const q = currentSession.questions[currentQuestionIndex];
    answersCollected.push({
        question_id: q.id,
        selected_option_id: optId ? Number(optId) : undefined,
        selected_option: key
    });

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
    const attemptId = currentSession.attempt_id || currentSession.id;

    try {
        const res = await API.submitPractice(attemptId, {
            answers: answersCollected,
            time_taken_seconds: totalSeconds
        });

        if (res.success) {
            // Option to redirect to result.html or show inline
            window.location.href = `result.html?attempt_id=${attemptId}`;
        } else {
            Auth.showToast(res.message || "Submission failed", "error");
            nextBtn.disabled = false;
            nextBtn.innerText = "Finish & Submit";
        }
    } catch (err) {
        Auth.showToast(err.message || "Failed to submit", "error");
        nextBtn.disabled = false;
        nextBtn.innerText = "Finish & Submit";
    }
}

function showScreen(id) {
    ["setup-screen", "quiz-screen", "result-screen"].forEach(s => {
        const el = document.getElementById(s);
        if (el) el.classList.add("d-none");
    });
    const target = document.getElementById(id);
    if (target) target.classList.remove("d-none");
}

function resetPractice() {
    currentSession = null;
    currentQuestionIndex = 0;
    answersCollected = [];
    if (timerInterval) clearInterval(timerInterval);
    showScreen("setup-screen");
}

window.selectOption = selectOption;
window.resetPractice = resetPractice;
