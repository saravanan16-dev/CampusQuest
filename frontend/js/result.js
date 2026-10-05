/**
 * Practice Result & Review Answers Controller (Phase 3 Modules 7 & 8)
 */

let currentResult = null;
let allReviews = [];

document.addEventListener("DOMContentLoaded", async () => {
    Auth.requireAuth();

    const urlParams = new URLSearchParams(window.location.search);
    let attemptId = urlParams.get("attempt_id") || urlParams.get("id");

    if (!attemptId) {
        // Fetch latest attempt from history
        try {
            const history = await API.getPracticeHistory();
            if (history.success && history.data.length > 0) {
                attemptId = history.data[0].id || history.data[0].attempt_id;
            }
        } catch (e) {
            console.error("Could not load latest history:", e);
        }
    }

    if (!attemptId) {
        document.getElementById("result-loading").innerHTML = `
            <div class="alert alert-info">
                <h5>No practice attempt found.</h5>
                <p>Start a new practice session to view your score and review answers.</p>
                <a href="practice.html" class="btn btn-primary rounded-pill px-4">Go to Practice Arena</a>
            </div>
        `;
        return;
    }

    await loadResult(attemptId);
    await loadHistory();

    // Setup review filter buttons
    document.querySelectorAll(".filter-review-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".filter-review-btn").forEach(b => b.classList.remove("active", "btn-primary", "text-white"));
            btn.classList.add("active", "btn-primary", "text-white");
            renderReviewCards(btn.dataset.filter);
        });
    });
});

async function loadResult(attemptId) {
    try {
        const res = await API.getPracticeResult(attemptId);
        if (res.success) {
            currentResult = res.data;
            allReviews = currentResult.review || currentResult.results || [];

            displayResultBanner(currentResult);
            renderReviewCards("all");

            document.getElementById("result-loading").classList.add("d-none");
            document.getElementById("result-content").classList.remove("d-none");
        } else {
            showError(res.message || "Failed to load practice result");
        }
    } catch (err) {
        showError(err.message || "Could not connect to server");
    }
}

function displayResultBanner(data) {
    const score = data.score;
    const total = data.total_questions;
    const percentage = data.percentage !== undefined ? data.percentage : (total > 0 ? Math.round((score / total) * 100) : 0);
    const correct = data.correct_answers !== undefined ? data.correct_answers : score;
    const wrong = data.incorrect_answers !== undefined ? data.incorrect_answers : (total - score);
    const timeTaken = data.time_taken_seconds ? `${data.time_taken_seconds}s` : "--";

    document.getElementById("res-score-ratio").innerText = `${score} / ${total}`;
    document.getElementById("res-percentage").innerText = `${percentage}%`;
    document.getElementById("res-correct-count").innerText = correct;
    document.getElementById("res-wrong-count").innerText = wrong;
    document.getElementById("res-time-taken").innerText = timeTaken;

    // Subject & unit badge
    const subjectName = data.subject_name || "Engineering Subject";
    const unitText = data.unit_number ? ` • Unit ${data.unit_number}: ${data.unit_name || ''}` : '';
    document.getElementById("res-subject-badge").innerText = `${subjectName}${unitText}`;

    // Score Circle styling
    const circle = document.getElementById("res-score-circle");
    circle.classList.remove("needs-work", "poor");
    if (percentage < 40) {
        circle.classList.add("poor");
        document.getElementById("res-status-title").innerText = "Keep Practicing!";
    } else if (percentage < 70) {
        circle.classList.add("needs-work");
        document.getElementById("res-status-title").innerText = "Good Effort!";
    } else {
        document.getElementById("res-status-title").innerText = "Excellent Performance!";
    }

    // Practice Again button href
    let practiceUrl = "practice.html";
    if (data.subject_id) {
        practiceUrl += `?subjectId=${data.subject_id}`;
        if (data.unit_id) practiceUrl += `&unitId=${data.unit_id}`;
        else if (data.unit_number || data.unit) practiceUrl += `&unit=${data.unit_number || data.unit}`;
    }
    document.getElementById("practice-again-btn").href = practiceUrl;
}

