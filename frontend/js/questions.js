/**
 * Question Bank Controller (Phase 3)
 * Handles question filtering, viewing, answer toggles, and question creation
 */

let allSubjects = [];
let allQuestions = [];

document.addEventListener("DOMContentLoaded", async () => {
    Auth.requireAuth();

    await loadSubjects();

    // Check URL parameters for preset filters
    const urlParams = new URLSearchParams(window.location.search);
    const subjectId = urlParams.get("subject_id") || urlParams.get("subjectId");
    const unitId = urlParams.get("unit_id") || urlParams.get("unitId");
    const difficulty = urlParams.get("difficulty");

    if (subjectId) {
        document.getElementById("filter-subject").value = subjectId;
        await loadUnitsForSubject(subjectId, "filter-unit");
        if (unitId) {
            document.getElementById("filter-unit").value = unitId;
        }
    }
    if (difficulty) {
        document.getElementById("filter-difficulty").value = difficulty.toLowerCase();
    }

    // Event listeners for filters
    document.getElementById("filter-subject").addEventListener("change", async (e) => {
        const subId = e.target.value;
        await loadUnitsForSubject(subId, "filter-unit");
    });

    document.getElementById("apply-filters-btn").addEventListener("click", () => {
        loadQuestions();
    });

    document.getElementById("reset-filters-btn").addEventListener("click", async () => {
        document.getElementById("filter-subject").value = "";
        const unitSelect = document.getElementById("filter-unit");
        unitSelect.innerHTML = `<option value="">All Units</option>`;
        unitSelect.disabled = true;
        document.getElementById("filter-difficulty").value = "";
        await loadQuestions();
    });

    // Start practice with selected filters
    document.getElementById("start-practice-btn").addEventListener("click", () => {
        const subId = document.getElementById("filter-subject").value;
        const uId = document.getElementById("filter-unit").value;
        const diff = document.getElementById("filter-difficulty").value;
        let url = "practice.html";
        const params = new URLSearchParams();
        if (subId) params.append("subjectId", subId);
        if (uId) params.append("unitId", uId);
        if (diff) params.append("difficulty", diff);
        if (params.toString()) url += `?${params.toString()}`;
        window.location.href = url;
    });

    // Toggle all answers switch
    document.getElementById("toggle-all-answers").addEventListener("change", (e) => {
        const reveal = e.target.checked;
        document.querySelectorAll(".answer-details").forEach(el => {
            if (reveal) el.classList.remove("d-none");
            else el.classList.add("d-none");
        });
        document.querySelectorAll(".option-item").forEach(el => {
            if (el.dataset.isCorrect === "true") {
                if (reveal) el.classList.add("correct");
                else el.classList.remove("correct");
            }
        });
    });

    // Modal subject change
    document.getElementById("modal-subject").addEventListener("change", async (e) => {
        const subId = e.target.value;
        await loadUnitsForSubject(subId, "modal-unit");
    });

    // Modal form submission
    document.getElementById("create-question-form").addEventListener("submit", handleCreateQuestion);

    // Initial questions load
    await loadQuestions();
});

async function loadSubjects() {
    try {
        const res = await API.getSubjects();
        if (res.success) {
            allSubjects = res.data;
            const filterSelect = document.getElementById("filter-subject");
            const modalSelect = document.getElementById("modal-subject");

            allSubjects.forEach(s => {
                const opt1 = document.createElement("option");
                opt1.value = s.id;
                opt1.textContent = `${s.name} (Sem ${s.semester})`;
                filterSelect.appendChild(opt1);

                const opt2 = document.createElement("option");
                opt2.value = s.id;
                opt2.textContent = `${s.name} (Sem ${s.semester})`;
                modalSelect.appendChild(opt2);
            });
        }
    } catch (e) {
        console.error("Failed to load subjects:", e);
    }
}

