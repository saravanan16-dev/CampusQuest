/**
 * Previous Year Questions (PYQs) Controller
 */

document.addEventListener("DOMContentLoaded", async () => {
    await loadSubjectFilters();
    await loadPYQs();

    // URL params
    const urlParams = new URLSearchParams(window.location.search);
    const subjectId = urlParams.get("subjectId");
    if (subjectId) {
        document.getElementById("pyq-subject-filter").value = subjectId;
        loadPYQs();
    }

    ["pyq-subject-filter", "pyq-regulation-filter", "pyq-year-filter"].forEach(id => {
        document.getElementById(id).addEventListener("change", loadPYQs);
    });
});

async function loadSubjectFilters() {
    try {
        const res = await API.getSubjects();
        if (res.success) {
            const select = document.getElementById("pyq-subject-filter");
            res.data.forEach(s => {
                const opt = document.createElement("option");
                opt.value = s.id;
                opt.textContent = s.name;
                select.appendChild(opt);
            });
        }
    } catch (e) {
        console.error("Failed to load subject filters:", e);
    }
}

async function loadPYQs() {
    const container = document.getElementById("pyq-container");
    const subjectId = document.getElementById("pyq-subject-filter").value;
    const regulation = document.getElementById("pyq-regulation-filter").value;
    const year = document.getElementById("pyq-year-filter").value;

    container.innerHTML = `<div class="col-12 text-center py-4 text-muted"><div class="spinner-border text-primary" role="status"></div></div>`;

    try {
        const res = await API.getPYQs({ subjectId, regulation, year });

        if (res.success && res.data.length > 0) {
            container.innerHTML = res.data.map(p => `
                <div class="col-md-6 col-lg-4">
                    <div class="card-cq h-100 p-4 d-flex flex-column">
                        <div class="d-flex flex-wrap gap-2 mb-3">
                            <span class="badge bg-primary-subtle text-primary border border-primary-subtle rounded-pill">
                                ${p.regulation} Regulation
                            </span>
                            <span class="badge bg-secondary-subtle text-secondary border rounded-pill">
                                Sem ${p.semester}
                            </span>
                            <span class="badge ${p.exam_type === 'Regular' ? 'bg-success-subtle text-success' : 'bg-warning-subtle text-warning'} border rounded-pill">
                                ${p.exam_type}
                            </span>
                        </div>

                        <div class="mb-1 text-muted small fw-semibold">${p.subject_name}</div>
                        <h6 class="fw-bold text-dark flex-grow-1">${p.title}</h6>
                        <div class="text-muted small mb-3">Academic Year: <strong class="text-dark">${p.year}</strong></div>

                        <div class="d-flex gap-2 pt-3 border-top mt-auto">
                            ${p.file_url ? `
                                <a href="${p.file_url}" target="_blank" class="btn btn-sm btn-primary rounded-pill flex-grow-1">
                                    <i class="bi bi-file-earmark-pdf me-1"></i>View Paper
                                </a>
                                <a href="${p.file_url}" download class="btn btn-sm btn-outline-secondary rounded-pill px-3">
                                    <i class="bi bi-download"></i>
                                </a>
                            ` : `
                                <button class="btn btn-sm btn-outline-secondary rounded-pill flex-grow-1" disabled>
                                    <i class="bi bi-file-earmark-x me-1"></i>PDF not available
                                </button>
                            `}
                        </div>
                    </div>
                </div>
            `).join("");
        } else {
            container.innerHTML = `
                <div class="col-12 text-center py-5 text-muted">
                    <i class="bi bi-folder2-open fs-1 d-block mb-2 text-secondary"></i>
                    No previous year questions found for the selected filters.
                </div>
            `;
        }
    } catch (e) {
        container.innerHTML = `<div class="col-12 text-center py-5 text-danger">Failed to load PYQs. Check server connection.</div>`;
    }
}
