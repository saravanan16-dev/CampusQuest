/**
 * Timed Mock Tests Controller (Phase 4)
 * Handles listing, countdown timer, auto-submission, exact Section 8 scorecard, review, and history
 */

let currentExam = null;
let currentExamStartTime = 0;
let examAnswers = {};
let examCountdownInterval = null;
let examSecondsLeft = 0;
let examTotalSeconds = 0;

document.addEventListener("DOMContentLoaded", async () => {
    Auth.requireAuth();

    await loadSubjectFilter();
    await loadMockTests();

    // Check URL parameters (e.g. ?start=1 or ?subject_id=...)
    const urlParams = new URLSearchParams(window.location.search);
    const startId = urlParams.get("start") || urlParams.get("id");
    const subjectId = urlParams.get("subject_id") || urlParams.get("subjectId");

    if (subjectId) {
        document.getElementById("mock-subject-filter").value = subjectId;
        await loadMockTests();
    }

    if (startId) {
        startExam(startId);
    }

    document.getElementById("mock-subject-filter").addEventListener("change", loadMockTests);

    document.getElementById("create-mock-test-form").addEventListener("submit", handleCreateMockTest);
});

async function loadSubjectFilter() {
    try {
        const res = await API.getSubjects();
        if (res.success) {
            const select = document.getElementById("mock-subject-filter");
            const modalSelect = document.getElementById("modal-mock-subject");
            res.data.forEach(s => {
                const opt1 = document.createElement("option");
                opt1.value = s.id;
                opt1.textContent = s.name;
                select.appendChild(opt1);

                const opt2 = document.createElement("option");
                opt2.value = s.id;
                opt2.textContent = s.name;
                modalSelect.appendChild(opt2);
            });
        }
    } catch (e) {
        console.error("Failed to load subjects:", e);
    }
}

async function loadMockTests() {
    const container = document.getElementById("mock-tests-container");
    const countText = document.getElementById("tests-count-text");
    const subjectId = document.getElementById("mock-subject-filter").value;

    container.innerHTML = `<div class="col-12 text-center py-5 text-muted"><div class="spinner-border text-primary" role="status"></div><div class="mt-2">Loading examinations...</div></div>`;

    try {
        const res = await API.getMockTests(subjectId);
        if (res.success) {
            const tests = res.data;
            countText.innerText = `Showing ${tests.length} mock examination test(s)`;

            if (tests.length === 0) {
                container.innerHTML = `
                    <div class="col-12 text-center py-5 text-muted bg-white rounded-3 border">
                        <i class="bi bi-clipboard2-x fs-1 d-block mb-2 text-secondary"></i>
                        <h5>No Mock Tests Found</h5>
                        <p class="small text-muted mb-3">No tests available for the selected subject. Create a new test to begin!</p>
                        <button class="btn btn-outline-primary rounded-pill px-4" data-bs-toggle="modal" data-bs-target="#createMockTestModal">
                            <i class="bi bi-plus-circle me-1"></i>Create Mock Test
                        </button>
                    </div>
                `;
                return;
            }

            container.innerHTML = tests.map(t => {
                const duration = t.duration || t.duration_minutes || 30;
                const totalQ = t.total_questions || t.question_count || 0;
                const totalM = t.total_marks || totalQ;

                return `
                    <div class="col-md-6 col-lg-4">
                        <div class="card-cq h-100 p-4 d-flex flex-column shadow-sm">
                            <div class="d-flex justify-content-between align-items-start mb-3">
                                <span class="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-3 py-1">
                                    <i class="bi bi-clock me-1"></i>${duration} Mins
                                </span>
                                <span class="badge bg-secondary-subtle text-secondary border rounded-pill">
                                    ${totalQ} Questions
                                </span>
                            </div>

                            <div class="text-muted small fw-semibold mb-1">${t.subject_name}</div>
                            <h5 class="fw-bold text-dark flex-grow-1 mb-2">${t.title}</h5>

                            ${t.description ? `<p class="text-muted small mb-3 lh-sm">${t.description}</p>` : ''}

                            <div class="d-flex gap-2 justify-content-between text-muted small mb-3 border-top pt-3">
                                <span><i class="bi bi-award me-1 text-primary"></i>Total: <strong>${totalM} marks</strong></span>
                                <span><i class="bi bi-check-circle me-1 text-success"></i>Pass: <strong>${t.passing_marks || Math.ceil(totalM * 0.4)}</strong></span>
                            </div>

                            <button class="btn btn-primary rounded-pill fw-semibold py-2" onclick="startExam(${t.id})">
                                <i class="bi bi-play-fill me-1"></i>Start Exam
                            </button>
                        </div>
                    </div>
                `;
            }).join("");
        }
    } catch (e) {
        container.innerHTML = `<div class="col-12 text-center py-5 text-danger">Failed to load mock tests: ${e.message}</div>`;
    }
}

