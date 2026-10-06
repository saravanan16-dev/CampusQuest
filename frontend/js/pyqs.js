/**
 * Previous Year Questions (PYQs) Controller (Phase 4)
 * Handles Subject -> Year -> Unit -> Questions filtering and PYQ creation
 */

let allSubjects = [];

document.addEventListener("DOMContentLoaded", async () => {
    Auth.requireAuth();

    await loadSubjectFilters();

    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const subjectId = urlParams.get("subject_id") || urlParams.get("subjectId");
    const year = urlParams.get("year");
    const unitId = urlParams.get("unit_id") || urlParams.get("unitId");
    const marks = urlParams.get("marks");

    if (subjectId) {
        document.getElementById("pyq-subject-filter").value = subjectId;
        await loadUnitsForSubject(subjectId, "pyq-unit-filter");
        if (unitId) {
            document.getElementById("pyq-unit-filter").value = unitId;
        }
    }
    if (year) {
        document.getElementById("pyq-year-filter").value = year;
        updateYearPills(year);
    }
    if (marks) {
        document.getElementById("pyq-marks-filter").value = marks;
    }

    // Filter change listeners
    document.getElementById("pyq-subject-filter").addEventListener("change", async (e) => {
        await loadUnitsForSubject(e.target.value, "pyq-unit-filter");
        await loadPYQs();
    });

    document.getElementById("pyq-year-filter").addEventListener("change", (e) => {
        updateYearPills(e.target.value);
        loadPYQs();
    });

    document.getElementById("pyq-unit-filter").addEventListener("change", loadPYQs);
    document.getElementById("pyq-marks-filter").addEventListener("change", loadPYQs);

    document.getElementById("pyq-apply-btn").addEventListener("click", loadPYQs);

    document.getElementById("pyq-reset-btn").addEventListener("click", async () => {
        document.getElementById("pyq-subject-filter").value = "";
        const uSelect = document.getElementById("pyq-unit-filter");
        uSelect.innerHTML = `<option value="">All Units</option>`;
        uSelect.disabled = true;
        document.getElementById("pyq-year-filter").value = "";
        document.getElementById("pyq-marks-filter").value = "";
        updateYearPills("");
        await loadPYQs();
    });

    // Quick Year Pills
    document.querySelectorAll(".year-pill-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            const yr = btn.dataset.year;
            document.getElementById("pyq-year-filter").value = yr;
            updateYearPills(yr);
            loadPYQs();
        });
    });

    // Modal subject change
    document.getElementById("modal-pyq-subject").addEventListener("change", async (e) => {
        await loadUnitsForSubject(e.target.value, "modal-pyq-unit");
    });

    // Create PYQ form
    document.getElementById("create-pyq-form").addEventListener("submit", handleCreatePYQ);

    await loadPYQs();
});

function updateYearPills(selectedYear) {
    document.querySelectorAll(".year-pill-btn").forEach(btn => {
        if (btn.dataset.year === String(selectedYear || "")) {
            btn.classList.add("active", "btn-primary", "text-white");
            btn.classList.remove("btn-outline-secondary");
        } else {
            btn.classList.remove("active", "btn-primary", "text-white");
            btn.classList.add("btn-outline-secondary");
        }
    });
}

