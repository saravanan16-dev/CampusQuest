const db = require('../config/db');

// ─── Forum Posts ────────────────────────────────────────────────────────────

const createPost = async ({ user_id, subject_id, unit_id, title, body, tags }) => {
    const tagsStr = Array.isArray(tags) ? tags.join(', ') : (tags || null);
    const [result] = await db.query(
        `INSERT INTO forum_posts (user_id, subject_id, unit_id, title, body, tags)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [user_id, subject_id || null, unit_id || null, title, body, tagsStr]
    );
    return { id: result.insertId };
};

const getPostById = async (id) => {
    const [rows] = await db.query(
        `SELECT fp.*,
                u.name AS author_name,
                u.role AS author_role,
                s.name AS subject_name,
                un.name AS unit_name,
                un.unit_number,
                (SELECT COUNT(*) FROM forum_replies WHERE post_id = fp.id) AS reply_count,
                (SELECT COALESCE(SUM(CASE WHEN vote_type='UP' THEN 1 ELSE -1 END), 0)
                 FROM forum_votes WHERE post_id = fp.id) AS vote_count
         FROM forum_posts fp
         JOIN users u ON fp.user_id = u.id
         LEFT JOIN subjects s ON fp.subject_id = s.id
         LEFT JOIN units un ON fp.unit_id = un.id
         WHERE fp.id = ?`,
        [id]
    );
    return rows[0] || null;
};

const getPosts = async ({ subject_id, unit_id, status, search, page = 1, limit = 20 } = {}) => {
    const conditions = [];
    const params = [];

    if (subject_id) {
        conditions.push('fp.subject_id = ?');
        params.push(subject_id);
    }
    if (unit_id) {
        conditions.push('fp.unit_id = ?');
        params.push(unit_id);
    }
    if (status) {
        conditions.push('fp.status = ?');
        params.push(status);
    }
    if (search) {
        conditions.push('(fp.title LIKE ? OR fp.body LIKE ?)');
        const like = `%${search}%`;
        params.push(like, like);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (Number(page) - 1) * Number(limit);

    const [rows] = await db.query(
        `SELECT fp.*,
                u.name AS author_name,
                u.role AS author_role,
                s.name AS subject_name,
                un.name AS unit_name,
                un.unit_number,
                (SELECT COUNT(*) FROM forum_replies WHERE post_id = fp.id) AS reply_count,
                (SELECT COALESCE(SUM(CASE WHEN vote_type='UP' THEN 1 ELSE -1 END), 0)
                 FROM forum_votes WHERE post_id = fp.id) AS vote_count
         FROM forum_posts fp
         JOIN users u ON fp.user_id = u.id
         LEFT JOIN subjects s ON fp.subject_id = s.id
         LEFT JOIN units un ON fp.unit_id = un.id
         ${whereClause}
         ORDER BY fp.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, Number(limit), offset]
    );

    const [[{ total }]] = await db.query(
        `SELECT COUNT(*) AS total FROM forum_posts fp ${whereClause}`,
        params
    );

    return { posts: rows, total, page: Number(page), limit: Number(limit) };
};

const updatePost = async (id, { title, body, tags, status }) => {
    const tagsStr = tags !== undefined ? (Array.isArray(tags) ? tags.join(', ') : (tags || null)) : undefined;
    const [result] = await db.query(
        `UPDATE forum_posts SET title = COALESCE(?, title), body = COALESCE(?, body),
                tags = COALESCE(?, tags), status = COALESCE(?, status)
         WHERE id = ?`,
        [title || null, body || null, tagsStr !== undefined ? tagsStr : null, status || null, id]
    );
    return result;
};

const deletePost = async (id) => {
    const [result] = await db.query('DELETE FROM forum_posts WHERE id = ?', [id]);
    return result;
};

