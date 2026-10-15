/**
 * AI Study Buddy & Exam Intelligence Controller
 * Powered by Free AI Generation Engine
 */

let lastAiAnswer = "";

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

    const askForm = document.getElementById("ask-ai-form");
    if (askForm) {
        askForm.addEventListener("submit", handleAskAI);
    }

    const conceptForm = document.getElementById("concept-form");
    if (conceptForm) {
        conceptForm.addEventListener("submit", handleConceptExplain);
    }
});

// ─── 0. Ask AI Study Buddy ────────────────────────────────────────────────────
async function handleAskAI(e) {
    e.preventDefault();
    const question = document.getElementById("ask-input").value.trim();
    const subjectSelect = document.getElementById("ask-subject-select");
    const subjectName = subjectSelect ? subjectSelect.value : "";
    const btn = document.getElementById("ask-btn");

    if (!question) {
        Auth.showToast("Please enter a question or doubt", "warning");
        return;
    }

    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Thinking...`;

    document.getElementById("ask-placeholder").classList.add("d-none");
    document.getElementById("ask-results").classList.add("d-none");
    document.getElementById("ask-loading").classList.remove("d-none");

    try {
        const res = await API.askAIAssistant({
            question,
            subject_name: subjectName
        });

        document.getElementById("ask-loading").classList.add("d-none");

        if (res.success && res.data) {
            renderAiAnswer(res.data);
        } else {
            document.getElementById("ask-placeholder").classList.remove("d-none");
            Auth.showToast(res.message || "Failed to generate answer", "error");
        }
    } catch (err) {
        console.error("AI Assistant error:", err);
        document.getElementById("ask-loading").classList.add("d-none");
        document.getElementById("ask-placeholder").classList.remove("d-none");
        Auth.showToast(err.message || "Could not generate answer. Please try again.", "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<i class="bi bi-send-fill me-1"></i>Generate AI Answer`;
    }
}

function renderAiAnswer(data) {
    lastAiAnswer = data.answer || "";
    const resBox = document.getElementById("ask-results");
    resBox.classList.remove("d-none");

    document.getElementById("ask-result-subject").innerText = data.subject || "Engineering";
    document.getElementById("ask-result-provider").innerText = data.provider || "Free AI Engine";
    document.getElementById("ask-result-question").innerText = data.question;

    const bodyEl = document.getElementById("ask-result-body");
    bodyEl.innerHTML = formatAiMarkdown(data.answer);
}

function quickAsk(question, subject) {
    document.getElementById("ask-input").value = question;
    const select = document.getElementById("ask-subject-select");
    if (select) {
        // Find matching option
        for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].text.includes(subject) || select.options[i].value === subject) {
                select.selectedIndex = i;
                break;
            }
        }
    }
    const form = document.getElementById("ask-ai-form");
    if (form) form.dispatchEvent(new Event("submit"));
}
window.quickAsk = quickAsk;

function copyAiAnswer() {
    if (!lastAiAnswer) return;
    navigator.clipboard.writeText(lastAiAnswer).then(() => {
        Auth.showToast("Answer copied to clipboard!", "success");
    }).catch(() => {
        Auth.showToast("Could not copy answer", "warning");
    });
}
window.copyAiAnswer = copyAiAnswer;

function formatAiMarkdown(text) {
    if (!text) return "";
    let formatted = escapeHtml(text);

    // Code blocks ```code```
    formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre class="bg-dark text-light p-2 rounded small my-2"><code>$1</code></pre>');
    // Inline code `code`
    formatted = formatted.replace(/`([^`]+)`/g, '<code class="bg-secondary-subtle px-1 rounded text-primary">$1</code>');
    // Bold **text**
    formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Italic *text*
    formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    return formatted;
}

function escapeHtml(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// ─── 1. Personalized Recommendations ─────────────────────────────────────────
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

// ─── 2. Concept Explainer ─────────────────────────────────────────────────────
async function handleConceptExplain(e) {
    e.preventDefault();
    const concept = document.getElementById("concept-input").value.trim();
    const subject = document.getElementById("subject-input").value.trim();
    const btn = document.getElementById("concept-btn");

    btn.disabled = true;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Generating explanation...`;

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

    document.getElementById("concept-title").innerHTML = `
        ${escapeHtml(data.concept)}
        ${data.ai_generated ? '<span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill small ms-2 fs-6"><i class="bi bi-stars me-1"></i>AI Generated</span>' : ''}
    `;
    document.getElementById("concept-def").innerText = data.definition;

    const pointsList = document.getElementById("concept-points");
    pointsList.innerHTML = (data.key_points || []).map(pt => `<li>${escapeHtml(pt)}</li>`).join("");

    document.getElementById("concept-example").innerText = data.example || "Practical industry example.";
    document.getElementById("concept-tip").innerText = data.exam_tip || "Highlight key definitions and formulas in exam answers.";
}