async function startExam(testId) {
    try {
        Auth.showToast("Starting timed examination session...", "info");
        const res = await API.startMockTest(testId);
        if (!res.success) {
            Auth.showToast(res.message || "Failed to start exam", "error");
            return;
        }

        currentExam = res.data;
        examAnswers = {};
        currentExamStartTime = Date.now();

        const testMeta = currentExam.mock_test;
        document.getElementById("exam-title").innerText = testMeta.title;
        document.getElementById("exam-subject").innerText = `${testMeta.subject_name} • ${testMeta.total_marks} Marks`;

        // Render exam questions
        renderExamQuestions(currentExam.questions);

        // Setup timer
        const durationMinutes = testMeta.duration || testMeta.duration_minutes || 30;
        examTotalSeconds = durationMinutes * 60;
        examSecondsLeft = examTotalSeconds;
        startCountdown();

        showView("exam-view");
        window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e) {
        Auth.showToast(e.message || "Failed to start exam", "error");
    }
}

function renderExamQuestions(questions) {
    const container = document.getElementById("exam-questions-container");
    container.innerHTML = questions.map((q, i) => `
        <div class="card p-4 border-0 shadow-sm rounded-4 bg-white" id="exam-q-${q.id}">
            <div class="d-flex justify-content-between align-items-start mb-3">
                <span class="badge bg-dark text-white rounded-pill px-3 py-1">Question ${i + 1}</span>
                <div class="d-flex gap-2">
                    <span class="badge bg-primary-subtle text-primary border rounded-pill">${q.topic || "Exam Topic"}</span>
                    <span class="badge bg-secondary-subtle text-secondary border rounded-pill">${q.marks || 1} Mark${(q.marks || 1) > 1 ? 's' : ''}</span>
                </div>
            </div>
            <p class="fw-semibold text-dark fs-5 mb-3">${q.question || q.question_text}</p>
            <div class="d-flex flex-column gap-2" id="opts-${q.id}">
                ${(q.options || []).map(opt => `
                    <div class="quiz-option" id="opt-${q.id}-${opt.id || opt.option_key}" onclick="selectExamOption(${q.id}, ${opt.id}, '${opt.option_key}', this)">
                        <span class="option-badge">${opt.option_key}</span>
                        <span>${opt.option_text}</span>
                    </div>
                `).join("")}
            </div>
        </div>
    `).join("");

    updateLiveAnsweredCounter();
}

function selectExamOption(questionId, optionId, optionKey, el) {
    const allOpts = document.querySelectorAll(`#opts-${questionId} .quiz-option`);
    allOpts.forEach(o => o.classList.remove("selected"));

    el.classList.add("selected");
    examAnswers[questionId] = {
        question_id: questionId,
        selected_option_id: optionId,
        selected_option: optionKey
    };

    updateLiveAnsweredCounter();
}

