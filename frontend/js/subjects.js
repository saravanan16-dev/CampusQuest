/**
 * Subjects Catalog Controller
 */

document.addEventListener("DOMContentLoaded", () => {
    loadSubjects();

    const buttons = document.querySelectorAll(".filter-sem-btn");
    buttons.forEach(btn => {
        btn.addEventListener("click", () => {
            buttons.forEach(b => {
                b.classList.remove("btn-primary", "active");
                b.classList.add("btn-outline-secondary");
            });
            btn.classList.add("btn-primary", "active");
            btn.classList.remove("btn-outline-secondary");

            const semester = btn.getAttribute("data-sem");
            loadSubjects(semester);
        });
    });
});

async function loadSubjects(semester = "") {
    const container = document.getElementById("subjects-container");

    try {
        const res = await API.getSubjects(semester);
        if (res.success && res.data.length > 0) {
            container.innerHTML = res.data.map(sub => `
                <div class="col-md-6 col-lg-4">
                    <div class="card-cq h-100 p-4 d-flex flex-column">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <span class="badge bg-primary-subtle text-primary border border-primary-subtle px-2.5 py-1 rounded-pill">
                                Semester ${sub.semester || 1}
                            </span>
                            <span class="text-muted small">#ID: ${sub.id}</span>
                        </div>
                        <h5 class="fw-bold text-dark mb-2">${sub.name}</h5>
                        <p class="text-muted small flex-grow-1">
                            ${sub.description || "Comprehensive syllabus coverage, unit notes, practice sets, and previous year exam questions."}
                        </p>
                        
                        <div class="d-flex flex-wrap gap-2 pt-3 border-top mt-3">
                            <a href="subject.html?id=${sub.id}" class="btn btn-sm btn-primary rounded-pill px-3">
                                <i class="bi bi-diagram-3 me-1"></i>Units & Notes
                            </a>
                            <a href="practice.html?subjectId=${sub.id}" class="btn btn-sm btn-outline-primary rounded-pill px-3">
                                <i class="bi bi-lightning-charge me-1"></i>Practice
                            </a>
                            <a href="pyqs.html?subjectId=${sub.id}" class="btn btn-sm btn-outline-secondary rounded-pill px-3">
                                <i class="bi bi-file-earmark-pdf me-1"></i>PYQs
                            </a>
                        </div>
                    </div>
                </div>
            `).join("");
        } else {
            container.innerHTML = `
                <div class="col-12 text-center py-5 text-muted">
                    <i class="bi bi-inbox fs-1 d-block mb-2 text-secondary"></i>
                    No subjects found for the selected semester.
                </div>
            `;
        }
    } catch (e) {
        container.innerHTML = `
            <div class="col-12 text-center py-5 text-danger">
                Failed to load subjects. Please check your backend connection.
            </div>
        `;
    }
}
