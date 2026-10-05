/**
 * Admin Panel Controller
 */

let adminSubjectsList = [];

document.addEventListener("DOMContentLoaded", async () => {
    if (!Auth.requireAdmin()) return;

    await Promise.all([
        loadAnalytics(),
        loadSubjectsList(),
        loadUsers(),
        loadNotesList(),
        loadQuestionsList(),
        loadPYQsList(),
        loadMockTestsList()
    ]);

    // Setup form submit handlers
    document.getElementById("create-subject-form").addEventListener("submit", handleCreateSubject);
    document.getElementById("create-note-form").addEventListener("submit", handleCreateNote);
    document.getElementById("create-question-form").addEventListener("submit", handleCreateQuestion);
    document.getElementById("create-pyq-form").addEventListener("submit", handleCreatePYQ);
    document.getElementById("create-mock-form").addEventListener("submit", handleCreateMockTest);
});

async function loadAnalytics() {
    try {
        const res = await API.getAdminAnalytics();
        if (res.success) {
            const data = res.data;
            document.getElementById("metric-students").innerText = data.total_students;
            document.getElementById("metric-subjects").innerText = data.total_subjects;
            document.getElementById("metric-questions").innerText = data.total_questions;
            document.getElementById("metric-accuracy").innerText = `${data.system_overall_accuracy}%`;
        }
    } catch (e) {
        console.error("Failed to load analytics:", e);
    }
}

