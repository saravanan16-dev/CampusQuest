/**
 * CampusQuest - Forum Post JS
 * Handles forum-post.html: loading post details, replies, voting, accepting answers, submitting replies
 */

let currentPost = null;
let currentUser = null;

// ─── Initialise ───────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    currentUser = window.API.getUser();

    const params = new URLSearchParams(window.location.search);
    const rawPostId = params.get('id');
    const postId = rawPostId ? rawPostId.toString().trim().replace(/[^0-9]/g, '') : null;

    if (!postId) {
        document.getElementById('post-container').innerHTML = `
            <div class="alert alert-warning text-center py-4">
                <i class="bi bi-exclamation-triangle fs-2 d-block mb-2 text-warning"></i>
                <h5 class="fw-bold">No Question Selected</h5>
                <p class="text-muted small">Please choose a question from the forum list.</p>
                <a href="forum.html" class="btn btn-primary btn-sm"><i class="bi bi-arrow-left me-1"></i>Back to Forum</a>
            </div>`;
        return;
    }

    loadPost(postId);
});

// ─── Load Post ────────────────────────────────────────────────────────────────
async function loadPost(postId) {
    try {
        const data = await window.API.getForumPost(postId);
        currentPost = data.post || (data.data && data.data.post) || data.data || data;

        if (!currentPost || !currentPost.title) {
            throw new Error('Question not found or removed');
        }

        document.title = `${currentPost.title} - CampusQuest Forum`;
        renderPost(currentPost);

        // Fetch replies after post container is rendered in DOM
        await loadReplies(postId);
    } catch (err) {
        console.error('Failed to load post:', err);
        document.getElementById('post-container').innerHTML = `
            <div class="alert alert-danger text-center py-4">
                <i class="bi bi-exclamation-circle fs-2 d-block mb-2 text-danger"></i>
                <h5 class="fw-bold">Failed to Load Question</h5>
                <p class="text-muted small mb-3">${escapeHtml(err.message || 'Could not fetch question.')}</p>
                <a href="forum.html" class="btn btn-outline-danger btn-sm"><i class="bi bi-arrow-left me-1"></i>Back to Forum</a>
            </div>`;
    }
}

// ─── Render Post ──────────────────────────────────────────────────────────────
function renderPost(post) {
    const rawTags = Array.isArray(post.tags) ? post.tags : (typeof post.tags === 'string' ? post.tags.split(',').map(t => t.trim()).filter(Boolean) : []);
    const tags = rawTags.map(t =>
        `<span class="badge bg-secondary me-1">${escapeHtml(t)}</span>`
    ).join('');

    const isSolved = post.is_solved || post.status === 'SOLVED';
    const solvedBadge = isSolved
        ? `<span class="badge bg-success me-1"><i class="bi bi-check-circle me-1"></i>Solved</span>`
        : `<span class="badge bg-primary me-1">Open</span>`;

    const subjectUnit = [post.subject_name, post.unit_name].filter(Boolean).join(' · ');
    const authorDate = `Asked by ${escapeHtml(post.author_name || 'Anonymous')} · ${timeAgo(post.created_at)}`;

    const isOwner = currentUser && currentPost && (
        String(currentUser.id) === String(currentPost.user_id) ||
        String(currentUser.id) === String(currentPost.author_id)
    );

    const container = document.getElementById('post-container');
    container.innerHTML = `
        <!-- Post Card -->
        <div class="card-cq p-4 mb-4">
            <div class="d-flex align-items-start gap-3">
                <!-- Vote Buttons -->
                <div class="text-center flex-shrink-0" style="min-width:50px">
                    <button class="btn btn-sm btn-outline-success d-block w-100 mb-1" id="btn-vote-up-post" onclick="votePost('UP')">
                        <i class="bi bi-caret-up-fill fs-4"></i>
                    </button>
                    <div class="fw-bold fs-5 my-1" id="post-vote-count">${post.vote_count || 0}</div>
                    <button class="btn btn-sm btn-outline-danger d-block w-100" id="btn-vote-down-post" onclick="votePost('DOWN')">
                        <i class="bi bi-caret-down-fill fs-4"></i>
                    </button>
                </div>
                <!-- Post Content -->
                <div class="flex-grow-1 min-w-0">
                    <div class="mb-2 d-flex gap-2 flex-wrap" id="post-meta-badges">
                        ${solvedBadge}${tags}
                    </div>
                    <h3 id="post-title" class="fw-bold">${escapeHtml(post.title)}</h3>
                    <div id="post-body" class="mb-3 fs-6" style="white-space: pre-wrap; line-height: 1.6;">${escapeHtml(post.body || '')}</div>
                    <div class="d-flex justify-content-between align-items-center text-muted small flex-wrap gap-1">
                        <span id="post-subject-unit"><i class="bi bi-book me-1"></i>${escapeHtml(subjectUnit || 'General Engineering')}</span>
                        <span id="post-author-date">${authorDate}</span>
                    </div>
                    ${isOwner && !isSolved ? `
                    <div class="mt-3 d-flex gap-2">
                        <button class="btn btn-sm btn-outline-danger" onclick="deletePost(${post.id})">
                            <i class="bi bi-trash me-1"></i>Delete Question
                        </button>
                    </div>` : ''}
                </div>
            </div>
        </div>

        <!-- Replies Heading -->
        <h5 id="replies-heading" class="mb-3 fw-bold">
            <i class="bi bi-chat-text me-2 text-primary"></i>Answers & Discussion
            <span class="badge bg-secondary ms-1" id="reply-count-badge">${post.reply_count || 0}</span>
        </h5>

        <!-- Replies List -->
        <div id="replies-list">
            <div class="text-center py-3">
                <div class="spinner-border spinner-border-sm text-primary"></div>
                <span class="ms-2 text-muted">Loading answers...</span>
            </div>
        </div>

        <!-- Write Reply -->
        <div class="card-cq p-4 mt-4" id="reply-form-section">
            <h6 class="fw-bold mb-3"><i class="bi bi-reply me-2 text-primary"></i>Your Answer / Solution</h6>
            <div id="reply-error" class="alert alert-danger d-none"></div>
            ${currentUser ? `
            <textarea class="form-control mb-3" id="reply-body" rows="4"
                      placeholder="Explain your approach, cite concepts, or provide the step-by-step solution..."></textarea>
            <button class="btn btn-primary" id="btn-submit-reply" onclick="submitReply()">
                <i class="bi bi-send me-1"></i>Post Answer
            </button>` : `
            <div class="alert alert-info mb-0">
                <i class="bi bi-info-circle me-2"></i>
                Please <a href="login.html" class="fw-bold">Sign In</a> to answer this doubt.
            </div>`}
        </div>`;
}