async function loadUnitsForSubject(subjectId, targetSelectId) {
    const select = document.getElementById(targetSelectId);
    if (!subjectId) {
        select.innerHTML = `<option value="">${targetSelectId === 'filter-unit' ? 'All Units' : '-- Select Subject First --'}</option>`;
        select.disabled = true;
        return;
    }

    try {
        const res = await API.getUnitsBySubject(subjectId);
        if (res.success) {
            select.innerHTML = targetSelectId === 'filter-unit' ? `<option value="">All Units</option>` : `<option value="">-- Choose Unit --</option>`;
            res.data.forEach(u => {
                const opt = document.createElement("option");
                opt.value = u.id;
                opt.textContent = `Unit ${u.unit_number}: ${u.name}`;
                select.appendChild(opt);
            });
            select.disabled = false;
        }
    } catch (e) {
        console.error("Failed to load units:", e);
    }
}

async function loadQuestions() {
    const container = document.getElementById("questions-container");
    const countText = document.getElementById("questions-count-text");
    const emptyState = document.getElementById("empty-state");

    container.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div></div>`;
    emptyState.classList.add("d-none");

    const subjectId = document.getElementById("filter-subject").value;
    const unitId = document.getElementById("filter-unit").value;
    const difficulty = document.getElementById("filter-difficulty").value;

    const filters = {};
    if (subjectId) filters.subject_id = subjectId;
    if (unitId) filters.unit_id = unitId;
    if (difficulty) filters.difficulty = difficulty;

    try {
        const res = await API.getQuestions(filters);
        if (res.success) {
            allQuestions = res.data;
            countText.innerText = `Showing ${allQuestions.length} question(s)`;

            if (allQuestions.length === 0) {
                container.innerHTML = "";
                emptyState.classList.remove("d-none");
                return;
            }

            const revealAll = document.getElementById("toggle-all-answers").checked;

            container.innerHTML = allQuestions.map((q, idx) => {
                const diffColor = q.difficulty?.toUpperCase() === 'EASY' ? 'success' : (q.difficulty?.toUpperCase() === 'HARD' ? 'danger' : 'warning');
                const defaultKeys = ["A", "B", "C", "D", "E", "F"];

                return `
                    <div class="question-card p-4 shadow-sm" id="q-card-${q.id}">
                        <div class="d-flex justify-content-between align-items-start mb-3">
                            <div class="d-flex flex-wrap gap-2 align-items-center">
                                <span class="badge bg-primary-subtle text-primary border border-primary-subtle">
                                    <i class="bi bi-book me-1"></i>${q.subject_name || 'Subject'}
                                </span>
                                ${q.unit_number ? `<span class="badge bg-secondary-subtle text-secondary border">Unit ${q.unit_number}: ${q.unit_name || ''}</span>` : ''}
                                ${q.topic ? `<span class="badge bg-light text-dark border">${q.topic}</span>` : ''}
                                <span class="badge bg-${diffColor}-subtle text-${diffColor} border border-${diffColor}-subtle">
                                    ${q.difficulty}
                                </span>
                            </div>
                            <span class="badge bg-light text-muted border">#${idx + 1}</span>
                        </div>

                        <p class="fw-semibold fs-5 mb-3">${q.question || q.question_text}</p>

                        <div class="options-list mb-3">
                            ${(q.options || []).map((opt, optIdx) => {
                                const key = opt.option_key || defaultKeys[optIdx];
                                const isCorrect = opt.is_correct === true || opt.is_correct === 1 || key === q.correct_answer;
                                return `
                                    <div class="option-item ${revealAll && isCorrect ? 'correct' : ''}" data-is-correct="${isCorrect}">
                                        <span class="option-key">${key}</span>
                                        <span>${opt.option_text}</span>
                                    </div>
                                `;
                            }).join('')}
                        </div>

                        <!-- Answer & Explanation box -->
                        <div class="answer-details ${revealAll ? '' : 'd-none'} p-3 rounded-3 bg-light border mb-3" id="answer-box-${q.id}">
                            <div class="mb-1">
                                <span class="text-muted small">Correct Answer:</span>
                                <strong class="text-success ms-1">${q.correct_answer || 'See marked option'}</strong>
                            </div>
                            ${q.explanation ? `
                                <div class="small text-secondary mt-1">
                                    <i class="bi bi-lightbulb-fill text-warning me-1"></i>
                                    <strong>Explanation:</strong> ${q.explanation}
                                </div>
                            ` : ''}
                        </div>

                        <div class="d-flex justify-content-between align-items-center pt-2 border-top">
                            <button class="btn btn-sm btn-outline-primary rounded-pill px-3" onclick="toggleAnswer(${q.id})">
                                <i class="bi bi-eye me-1"></i>Toggle Answer
                            </button>
                            <a href="practice.html?subjectId=${q.subject_id}${q.unit_id ? `&unitId=${q.unit_id}` : ''}" class="btn btn-sm btn-outline-success rounded-pill px-3">
                                <i class="bi bi-lightning-charge-fill me-1"></i>Practice Topic
                            </a>
                        </div>
                    </div>
                `;
            }).join('');
        }
    } catch (e) {
        container.innerHTML = `<div class="alert alert-danger">Error loading questions: ${e.message}</div>`;
    }
}

function toggleAnswer(questionId) {
    const card = document.getElementById(`q-card-${questionId}`);
    if (!card) return;
    const answerBox = document.getElementById(`answer-box-${questionId}`);
    const isHidden = answerBox.classList.contains("d-none");

    if (isHidden) {
        answerBox.classList.remove("d-none");
        card.querySelectorAll(".option-item").forEach(el => {
            if (el.dataset.isCorrect === "true") el.classList.add("correct");
        });
    } else {
        answerBox.classList.add("d-none");
        card.querySelectorAll(".option-item").forEach(el => {
            el.classList.remove("correct");
        });
    }
}

async function handleCreateQuestion(e) {
    e.preventDefault();

    const subjectId = document.getElementById("modal-subject").value;
    const unitId = document.getElementById("modal-unit").value;
    const topic = document.getElementById("modal-topic").value;
    const difficulty = document.getElementById("modal-difficulty").value;
    const questionText = document.getElementById("modal-question-text").value;
    const explanation = document.getElementById("modal-explanation").value;
    const correctOptRadio = document.querySelector('input[name="modal-correct-opt"]:checked');
    const optInputs = document.querySelectorAll(".modal-opt-input");
    const saveBtn = document.getElementById("modal-save-btn");
    const errEl = document.getElementById("modal-error");

    errEl.classList.add("d-none");
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Saving...`;

    const correctIndex = parseInt(correctOptRadio ? correctOptRadio.value : "0", 10);
    const defaultKeys = ["A", "B", "C", "D"];

    const options = Array.from(optInputs).map((input, idx) => ({
        option_key: defaultKeys[idx],
        option_text: input.value.trim(),
        is_correct: idx === correctIndex
    }));

    try {
        const res = await API.createQuestion({
            subject_id: subjectId,
            unit_id: unitId,
            topic: topic || "General",
            question: questionText,
            question_text: questionText,
            difficulty,
            options,
            explanation
        });

        if (res.success) {
            // Close modal
            const modalEl = document.getElementById("createQuestionModal");
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();

            // Reset form
            document.getElementById("create-question-form").reset();

            Auth.showToast("Question added to Question Bank successfully!", "success");
            await loadQuestions();
        } else {
            errEl.innerText = res.message || "Failed to create question";
            errEl.classList.remove("d-none");
        }
    } catch (err) {
        errEl.innerText = err.message || "An error occurred while creating question";
        errEl.classList.remove("d-none");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = "Save Question";
    }
}

window.toggleAnswer = toggleAnswer;