async function loadSubjectsList() {
    try {
        const res = await API.getSubjects();
        if (res.success) {
            adminSubjectsList = res.data;

            // Populate all subject select elements in admin tabs
            const selects = ["note-subject-select", "q-subject-select", "pyq-subject-select", "mock-subject-select"];
            selects.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.innerHTML = '<option value="">Select Subject...</option>' + 
                        adminSubjectsList.map(s => `<option value="${s.id}">${s.name} (Sem ${s.semester})</option>`).join("");
                }
            });

            // Populate Subjects table
            const tbody = document.getElementById("subjects-tbody");
            tbody.innerHTML = adminSubjectsList.map(s => `
                <tr>
                    <td>#${s.id}</td>
                    <td class="fw-semibold text-dark">${s.name}</td>
                    <td><span class="badge bg-light text-dark border">Semester ${s.semester}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger rounded-pill" onclick="deleteSubject(${s.id})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join("");
        }
    } catch (e) {
        console.error("Failed to load subjects:", e);
    }
}

async function loadUsers() {
    try {
        const res = await API.getAdminUsers();
        if (res.success) {
            const tbody = document.getElementById("users-tbody");
            tbody.innerHTML = res.data.map(u => `
                <tr>
                    <td>#${u.id}</td>
                    <td>
                        <div class="fw-semibold text-dark">${u.name}</div>
                        <small class="text-muted">@${u.username}</small>
                    </td>
                    <td>${u.email}</td>
                    <td>
                        <span class="badge ${u.role === 'ADMIN' ? 'bg-danger' : 'bg-primary'} rounded-pill">
                            ${u.role}
                        </span>
                    </td>
                    <td class="small text-muted">${new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-secondary rounded-pill" onclick="toggleUserRole(${u.id}, '${u.role}')">
                            Make ${u.role === 'ADMIN' ? 'Student' : 'Admin'}
                        </button>
                    </td>
                </tr>
            `).join("");
        }
    } catch (e) {
        console.error("Failed to load users:", e);
    }
}

async function toggleUserRole(userId, currentRole) {
    const newRole = currentRole === "ADMIN" ? "STUDENT" : "ADMIN";
    if (!confirm(`Are you sure you want to change this user's role to ${newRole}?`)) return;

    try {
        const res = await API.updateUserRole(userId, newRole);
        if (res.success) {
            Auth.showToast(`User role updated to ${newRole}`, "success");
            loadUsers();
        }
    } catch (e) {
        Auth.showToast("Failed to update user role", "error");
    }
}
window.toggleUserRole = toggleUserRole;

async function handleCreateSubject(e) {
    e.preventDefault();
    const name = document.getElementById("new-sub-name").value.trim();
    const semester = document.getElementById("new-sub-sem").value;
    const description = document.getElementById("new-sub-desc").value.trim();

    try {
        const res = await API.createSubject({ name, semester: Number(semester), description });
        if (res.success) {
            Auth.showToast("Subject created successfully!", "success");
            document.getElementById("create-subject-form").reset();
            await loadSubjectsList();
            await loadAnalytics();
        }
    } catch (err) {
        Auth.showToast(err.message || "Failed to create subject", "error");
    }
}

async function deleteSubject(id) {
    if (!confirm("Are you sure you want to delete this subject? All associated notes and questions will be removed.")) return;
    try {
        const res = await API.deleteSubject(id);
        if (res.success) {
            Auth.showToast("Subject deleted", "success");
            loadSubjectsList();
            loadAnalytics();
        }
    } catch (e) {
        Auth.showToast("Failed to delete subject", "error");
    }
}
window.deleteSubject = deleteSubject;

async function loadNotesList() {
    try {
        const res = await API.getAllNotes();
        if (res.success) {
            const tbody = document.getElementById("notes-tbody");
            tbody.innerHTML = res.data.map(n => `
                <tr>
                    <td><span class="badge bg-primary rounded-pill">Unit ${n.unit}</span></td>
                    <td class="fw-semibold text-dark text-truncate" style="max-width: 250px;">${n.title}</td>
                    <td class="text-muted small">${n.subject_name}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger rounded-pill" onclick="deleteNote(${n.id})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join("");
        }
    } catch (e) {
        console.error("Failed to load notes:", e);
    }
}

async function handleCreateNote(e) {
    e.preventDefault();
    const subject_id = document.getElementById("note-subject-select").value;
    const title = document.getElementById("note-title").value.trim();
    const unit = document.getElementById("note-unit").value;
    const description = document.getElementById("note-desc").value.trim();
    const file_url = document.getElementById("note-file-url").value.trim();
    const content = document.getElementById("note-content").value.trim();

    try {
        const res = await API.createNote({
            subject_id: Number(subject_id),
            title,
            unit: Number(unit),
            description,
            file_url,
            content
        });
        if (res.success) {
            Auth.showToast("Note added successfully!", "success");
            document.getElementById("create-note-form").reset();
            loadNotesList();
            loadAnalytics();
        }
    } catch (err) {
        Auth.showToast(err.message || "Failed to create note", "error");
    }
}

async function deleteNote(id) {
    if (!confirm("Delete this note?")) return;
    try {
        const res = await API.deleteNote(id);
        if (res.success) {
            Auth.showToast("Note removed", "success");
            loadNotesList();
            loadAnalytics();
        }
    } catch (e) {
        Auth.showToast("Failed to delete note", "error");
    }
}
window.deleteNote = deleteNote;

async function loadQuestionsList() {
    try {
        const res = await API.getQuestions({ limit: 50 });
        if (res.success) {
            const tbody = document.getElementById("questions-tbody");
            tbody.innerHTML = res.data.map(q => `
                <tr>
                    <td class="small text-muted">${q.subject_name}</td>
                    <td class="small fw-semibold">${q.topic}</td>
                    <td><span class="badge ${q.difficulty === 'EASY' ? 'bg-success' : q.difficulty === 'MEDIUM' ? 'bg-warning text-dark' : 'bg-danger'}">${q.difficulty}</span></td>
                    <td class="small text-truncate" style="max-width: 300px;">${q.question_text}</td>
                    <td><span class="badge bg-dark">${q.correct_answer}</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger rounded-pill" onclick="deleteQuestion(${q.id})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join("");
        }
    } catch (e) {
        console.error("Failed to load questions:", e);
    }
}

async function handleCreateQuestion(e) {
    e.preventDefault();
    const subject_id = document.getElementById("q-subject-select").value;
    const unit = document.getElementById("q-unit").value;
    const topic = document.getElementById("q-topic").value.trim();
    const difficulty = document.getElementById("q-difficulty").value;
    const question_text = document.getElementById("q-text").value.trim();
    const correct_answer = document.getElementById("q-correct").value;
    const explanation = document.getElementById("q-explanation").value.trim();

    const options = [
        { key: "A", text: document.getElementById("q-opt-a").value.trim() },
        { key: "B", text: document.getElementById("q-opt-b").value.trim() },
        { key: "C", text: document.getElementById("q-opt-c").value.trim() },
        { key: "D", text: document.getElementById("q-opt-d").value.trim() }
    ];

    try {
        const res = await API.createQuestion({
            subject_id: Number(subject_id),
            unit: Number(unit),
            topic,
            difficulty,
            question_text,
            correct_answer,
            explanation,
            options
        });
        if (res.success) {
            Auth.showToast("Question added to question bank!", "success");
            document.getElementById("create-question-form").reset();
            loadQuestionsList();
            loadAnalytics();
        }
    } catch (err) {
        Auth.showToast(err.message || "Failed to create question", "error");
    }
}

async function deleteQuestion(id) {
    if (!confirm("Delete this question?")) return;
    try {
        const res = await API.deleteQuestion(id);
        if (res.success) {
            Auth.showToast("Question deleted", "success");
            loadQuestionsList();
            loadAnalytics();
        }
    } catch (e) {
        Auth.showToast("Failed to delete question", "error");
    }
}
window.deleteQuestion = deleteQuestion;

async function loadPYQsList() {
    try {
        const res = await API.getPYQs();
        if (res.success) {
            const tbody = document.getElementById("pyqs-tbody");
            tbody.innerHTML = res.data.map(p => `
                <tr>
                    <td><span class="badge bg-light text-dark border">${p.year} (${p.regulation})</span></td>
                    <td class="fw-semibold text-dark text-truncate" style="max-width: 250px;">${p.title}</td>
                    <td class="text-muted small">${p.subject_name}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger rounded-pill" onclick="deletePYQ(${p.id})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join("");
        }
    } catch (e) {
        console.error("Failed to load PYQs:", e);
    }
}

async function handleCreatePYQ(e) {
    e.preventDefault();
    const subject_id = document.getElementById("pyq-subject-select").value;
    const regulation = document.getElementById("pyq-regulation").value.trim();
    const year = document.getElementById("pyq-year").value;
    const semester = document.getElementById("pyq-semester").value;
    const exam_type = document.getElementById("pyq-exam-type").value;
    const title = document.getElementById("pyq-title").value.trim();
    const file_url = document.getElementById("pyq-file-url").value.trim();

    try {
        const res = await API.createPYQ({
            subject_id: Number(subject_id),
            regulation,
            year: Number(year),
            semester: Number(semester),
            exam_type,
            title,
            file_url
        });
        if (res.success) {
            Auth.showToast("PYQ exam paper created!", "success");
            document.getElementById("create-pyq-form").reset();
            loadPYQsList();
            loadAnalytics();
        }
    } catch (err) {
        Auth.showToast(err.message || "Failed to create PYQ", "error");
    }
}

async function deletePYQ(id) {
    if (!confirm("Delete this PYQ paper?")) return;
    try {
        const res = await API.deletePYQ(id);
        if (res.success) {
            Auth.showToast("PYQ removed", "success");
            loadPYQsList();
            loadAnalytics();
        }
    } catch (e) {
        Auth.showToast("Failed to delete PYQ", "error");
    }
}
window.deletePYQ = deletePYQ;

async function loadMockTestsList() {
    try {
        const res = await API.getMockTests();
        if (res.success) {
            const tbody = document.getElementById("mocktests-tbody");
            tbody.innerHTML = res.data.map(m => `
                <tr>
                    <td class="fw-semibold text-dark">${m.title}</td>
                    <td class="text-muted small">${m.subject_name}</td>
                    <td>${m.duration_minutes}m</td>
                    <td>${m.question_count || 0}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-danger rounded-pill" onclick="deleteMockTest(${m.id})">
                            <i class="bi bi-trash"></i>
                        </button>
                    </td>
                </tr>
            `).join("");
        }
    } catch (e) {
        console.error("Failed to load mock tests:", e);
    }
}

async function handleCreateMockTest(e) {
    e.preventDefault();
    const subject_id = document.getElementById("mock-subject-select").value;
    const title = document.getElementById("mock-title").value.trim();
    const duration_minutes = document.getElementById("mock-duration").value;
    const passing_marks = document.getElementById("mock-pass").value;
    const description = document.getElementById("mock-desc").value.trim();

    try {
        const res = await API.createMockTest({
            subject_id: Number(subject_id),
            title,
            duration_minutes: Number(duration_minutes),
            passing_marks: Number(passing_marks),
            description
        });
        if (res.success) {
            Auth.showToast("Mock assessment created!", "success");
            document.getElementById("create-mock-form").reset();
            loadMockTestsList();
            loadAnalytics();
        }
    } catch (err) {
        Auth.showToast(err.message || "Failed to create mock test", "error");
    }
}

async function deleteMockTest(id) {
    if (!confirm("Delete this mock test?")) return;
    try {
        const res = await API.deleteMockTest(id);
        if (res.success) {
            Auth.showToast("Mock test deleted", "success");
            loadMockTestsList();
            loadAnalytics();
        }
    } catch (e) {
        Auth.showToast("Failed to delete mock test", "error");
    }
}
window.deleteMockTest = deleteMockTest;