// ─── Load Replies ─────────────────────────────────────────────────────────────
async function loadReplies(postId) {
    try {
        const data = await window.API.getForumReplies(postId);
        const replies = data.replies || (Array.isArray(data.data) ? data.data : (Array.isArray(data) ? data : []));

        const el = document.getElementById('replies-list');
        if (!el) return;

        if (replies.length === 0) {
            el.innerHTML = `
                <div class="text-center py-4 text-muted card-cq p-4">
                    <i class="bi bi-chat-square fs-2 d-block mb-2 opacity-50"></i>
                    No answers yet. Be the first to solve this question!
                </div>`;
            const badgeCount = document.getElementById('reply-count-badge');
            if (badgeCount) badgeCount.textContent = '0';
            return;
        }

        // Sort: accepted first, then by vote_count desc
        replies.sort((a, b) => {
            if (a.is_accepted && !b.is_accepted) return -1;
            if (!a.is_accepted && b.is_accepted) return 1;
            return (b.vote_count || 0) - (a.vote_count || 0);
        });

        const badgeCount = document.getElementById('reply-count-badge');
        if (badgeCount) badgeCount.textContent = replies.length;

        el.innerHTML = replies.map(r => renderReplyCard(r, currentPost)).join('');
    } catch (err) {
        console.error('Failed to load replies:', err);
        const el = document.getElementById('replies-list');
        if (el) {
            el.innerHTML = `<div class="alert alert-danger">Failed to load answers.</div>`;
        }
    }
}