// ─── 3. Exam Intelligence ─────────────────────────────────────────────────────
async function loadSubjectsDropdown() {
    try {
        const res = await API.getSubjects();
        if (res.success && res.data) {
            const examSelect = document.getElementById("exam-subject-select");
            const askSelect = document.getElementById("ask-subject-select");

            res.data.forEach(s => {
                const opt1 = document.createElement("option");
                opt1.value = s.id;
                opt1.textContent = `${s.name} (Semester ${s.semester})`;
                if (examSelect) examSelect.appendChild(opt1);

                const opt2 = document.createElement("option");
                opt2.value = s.name;
                opt2.textContent = s.name;
                if (askSelect) askSelect.appendChild(opt2);
            });
        }
    } catch (e) {
        console.error("Failed to load subjects dropdowns:", e);
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

// ─── 5. AI Settings & Key Configuration ───────────────────────────────────────
async function loadAiStatus() {
    try {
        const res = await API.getAiStatus();
        if (res.success && res.data) {
            const data = res.data;
            const badge = document.getElementById("active-engine-badge");
            const modalBadge = document.getElementById("modal-active-provider-badge");
            const modalName = document.getElementById("modal-active-provider-name");

            if (data.has_gemini) {
                if (badge) badge.innerHTML = `<i class="bi bi-stars text-warning me-1"></i>Google Gemini Active`;
                if (modalBadge) { modalBadge.className = "badge bg-primary"; modalBadge.innerText = "Gemini 1.5 Flash"; }
                if (modalName) modalName.innerText = "Google Gemini 1.5 Flash (1,500 req/day Free)";
            } else if (data.has_groq) {
                if (badge) badge.innerHTML = `<i class="bi bi-lightning-charge-fill text-warning me-1"></i>Groq LLaMA Active`;
                if (modalBadge) { modalBadge.className = "badge bg-info text-dark"; modalBadge.innerText = "Groq LLaMA 3.3"; }
                if (modalName) modalName.innerText = "Groq LLaMA 3.3 70B (Ultra-Fast Free Tier)";
            } else {
                if (badge) badge.innerHTML = `<i class="bi bi-shield-check text-success me-1"></i>Curriculum Engine Active`;
                if (modalBadge) { modalBadge.className = "badge bg-success"; modalBadge.innerText = "Built-in Engine"; }
                if (modalName) modalName.innerText = "CampusQuest Engineering Knowledge Engine";
            }
        }
    } catch (e) {
        console.warn("Failed to load AI status:", e);
    }
}

function initAiSettings() {
    loadAiStatus();

    const providerSelect = document.getElementById("ai-provider-select");
    const hint = document.getElementById("ai-key-hint");
    if (providerSelect && hint) {
        providerSelect.addEventListener("change", () => {
            if (providerSelect.value === "gemini") {
                hint.innerHTML = `Get your free key in 30 seconds at <a href="https://aistudio.google.com/app/apikey" target="_blank" class="fw-bold text-decoration-none">Google AI Studio <i class="bi bi-box-arrow-up-right"></i></a> (100% free forever, no credit card required).`;
            } else {
                hint.innerHTML = `Get your free key in 30 seconds at <a href="https://console.groq.com" target="_blank" class="fw-bold text-decoration-none">Groq Console <i class="bi bi-box-arrow-up-right"></i></a> (100% free forever, no credit card required).`;
            }
        });
    }

    const saveBtn = document.getElementById("btn-save-ai-key");
    if (saveBtn) {
        saveBtn.addEventListener("click", async () => {
            const provider = document.getElementById("ai-provider-select").value;
            const key = document.getElementById("ai-key-input").value.trim();
            const alertBox = document.getElementById("ai-config-alert");

            if (!key) {
                alertBox.className = "alert alert-danger small";
                alertBox.innerText = "Please paste an API key first.";
                alertBox.classList.remove("d-none");
                return;
            }

            saveBtn.disabled = true;
            saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> Verifying with ${provider}...`;
            alertBox.classList.add("d-none");

            try {
                const res = await API.configureAiKey(provider, key);
                if (res.success) {
                    alertBox.className = "alert alert-success small";
                    alertBox.innerText = res.message || "Key verified and saved successfully!";
                    alertBox.classList.remove("d-none");
                    document.getElementById("ai-key-input").value = "";
                    loadAiStatus();
                    Auth.showToast(`Connected to ${res.provider}!`, "success");
                    setTimeout(() => {
                        const modalEl = document.getElementById("aiConfigModal");
                        if (modalEl) {
                            const modal = bootstrap.Modal.getInstance(modalEl);
                            if (modal) modal.hide();
                        }
                    }, 1200);
                } else {
                    alertBox.className = "alert alert-danger small";
                    alertBox.innerText = res.message || "Failed to verify key.";
                    alertBox.classList.remove("d-none");
                }
            } catch (err) {
                alertBox.className = "alert alert-danger small";
                alertBox.innerText = err.message || "Network error verifying key.";
                alertBox.classList.remove("d-none");
            } finally {
                saveBtn.disabled = false;
                saveBtn.innerHTML = `<i class="bi bi-check2-circle me-1"></i>Test & Save Key`;
            }
        });
    }
}

// Run settings initialization when DOM is ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAiSettings);
} else {
    initAiSettings();
}