function renderReviewCards(filter = "all") {
    const container = document.getElementById("review-cards-container");

    let filtered = allReviews;
    if (filter === "incorrect") {
        filtered = allReviews.filter(r => !r.is_correct);
    } else if (filter === "correct") {
        filtered = allReviews.filter(r => r.is_correct);
    }

    if (filtered.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4 text-muted bg-white rounded-3 border">
                <i class="bi bi-info-circle fs-3 text-secondary mb-2 d-block"></i>
                No questions match the "${filter}" filter.
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map((item, idx) => {
        const isCorrect = item.is_correct;
        const qText = item.question || item.question_text || "Question";
        const yourAns = item.your_answer || item.selected_option || "Not Answered";
        const correctAns = item.correct_answer_text || item.correct_answer || "Correct Option";
        const explanation = item.explanation || "No explanation provided for this question.";

        return `
            <div class="review-card p-4 shadow-sm ${isCorrect ? 'correct' : 'incorrect'}">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="badge ${isCorrect ? 'bg-success' : 'bg-danger'}">
                        ${isCorrect ? '✓ Correct' : '✗ Incorrect'}
                    </span>
                    <span class="text-muted small fw-semibold">Question ${idx + 1}</span>
                </div>

                <h6 class="fw-bold fs-6 mb-3 text-dark">${qText}</h6>

                <div class="d-flex flex-wrap gap-3 mb-3">
                    <div>
                        <span class="text-muted small d-block mb-1">Your Answer:</span>
                        <span class="answer-pill ${isCorrect ? 'correct' : 'wrong'}">
                            <i class="bi ${isCorrect ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}"></i>
                            ${yourAns}
                        </span>
                    </div>

                    ${!isCorrect ? `
                        <div>
                            <span class="text-muted small d-block mb-1">Correct Answer:</span>
                            <span class="answer-pill correct">
                                <i class="bi bi-check-circle-fill"></i>
                                ${correctAns}
                            </span>
                        </div>
                    ` : ''}
                </div>

                <!-- Explanation Box -->
                <div class="p-3 bg-light rounded-3 border-start border-3 border-primary small text-secondary">
                    <strong class="text-dark d-block mb-1"><i class="bi bi-lightbulb-fill text-warning me-1"></i>Explanation:</strong>
                    ${explanation}
                </div>
            </div>
        `;
    }).join('');
}

async function loadHistory() {
    try {
        const res = await API.getPracticeHistory();
        if (res.success && res.data.length > 0) {
            const tbody = document.getElementById("history-table-body");
            tbody.innerHTML = res.data.map(item => {
                const dateStr = item.completed_at || item.created_at;
                const formattedDate = dateStr ? new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "--";
                const score = item.score !== null ? item.score : item.correct_answers;
                const total = item.total_questions;
                const pct = item.percentage !== undefined ? item.percentage : (total > 0 ? Math.round((score / total) * 100) : 0);
                const badgeColor = pct >= 70 ? 'bg-success' : (pct >= 50 ? 'bg-warning text-dark' : 'bg-danger');

                return `
                    <tr>
                        <td>
                            <strong class="text-dark">${item.subject_name || 'Subject'}</strong>
                            ${item.unit_number ? `<div class="small text-muted">Unit ${item.unit_number}: ${item.unit_name || ''}</div>` : ''}
                        </td>
                        <td class="fw-bold">${score} / ${total}</td>
                        <td><span class="badge ${badgeColor}">${pct}%</span></td>
                        <td class="small text-muted">${formattedDate}</td>
                        <td class="text-end">
                            <a href="result.html?attempt_id=${item.id}" class="btn btn-sm btn-outline-primary rounded-pill">
                                View
                            </a>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    } catch (e) {
        console.error("Failed to load history:", e);
    }
}

function showError(msg) {
    document.getElementById("result-loading").innerHTML = `
        <div class="alert alert-danger">
            <h5>Error</h5>
            <p>${msg}</p>
            <a href="practice.html" class="btn btn-outline-danger rounded-pill px-4">Return to Practice</a>
        </div>
    `;
}