function updateLiveAnsweredCounter() {
    const total = currentExam ? currentExam.questions.length : 0;
    const answered = Object.keys(examAnswers).length;
    document.getElementById("exam-live-counter").innerText = `${answered} / ${total}`;
}

function startCountdown() {
    if (examCountdownInterval) clearInterval(examCountdownInterval);

    const display = document.getElementById("countdown-display");
    updateTimerDisplay(display, examSecondsLeft);

    examCountdownInterval = setInterval(() => {
        examSecondsLeft--;
        updateTimerDisplay(display, examSecondsLeft);

        if (examSecondsLeft <= 120) {
            display.classList.add("urgent");
        } else {
            display.classList.remove("urgent");
        }

        if (examSecondsLeft <= 0) {
            clearInterval(examCountdownInterval);
            Auth.showToast("⏰ Time's up! Automatically submitting examination...", "warning");
            submitExam();
        }
    }, 1000);
}

function updateTimerDisplay(el, seconds) {
    const safeSec = Math.max(0, seconds);
    const mins = Math.floor(safeSec / 60).toString().padStart(2, "0");
    const secs = (safeSec % 60).toString().padStart(2, "0");
    el.innerText = `${mins}:${secs}`;
}

async function submitExam() {
    if (examCountdownInterval) clearInterval(examCountdownInterval);

    const submitBtn = document.getElementById("submit-exam-btn");
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Submitting...`;

    const answersPayload = Object.values(examAnswers);
    const timeUsedSeconds = Math.max(1, Math.round((Date.now() - currentExamStartTime) / 1000));

    try {
        const attemptId = currentExam.attempt_id || currentExam.id;
        const res = await API.submitMockTest(attemptId, {
            answers: answersPayload,
            time_used_seconds: timeUsedSeconds
        });

        if (res.success) {
            showExamResult(res.data);
            showView("result-view");
            window.scrollTo({ top: 0, behavior: "smooth" });
        } else {
            Auth.showToast(res.message || "Submission failed", "error");
        }
    } catch (e) {
        Auth.showToast(e.message || "Failed to submit exam", "error");
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `<i class="bi bi-send-check-fill me-2"></i>Submit Test`;
    }
}

function showExamResult(data) {
    // Phase 4 Section 8 scorecard rendering
    document.getElementById("exam-res-score").innerText = `${data.score} / ${data.total_marks}`;
    document.getElementById("exam-res-percentage").innerText = `${data.percentage}%`;
    document.getElementById("exam-res-correct").innerText = data.correct_answers !== undefined ? data.correct_answers : data.correct_count;
    document.getElementById("exam-res-wrong").innerText = data.wrong_answers !== undefined ? data.wrong_answers : 0;
    document.getElementById("exam-res-unanswered").innerText = data.unanswered !== undefined ? data.unanswered : 0;
    document.getElementById("exam-res-time").innerText = data.time_used_formatted || "00:00";

    const reviewItems = data.review || data.answers || [];
    document.getElementById("review-count-badge").innerText = `${reviewItems.length} Questions Evaluated`;

    // Phase 4 Section 10 Detailed Answer Review
    const container = document.getElementById("exam-answers-container");
    container.innerHTML = reviewItems.map((ans, i) => {
        const isCorrect = ans.is_correct;
        const yourAns = ans.your_answer || ans.selected_option || "Not Answered";
        const correctAns = ans.correct_answer_text || ans.correct_answer;
        const borderClass = isCorrect ? "border-success bg-success-subtle" : (yourAns === "Not Answered" ? "border-secondary bg-light" : "border-danger bg-danger-subtle");

        return `
            <div class="border rounded-3 p-4 ${borderClass}">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="fw-bold text-dark">Q${i + 1}: ${ans.topic || "Question"}</span>
                    <span class="badge ${isCorrect ? 'bg-success' : 'bg-danger'} rounded-pill px-3 py-1">
                        ${isCorrect ? `✓ +${ans.marks_awarded || ans.marks || 1}` : '✗ 0'} / ${ans.marks || 1} Marks
                    </span>
                </div>
                <p class="fw-semibold text-dark mb-3">${ans.question || ans.question_text}</p>
                <div class="d-flex flex-column gap-1 small mb-2">
                    <div>Your Answer: <strong class="${isCorrect ? 'text-success' : (yourAns === 'Not Answered' ? 'text-muted' : 'text-danger')}">${yourAns}</strong></div>
                    ${!isCorrect ? `<div>Correct Answer: <strong class="text-success">${correctAns}</strong></div>` : ''}
                </div>
                ${ans.explanation ? `
                    <div class="small text-muted mt-2 pt-2 border-top">
                        <i class="bi bi-lightbulb-fill text-warning me-1"></i><strong>Explanation:</strong> ${ans.explanation}
                    </div>
                ` : ''}
            </div>
        `;
    }).join("");
}

function scrollToReview() {
    document.getElementById("test-review-section").scrollIntoView({ behavior: "smooth" });
}

function tryAgainCurrentTest() {
    if (currentExam && currentExam.mock_test) {
        startExam(currentExam.mock_test.id);
    } else {
        showView("list-view");
        loadMockTests();
    }
}

async function openHistoryModal() {
    const modalEl = document.getElementById("historyModal");
    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    const tbody = document.getElementById("history-table-body");
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted"><div class="spinner-border spinner-border-sm text-primary me-2"></div>Loading test history...</td></tr>`;

    try {
        const res = await API.getMockTestHistory();
        if (res.success && res.data.length > 0) {
            tbody.innerHTML = res.data.map(h => `
                <tr>
                    <td class="fw-semibold text-dark">${h.test_title || "Mock Test"}</td>
                    <td><span class="badge bg-primary-subtle text-primary border">${h.subject_name || "General"}</span></td>
                    <td class="fw-bold">${h.score} / ${h.total_marks}</td>
                    <td><span class="badge ${h.percentage >= 50 ? 'bg-success' : 'bg-danger'}">${h.percentage}%</span></td>
                    <td><i class="bi bi-clock me-1 text-muted"></i>${h.time_used_formatted || `${h.time_used_seconds || 0}s`}</td>
                    <td class="small text-muted">${new Date(h.completed_at || h.started_at).toLocaleDateString()}</td>
                </tr>
            `).join("");
        } else {
            tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">No test attempts recorded yet. Take your first test!</td></tr>`;
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-danger">Failed to load test history.</td></tr>`;
    }
}

async function handleCreateMockTest(e) {
    e.preventDefault();
    const title = document.getElementById("modal-mock-title").value;
    const subjectId = document.getElementById("modal-mock-subject").value;
    const duration = document.getElementById("modal-mock-duration").value;
    const count = document.getElementById("modal-mock-count").value;
    const desc = document.getElementById("modal-mock-desc").value;
    const saveBtn = document.getElementById("modal-mock-save-btn");
    const errEl = document.getElementById("modal-mock-error");

    errEl.classList.add("d-none");
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Creating...`;

    try {
        const res = await API.createMockTest({
            title,
            subject_id: subjectId,
            duration: Number(duration),
            total_questions: Number(count),
            total_marks: Number(count),
            description: desc
        });

        if (res.success) {
            const modalEl = document.getElementById("createMockTestModal");
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();

            document.getElementById("create-mock-test-form").reset();
            Auth.showToast("Mock test created successfully!", "success");
            await loadMockTests();
        } else {
            errEl.innerText = res.message || "Failed to create mock test";
            errEl.classList.remove("d-none");
        }
    } catch (err) {
        errEl.innerText = err.message || "An error occurred";
        errEl.classList.remove("d-none");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = "Create Test";
    }
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
window.scrollToReview = scrollToReview;
window.tryAgainCurrentTest = tryAgainCurrentTest;
window.openHistoryModal = openHistoryModal;
