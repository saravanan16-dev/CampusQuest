/**
 * CampusQuest - Forum JS
 * Handles forum.html: loading posts, filters, pagination, creating posts
 */

let currentPage = 1;
let currentSubjectId = '';
let currentStatus = '';
let currentSearch = '';
let searchDebounceTimer = null;

// ─── Initialise ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    loadSubjects();
    loadPosts();

    document.getElementById('filter-subject').addEventListener('change', () => {
        currentSubjectId = document.getElementById('filter-subject').value;
        currentPage = 1;
        loadPosts();
    });

    document.getElementById('filter-status').addEventListener('change', () => {
        currentStatus = document.getElementById('filter-status').value;
        currentPage = 1;
        loadPosts();
    });

    document.getElementById('search-input').addEventListener('input', (e) => {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            currentSearch = e.target.value.trim();
            currentPage = 1;
            loadPosts();
        }, 500);
    });

    // Populate ask-subject when modal opens
    document.getElementById('ask-subject').addEventListener('change', () => {
        const subjectId = document.getElementById('ask-subject').value;
        if (subjectId) {
            loadUnits(subjectId);
        } else {
            const unitSel = document.getElementById('ask-unit');
            unitSel.innerHTML = '<option value="">— Select Unit (optional) —</option>';
            unitSel.disabled = true;
        }
    });
});

// ─── Load Subjects into dropdowns ────────────────────────────────────────────
async function loadSubjects() {
    try {
        const data = await window.API.getSubjects();
        const subjects = data.subjects || data || [];

        const filterSel = document.getElementById('filter-subject');
        const askSel = document.getElementById('ask-subject');

        subjects.forEach(s => {
            const opt1 = new Option(s.name, s.id);
            const opt2 = new Option(s.name, s.id);
            filterSel.appendChild(opt1);
            askSel.appendChild(opt2);
        });
    } catch (err) {
        console.error('Failed to load subjects:', err);
    }
}

// ─── Load Units based on subject ─────────────────────────────────────────────
async function loadUnits(subjectId) {
    const unitSel = document.getElementById('ask-unit');
    unitSel.innerHTML = '<option value="">Loading...</option>';
    unitSel.disabled = true;

    try {
        const data = await window.API.getUnitsBySubject(subjectId);
        const units = data.units || data || [];

        unitSel.innerHTML = '<option value="">— Select Unit (optional) —</option>';
        units.forEach(u => {
            unitSel.appendChild(new Option(u.name || `Unit ${u.unit_number}`, u.id));
        });
        unitSel.disabled = false;
    } catch (err) {
        console.error('Failed to load units:', err);
        unitSel.innerHTML = '<option value="">— Select Unit (optional) —</option>';
        unitSel.disabled = false;
    }
}

// ─── Load & Render Posts ──────────────────────────────────────────────────────
async function loadPosts() {
    const postsList = document.getElementById('posts-list');
    postsList.innerHTML = `<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><div class="mt-2 text-muted">Loading posts...</div></div>`;

    const params = { page: currentPage, limit: 10 };
    if (currentSubjectId) params.subject_id = currentSubjectId;
    if (currentStatus) params.status = currentStatus;
    if (currentSearch) params.search = currentSearch;

    try {
        const data = await window.API.getForumPosts(params);
        const posts = data.posts || (data.data && data.data.posts) || (Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []));
        const total = data.total || (data.data && data.data.total) || posts.length;
        const totalPages = data.totalPages || data.pages || Math.ceil(total / 10) || 1;

        if (posts.length === 0) {
            postsList.innerHTML = `
                <div class="text-center py-5 text-muted">
                    <i class="bi bi-chat-square-dots fs-1 d-block mb-3 opacity-50"></i>
                    <h5>No posts found</h5>
                    <p class="small">Be the first to ask a question!</p>
                    <button class="btn btn-primary" onclick="openAskModal()">
                        <i class="bi bi-plus-lg me-1"></i>Ask a Question
                    </button>
                </div>`;
        } else {
            postsList.innerHTML = posts.map(renderPost).join('');
        }

        renderPagination(currentPage, totalPages);
    } catch (err) {
        console.error('Failed to load posts:', err);
        postsList.innerHTML = `
            <div class="alert alert-danger">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Failed to load posts. Please try again.
                <button class="btn btn-sm btn-outline-danger ms-2" onclick="loadPosts()">Retry</button>
            </div>`;
    }
}