const markPostSolved = async (id, reply_id) => {
    const [result] = await db.query(
        `UPDATE forum_posts SET status = 'SOLVED', accepted_reply_id = ? WHERE id = ?`,
        [reply_id, id]
    );
    // Also mark the reply as accepted
    await db.query('UPDATE forum_replies SET is_accepted = TRUE WHERE id = ?', [reply_id]);
    return result;
};

const incrementPostViews = async (id) => {
    await db.query('UPDATE forum_posts SET views = views + 1 WHERE id = ?', [id]);
};

// ─── Forum Replies ───────────────────────────────────────────────────────────

const createReply = async ({ post_id, user_id, body, parent_reply_id }) => {
    const [result] = await db.query(
        `INSERT INTO forum_replies (post_id, user_id, body, parent_reply_id)
         VALUES (?, ?, ?, ?)`,
        [post_id, user_id, body, parent_reply_id || null]
    );
    return { id: result.insertId };
};

const getRepliesByPost = async (post_id) => {
    const [rows] = await db.query(
        `SELECT fr.*,
                u.name AS author_name,
                u.role AS author_role,
                COALESCE(SUM(CASE WHEN fv.vote_type='UP' THEN 1
                                  WHEN fv.vote_type='DOWN' THEN -1
                                  ELSE 0 END), 0) AS vote_count
         FROM forum_replies fr
         JOIN users u ON fr.user_id = u.id
         LEFT JOIN forum_votes fv ON fv.reply_id = fr.id
         WHERE fr.post_id = ?
         GROUP BY fr.id
         ORDER BY fr.is_accepted DESC, vote_count DESC, fr.created_at ASC`,
        [post_id]
    );
    return rows;
};

const updateReply = async (id, { body }) => {
    const [result] = await db.query(
        'UPDATE forum_replies SET body = ? WHERE id = ?',
        [body, id]
    );
    return result;
};

const deleteReply = async (id) => {
    const [result] = await db.query('DELETE FROM forum_replies WHERE id = ?', [id]);
    return result;
};

const getReplyById = async (id) => {
    const [rows] = await db.query('SELECT * FROM forum_replies WHERE id = ?', [id]);
    return rows[0] || null;
};

// ─── Votes ───────────────────────────────────────────────────────────────────

const votePost = async (user_id, post_id, vote_type) => {
    const [result] = await db.query(
        `INSERT INTO forum_votes (user_id, post_id, vote_type)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE vote_type = VALUES(vote_type)`,
        [user_id, post_id, vote_type]
    );
    return result;
};

const voteReply = async (user_id, reply_id, vote_type) => {
    const [result] = await db.query(
        `INSERT INTO forum_votes (user_id, reply_id, vote_type)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE vote_type = VALUES(vote_type)`,
        [user_id, reply_id, vote_type]
    );
    return result;
};

const getUserVoteOnPost = async (user_id, post_id) => {
    const [rows] = await db.query(
        'SELECT vote_type FROM forum_votes WHERE user_id = ? AND post_id = ?',
        [user_id, post_id]
    );
    return rows[0] || null;
};

const getUserVoteOnReply = async (user_id, reply_id) => {
    const [rows] = await db.query(
        'SELECT vote_type FROM forum_votes WHERE user_id = ? AND reply_id = ?',
        [user_id, reply_id]
    );
    return rows[0] || null;
};

const getReplyVoteCount = async (reply_id) => {
    const [rows] = await db.query(
        `SELECT COALESCE(SUM(CASE WHEN vote_type='UP' THEN 1 WHEN vote_type='DOWN' THEN -1 ELSE 0 END), 0) AS vote_count
         FROM forum_votes WHERE reply_id = ?`,
        [reply_id]
    );
    return rows[0] ? Number(rows[0].vote_count) : 0;
};

module.exports = {
    createPost,
    getPostById,
    getPosts,
    updatePost,
    deletePost,
    markPostSolved,
    incrementPostViews,
    createReply,
    getRepliesByPost,
    updateReply,
    deleteReply,
    getReplyById,
    votePost,
    voteReply,
    getUserVoteOnPost,
    getUserVoteOnReply,
    getReplyVoteCount
};
