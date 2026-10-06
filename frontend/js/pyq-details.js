/**
 * PYQ Details Controller (Phase 4)
 * Loads single Previous Year Question and shows metadata and related actions
 */

document.addEventListener("DOMContentLoaded", async () => {
    Auth.requireAuth();

    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get("id");

    if (!id) {
        window.location.href = "pyqs.html";
        return;
    }

    try {
        const res = await API.getPYQ(id);
        if (res.success && res.data) {
            renderPYQ(res.data);
        } else {
            document.getElementById("pyq-loading").innerHTML = `
                <div class="alert alert-danger mx-auto" style="max-width: 500px;">
                    Question not found. <a href="pyqs.html" class="alert-link">Return to PYQs</a>.
                </div>
            `;
        }
    } catch (err) {
        document.getElementById("pyq-loading").innerHTML = `
            <div class="alert alert-danger mx-auto" style="max-width: 500px;">
                Failed to load question details: ${err.message}
            </div>
        `;
    }
});

function renderPYQ(p) {
    document.getElementById("pyq-loading").classList.add("d-none");
    document.getElementById("pyq-content").classList.remove("d-none");

    const qNum = p.question_number || "Question";
    const marks = p.marks !== undefined ? p.marks : 13;
    const title = p.title || p.question;

    document.getElementById("pyq-crumb-title").innerText = `${p.subject_name || 'Subject'} - ${qNum}`;
    document.getElementById("pyq-qnum-badge").innerText = qNum;
    document.getElementById("pyq-marks-badge").innerText = `${marks} Marks`;

    document.getElementById("pyq-title-display").innerText = title;
    document.getElementById("pyq-statement").innerText = p.question || p.title;

    // Meta card
    document.getElementById("pyq-meta-subject").innerText = `${p.subject_name || '-'} (Sem ${p.semester || p.subject_semester || '-'})`;
    document.getElementById("pyq-meta-unit").innerText = p.unit_number ? `Unit ${p.unit_number}: ${p.unit_name || ''}` : "General / Multi-unit";
    document.getElementById("pyq-meta-year").innerText = `${p.year} (${p.exam_type || 'Regular'})`;
    document.getElementById("pyq-meta-regulation").innerText = `Regulation ${p.regulation || '2021'}`;
    document.getElementById("pyq-meta-marks").innerText = `${marks} Marks`;

    // Action buttons
    const practiceBtn = document.getElementById("pyq-practice-btn");
    const notesBtn = document.getElementById("pyq-notes-btn");

    practiceBtn.href = `practice.html?subjectId=${p.subject_id}${p.unit_id ? `&unitId=${p.unit_id}` : ''}`;
    notesBtn.href = `notes.html?subjectId=${p.subject_id}${p.unit_id ? `&unitId=${p.unit_id}` : ''}`;
}