async function loadSubjectFilters() {
    try {
        const res = await API.getSubjects();
        if (res.success) {
            allSubjects = res.data;
            const select = document.getElementById("pyq-subject-filter");
            const modalSelect = document.getElementById("modal-pyq-subject");

            allSubjects.forEach(s => {
                const opt1 = document.createElement("option");
                opt1.value = s.id;
                opt1.textContent = `${s.name} (Sem ${s.semester})`;
                select.appendChild(opt1);

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
        select.innerHTML = `<option value="">${targetSelectId === 'pyq-unit-filter' ? 'All Units' : '-- Select Subject First --'}</option>`;
        select.disabled = true;
        return;
    }

    try {
        const res = await API.getUnitsBySubject(subjectId);
        if (res.success) {
            select.innerHTML = targetSelectId === 'pyq-unit-filter' ? `<option value="">All Units</option>` : `<option value="">-- Choose Unit --</option>`;
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

async function loadPYQs() {
    const container = document.getElementById("pyq-questions-container");
    const countText = document.getElementById("pyq-count-text");
    const emptyState = document.getElementById("pyq-empty-state");

    container.innerHTML = `<div class="text-center py-5 text-muted"><div class="spinner-border text-primary" role="status"></div></div>`;
    emptyState.classList.add("d-none");

    const subjectId = document.getElementById("pyq-subject-filter").value;
    const year = document.getElementById("pyq-year-filter").value;
    const unitId = document.getElementById("pyq-unit-filter").value;
    const marks = document.getElementById("pyq-marks-filter").value;

    const filters = {};
    if (subjectId) filters.subject_id = subjectId;
    if (year) filters.year = year;
    if (unitId) filters.unit_id = unitId;
    if (marks) filters.marks = marks;

    try {
        const res = await API.getPYQs(filters);
        if (res.success) {
            const pyqs = res.data;
            countText.innerText = `Showing ${pyqs.length} university examination question(s)`;

            if (pyqs.length === 0) {
                container.innerHTML = "";
                emptyState.classList.remove("d-none");
                return;
            }

            container.innerHTML = pyqs.map((p, idx) => {
                const marksClass = p.marks >= 13 ? "bg-danger-subtle text-danger border-danger-subtle" : (p.marks >= 8 ? "bg-warning-subtle text-warning border-warning-subtle" : "bg-info-subtle text-info border-info-subtle");
                const qNumBadge = p.question_number ? `<span class="badge bg-dark text-white me-1">${p.question_number}</span>` : `<span class="badge bg-light text-muted border me-1">#${idx + 1}</span>`;

                return `
                    <div class="pyq-card p-4 shadow-sm">
                        <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
                            <div class="d-flex flex-wrap gap-2 align-items-center">
                                ${qNumBadge}
                                <span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill">
                                    <i class="bi bi-book me-1"></i>${p.subject_name || "Subject"}
                                </span>
                                ${p.unit_number ? `<span class="badge bg-secondary-subtle text-secondary border rounded-pill">Unit ${p.unit_number}: ${p.unit_name || ''}</span>` : ''}
                                <span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill">
                                    <i class="bi bi-calendar-event me-1"></i>${p.year} Exam
                                </span>
                                <span class="badge bg-light text-dark border rounded-pill">
                                    Reg ${p.regulation || '2021'}
                                </span>
                                <span class="badge ${marksClass} rounded-pill fw-bold">
                                    ${p.marks || 13} Marks
                                </span>
                            </div>
                            <span class="badge bg-light text-secondary border">${p.exam_type || "End Semester"}</span>
                        </div>

                        ${p.title && p.title !== p.question ? `<h6 class="fw-bold text-dark mb-2">${p.title}</h6>` : ''}
                        <p class="fs-6 text-dark mb-3 lh-base">${p.question || p.title}</p>

                        <div class="d-flex flex-wrap justify-content-between align-items-center pt-2 border-top gap-2">
                            <div class="d-flex gap-2">
                                <a href="pyq-details.html?id=${p.id}" class="btn btn-sm btn-outline-primary rounded-pill px-3">
                                    <i class="bi bi-info-circle me-1"></i>View Details
                                </a>
                                ${p.file_url ? `
                                    <a href="${p.file_url}" target="_blank" class="btn btn-sm btn-outline-secondary rounded-pill px-3">
                                        <i class="bi bi-file-earmark-pdf me-1"></i>Original Paper
                                    </a>
                                ` : ''}
                            </div>
                            <a href="practice.html?subjectId=${p.subject_id}${p.unit_id ? `&unitId=${p.unit_id}` : ''}" class="btn btn-sm btn-outline-success rounded-pill px-3">
                                <i class="bi bi-lightning-charge-fill me-1"></i>Practice This Unit
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

async function handleCreatePYQ(e) {
    e.preventDefault();

    const subjectId = document.getElementById("modal-pyq-subject").value;
    const unitId = document.getElementById("modal-pyq-unit").value;
    const year = document.getElementById("modal-pyq-year").value;
    const regulation = document.getElementById("modal-pyq-regulation").value;
    const examType = document.getElementById("modal-pyq-exam-type").value;
    const marks = document.getElementById("modal-pyq-marks").value;
    const questionNumber = document.getElementById("modal-pyq-qnum").value;
    const title = document.getElementById("modal-pyq-title").value;
    const question = document.getElementById("modal-pyq-question").value;
    const saveBtn = document.getElementById("modal-pyq-save-btn");
    const errEl = document.getElementById("modal-pyq-error");

    errEl.classList.add("d-none");
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span> Saving...`;

    try {
        const res = await API.createPYQ({
            subject_id: subjectId,
            unit_id: unitId || undefined,
            question,
            year: Number(year),
            regulation,
            exam_type: examType,
            marks: Number(marks),
            question_number: questionNumber,
            title: title || undefined
        });

        if (res.success) {
            const modalEl = document.getElementById("createPyqModal");
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();

            document.getElementById("create-pyq-form").reset();
            Auth.showToast("Previous year question added successfully!", "success");
            await loadPYQs();
        } else {
            errEl.innerText = res.message || "Failed to create PYQ";
            errEl.classList.remove("d-none");
        }
    } catch (err) {
        errEl.innerText = err.message || "An error occurred while creating PYQ";
        errEl.classList.remove("d-none");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerText = "Save PYQ";
    }
}