// ─── Render Single Post Card ──────────────────────────────────────────────────
function renderPost(post) {
    const rawTags = Array.isArray(post.tags) ? post.tags : (typeof post.tags === 'string' ? post.tags.split(',').map(t => t.trim()).filter(Boolean) : []);
    const tags = rawTags.map(t =>
        `<span class="badge bg-secondary me-1">${escapeHtml(t)}</span>`
    ).join('');

    const isSolved = post.is_solved || post.status === 'SOLVED';
    const statusBadge = isSolved
        ? `<span class="badge bg-success"><i class="bi bi-check-circle me-1"></i>Solved</span>`
        : `<span class="badge bg-primary">Open</span>`;

    const truncatedBody = (post.body || '').length > 150
        ? escapeHtml(post.body.substring(0, 150)) + '…'
        : escapeHtml(post.body || '');

    const subjectUnit = [post.subject_name, post.unit_name].filter(Boolean).join(' · ');
    const authorDate = `Asked by ${escapeHtml(post.author_name || 'Anonymous')} · ${timeAgo(post.created_at)}`;

    return `
    <div class="card-cq mb-3">
        <div class="card-body">
            <div class="d-flex gap-3">
                <!-- Vote / Reply counts -->
                <div class="text-center flex-shrink-0" style="min-width:50px">
                    <div class="fw-bold fs-5" id="vote-count-${post.id}">${post.vote_count || 0}</div>
                    <div class="small text-muted">votes</div>
                    <div class="mt-2">
                        <div class="fw-bold">${post.reply_count || 0}</div>
                        <div class="small text-muted">replies</div>
                    </div>
                </div>
                <!-- Content -->
                <div class="flex-grow-1 min-w-0">
                    <div class="d-flex align-items-center mb-1 gap-2 flex-wrap">
                        ${statusBadge}
                        ${tags}
                    </div>
                    <h5 class="mb-1">
                        <a href="forum-post.html?id=${post.id}" class="text-decoration-none">
                            ${escapeHtml(post.title)}
                        </a>
                    </h5>
                    <p class="text-muted small mb-2">${truncatedBody}</p>
                    <div class="d-flex justify-content-between align-items-center text-muted small flex-wrap gap-1">
                        <span>${escapeHtml(subjectUnit)}</span>
                        <span>${authorDate}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function renderPagination(page, totalPages) {
    const area = document.getElementById('pagination-area');
    if (totalPages <= 1) { area.innerHTML = ''; return; }

    let html = '';
    html += `<button class="btn btn-sm btn-outline-secondary" onclick="goToPage(${page - 1})" ${page <= 1 ? 'disabled' : ''}>
                <i class="bi bi-chevron-left"></i> Prev
             </button>`;
    html += `<span class="btn btn-sm btn-primary disabled">Page ${page} of ${totalPages}</span>`;
    html += `<button class="btn btn-sm btn-outline-secondary" onclick="goToPage(${page + 1})" ${page >= totalPages ? 'disabled' : ''}>
                Next <i class="bi bi-chevron-right"></i>
             </button>`;
    area.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    loadPosts();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ─── Open Ask Modal ───────────────────────────────────────────────────────────
function openAskModal() {
    const user = window.API.getUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    // Clear form
    document.getElementById('ask-title').value = '';
    document.getElementById('ask-body').value = '';
    document.getElementById('ask-tags').value = '';
    document.getElementById('ask-subject').value = '';
    document.getElementById('ask-unit').innerHTML = '<option value="">— Select Unit (optional) —</option>';
    document.getElementById('ask-unit').disabled = true;
    document.getElementById('ask-error').classList.add('d-none');

    const modal = new bootstrap.Modal(document.getElementById('askModal'));
    modal.show();
}

// ─── Submit Ask ───────────────────────────────────────────────────────────────
async function submitAsk() {
    const title = document.getElementById('ask-title').value.trim();
    const body = document.getElementById('ask-body').value.trim();
    const subjectId = document.getElementById('ask-subject').value || null;
    const unitId = document.getElementById('ask-unit').value || null;
    const tagsRaw = document.getElementById('ask-tags').value.trim();
    const tags = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean) : [];
    const errorEl = document.getElementById('ask-error');

    errorEl.classList.add('d-none');

    if (!title) {
        errorEl.textContent = 'Please enter a title for your question.';
        errorEl.classList.remove('d-none');
        return;
    }
    if (!body) {
        errorEl.textContent = 'Please enter a description for your question.';
        errorEl.classList.remove('d-none');
        return;
    }

    const btn = document.getElementById('btn-submit-ask');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Posting...';

    try {
        const payload = { title, body, tags };
        if (subjectId) payload.subject_id = parseInt(subjectId);
        if (unitId) payload.unit_id = parseInt(unitId);

        const result = await window.API.createForumPost(payload);
        const postData = result.post || result.data || result;
        const postId = postData ? postData.id : null;

        bootstrap.Modal.getInstance(document.getElementById('askModal')).hide();
        if (postId) {
            window.location.href = `forum-post.html?id=${postId}`;
        } else {
            loadPosts();
        }
    } catch (err) {
        console.error('Failed to create post:', err);
        errorEl.textContent = err.message || 'Failed to post question. Please try again.';
        errorEl.classList.remove('d-none');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-send me-1"></i>Post Question';
    }
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function timeAgo(dateStr) {
    if (!dateStr) return 'some time ago';
    const now = new Date();
    const then = new Date(dateStr);
    const diff = Math.floor((now - then) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    if (diff < 2592000) return `${Math.floor(diff / 604800)}w ago`;
    return then.toLocaleDateString();
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
