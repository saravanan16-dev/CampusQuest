/**
 * Notes Library Controller
 */

let allNotes = [];
let allSubjects = [];

document.addEventListener("DOMContentLoaded", async () => {
    await loadFilterOptions();
    await loadNotes();

    // Check URL parameters for subjectId or id
    const urlParams = new URLSearchParams(window.location.search);
    const subjectId = urlParams.get("subjectId");
    const noteId = urlParams.get("id");

    if (subjectId) {
        document.getElementById("subject-select").value = subjectId;
        filterAndRender();
    }

    if (noteId) {
        openNoteReader(noteId);
    }

    document.getElementById("subject-select").addEventListener("change", filterAndRender);
    document.getElementById("unit-select").addEventListener("change", filterAndRender);
});

async function loadFilterOptions() {
    try {
        const res = await API.getSubjects();
        if (res.success) {
            allSubjects = res.data;
            const select = document.getElementById("subject-select");
            allSubjects.forEach(s => {
                const opt = document.createElement("option");
                opt.value = s.id;
                opt.textContent = `${s.name} (Sem ${s.semester})`;
                select.appendChild(opt);
            });
        }
    } catch (e) {
        console.error("Error loading subjects filter:", e);
    }
}

async function loadNotes() {
    try {
        const res = await API.getAllNotes();
        if (res.success) {
            allNotes = res.data;
            renderNotes(allNotes);
        }
    } catch (e) {
        console.error("Error loading notes:", e);
        document.getElementById("notes-container").innerHTML = `
            <div class="col-12 text-center py-5 text-danger">Failed to load notes from server.</div>
        `;
    }
}

function filterAndRender() {
    const subjectId = document.getElementById("subject-select").value;
    const unit = document.getElementById("unit-select").value;

    let filtered = allNotes;
    if (subjectId) {
        filtered = filtered.filter(n => String(n.subject_id) === String(subjectId));
    }
    if (unit) {
        filtered = filtered.filter(n => String(n.unit) === String(unit));
    }

    renderNotes(filtered);
}

function renderNotes(notes) {
    const container = document.getElementById("notes-container");

    if (notes.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5 text-muted">
                <i class="bi bi-file-earmark-x fs-1 d-block mb-2 text-secondary"></i>
                No notes found matching the selected subject and unit.
            </div>
        `;
        return;
    }

    container.innerHTML = notes.map(n => `
        <div class="col-md-6 col-lg-4">
            <div class="card-cq h-100 p-4 d-flex flex-column">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <span class="badge bg-primary text-white rounded-pill px-2.5 py-1">
                        Unit ${n.unit}
                    </span>
                    <span class="badge bg-light text-muted border">
                        ${n.subject_name}
                    </span>
                </div>
                <h5 class="fw-bold text-dark mb-2">${n.title}</h5>
                <p class="text-muted small flex-grow-1">
                    ${n.description || "In-depth conceptual guide with key formulas, diagrams, and exam revision highlights."}
                </p>

                <div class="d-flex gap-2 pt-3 border-top mt-3">
                    <button class="btn btn-sm btn-primary rounded-pill px-3 flex-grow-1" onclick="openNoteReader(${n.id})">
                        <i class="bi bi-book-half me-1"></i>Read Notes
                    </button>
                    ${n.file_url ? `
                        <a href="${n.file_url}" target="_blank" class="btn btn-sm btn-outline-secondary rounded-pill px-2.5" title="Download PDF">
                            <i class="bi bi-download"></i>
                        </a>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join("");
}

async function openNoteReader(id) {
    try {
        const res = await API.getNote(id);
        if (res.success) {
            const note = res.data;
            document.getElementById("modal-note-title").innerText = note.title;
            document.getElementById("modal-note-badge").innerText = `Unit ${note.unit}`;
            document.getElementById("modal-note-subject").innerText = `Subject: ${note.subject_name}`;
            document.getElementById("modal-note-date").innerText = `Added: ${new Date(note.created_at).toLocaleDateString()}`;
            document.getElementById("modal-note-content").innerText = note.content || note.description || "Notes content is being digitized.";

            const downloadBtn = document.getElementById("modal-note-download");
            if (note.file_url) {
                downloadBtn.href = note.file_url;
                downloadBtn.classList.remove("d-none");
            } else {
                downloadBtn.classList.add("d-none");
            }

            const modal = new bootstrap.Modal(document.getElementById("noteModal"));
            modal.show();
        }
    } catch (e) {
        Auth.showToast("Failed to fetch note details", "error");
    }
}
window.openNoteReader = openNoteReader;