// ─── Render Reply Card ────────────────────────────────────────────────────────
function renderReplyCard(reply, post) {
    const isOwner = currentUser && post && (
        String(currentUser.id) === String(post.user_id) ||
        String(currentUser.id) === String(post.author_id)
    );
    const isSolved = post && (post.is_solved || post.status === 'SOLVED');
    const canAccept = isOwner && !isSolved && !reply.is_accepted;
    const roleUpper = (reply.author_role || '').toUpperCase();
    const isAdmin = roleUpper === 'ADMIN' || roleUpper === 'TEACHER';
    const borderColor = reply.is_accepted ? '#198754' : 'transparent';

    const acceptedBanner = reply.is_accepted
        ? `<span class="badge bg-success me-1"><i class="bi bi-check-circle me-1"></i>Accepted Answer</span>`
        : '';
    const teacherBadge = isAdmin
        ? `<span class="badge bg-warning text-dark me-1"><i class="bi bi-patch-check-fill me-1"></i>Teacher</span>`
        : `<span class="badge bg-secondary me-1">Student</span>`;

    const acceptBtn = canAccept
        ? `<button class="btn btn-sm btn-outline-success mt-2" id="btn-accept-${reply.id}" onclick="acceptReply(${reply.id})">
               <i class="bi bi-check2-circle me-1"></i>Mark as Accepted Answer
           </button>`
        : '';

    return `
    <div class="card-cq mb-3 border-start border-4" id="reply-${reply.id}"
         style="border-left-color: ${borderColor} !important;">
        <div class="card-body d-flex gap-3">
            <!-- Vote Buttons -->
            <div class="text-center flex-shrink-0" style="min-width:50px">
                <button class="btn btn-sm btn-outline-success d-block w-100 mb-1"
                        onclick="voteReply(${reply.id},'UP')">
                    <i class="bi bi-caret-up"></i>
                </button>
                <div class="fw-bold my-1" id="reply-vote-${reply.id}">${reply.vote_count || 0}</div>
                <button class="btn btn-sm btn-outline-danger d-block w-100"
                        onclick="voteReply(${reply.id},'DOWN')">
                    <i class="bi bi-caret-down"></i>
                </button>
            </div>
            <!-- Reply Content -->
            <div class="flex-grow-1 min-w-0">
                <div class="mb-2 d-flex flex-wrap align-items-center gap-1">
                    ${acceptedBanner}
                    ${teacherBadge}
                    <span class="text-muted small">
                        ${escapeHtml(reply.author_name || 'Anonymous')} · ${timeAgo(reply.created_at)}
                    </span>
                </div>
                <div style="white-space: pre-wrap; line-height: 1.6;">${escapeHtml(reply.body || '')}</div>
                ${acceptBtn}
            </div>
        </div>
    </div>`;
}

// ─── Vote Post ────────────────────────────────────────────────────────────────
async function votePost(type) {
    if (!currentUser) { window.location.href = 'login.html'; return; }
    if (!currentPost) return;

    try {
        const data = await window.API.voteForumPost(currentPost.id, type);
        const newCount = (data.vote_count !== undefined) ? data.vote_count : (data.data ? data.data.vote_count : (data.post || {}).vote_count);
        const el = document.getElementById('post-vote-count');
        if (el && newCount !== undefined) el.textContent = newCount;
    } catch (err) {
        console.error('Vote failed:', err);
    }
}

// ─── Vote Reply ───────────────────────────────────────────────────────────────
async function voteReply(replyId, type) {
    if (!currentUser) { window.location.href = 'login.html'; return; }

    try {
        const data = await window.API.voteForumReply(replyId, type);
        const newCount = (data.vote_count !== undefined) ? data.vote_count : (data.data ? data.data.vote_count : (data.reply || {}).vote_count);
        const el = document.getElementById(`reply-vote-${replyId}`);
        if (el && newCount !== undefined) el.textContent = newCount;
    } catch (err) {
        console.error('Reply vote failed:', err);
    }
}

// ─── Accept Reply ─────────────────────────────────────────────────────────────
async function acceptReply(replyId) {
    if (!currentUser || !currentPost) return;

    const btn = document.getElementById(`btn-accept-${replyId}`);
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Marking...'; }

    try {
        await window.API.markForumPostSolved(currentPost.id, replyId);
        // Reload post & replies to update state
        await loadPost(currentPost.id);
    } catch (err) {
        console.error('Accept reply failed:', err);
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="bi bi-check2-circle me-1"></i>Mark as Accepted Answer'; }
    }
}

// ─── Submit Reply ─────────────────────────────────────────────────────────────
async function submitReply() {
    if (!currentUser) { window.location.href = 'login.html'; return; }
    if (!currentPost) return;

    const body = document.getElementById('reply-body').value.trim();
    const errorEl = document.getElementById('reply-error');
    errorEl.classList.add('d-none');

    if (!body) {
        errorEl.textContent = 'Please write an answer before submitting.';
        errorEl.classList.remove('d-none');
        return;
    }

    const btn = document.getElementById('btn-submit-reply');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Posting...';

    try {
        await window.API.createForumReply(currentPost.id, { body });
        document.getElementById('reply-body').value = '';
        // Reload replies
        await loadReplies(currentPost.id);
        // Scroll to replies
        document.getElementById('replies-list').scrollIntoView({ behavior: 'smooth' });
    } catch (err) {
        console.error('Submit reply failed:', err);
        errorEl.textContent = err.message || 'Failed to post answer. Please try again.';
        errorEl.classList.remove('d-none');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-send me-1"></i>Post Answer';
    }
}

// ─── Delete Post ──────────────────────────────────────────────────────────────
async function deletePost(postId) {
    if (!confirm('Are you sure you want to delete this question? This cannot be undone.')) return;

    try {
        await window.API.deleteForumPost(postId);
        window.location.href = 'forum.html';
    } catch (err) {
        console.error('Delete post failed:', err);
        alert('Failed to delete question: ' + (err.message || 'Unknown error'));
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
