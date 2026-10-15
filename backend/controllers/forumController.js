const forumModel = require('../models/forumModel');

// ─── Helper ──────────────────────────────────────────────────────────────────
const checkIsAdmin = (user) => {
    return Boolean(user && user.role && user.role.toUpperCase() === 'ADMIN');
};

// ─── Posts ───────────────────────────────────────────────────────────────────

const getPosts = async (req, res) => {
    try {
        const { subject_id, unit_id, status, search, page, limit } = req.query;
        const result = await forumModel.getPosts({ subject_id, unit_id, status, search, page, limit });
        res.json({ success: true, ...result, data: result });
    } catch (error) {
        console.error('getPosts error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch posts' });
    }
};

const getPost = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await forumModel.getPostById(id);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }

        // Increment view count (non-blocking)
        forumModel.incrementPostViews(id).catch(() => {});

        // Attach the current user's vote if authenticated
        let userVote = null;
        if (req.user) {
            userVote = await forumModel.getUserVoteOnPost(req.user.id, id);
        }

        res.json({
            success: true,
            ...post,
            userVote,
            data: { ...post, userVote },
            post: { ...post, userVote }
        });
    } catch (error) {
        console.error('getPost error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch post' });
    }
};

const createPost = async (req, res) => {
    try {
        const { subject_id, unit_id, title, body, tags } = req.body;
        if (!title || !body) {
            return res.status(400).json({ success: false, message: 'Title and body are required' });
        }
        const result = await forumModel.createPost({
            user_id: req.user.id,
            subject_id,
            unit_id,
            title,
            body,
            tags
        });
        const post = await forumModel.getPostById(result.id);
        res.status(201).json({ success: true, ...post, data: post, post });
    } catch (error) {
        console.error('createPost error:', error);
        res.status(500).json({ success: false, message: 'Failed to create post' });
    }
};

const updatePost = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await forumModel.getPostById(id);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }
        const isAdmin = checkIsAdmin(req.user);
        if (post.user_id !== req.user.id && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Forbidden: not the post owner' });
        }
        const { title, body, tags, status } = req.body;
        await forumModel.updatePost(id, { title, body, tags, status });
        const updated = await forumModel.getPostById(id);
        res.json({ success: true, ...updated, data: updated, post: updated });
    } catch (error) {
        console.error('updatePost error:', error);
        res.status(500).json({ success: false, message: 'Failed to update post' });
    }
};

const deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await forumModel.getPostById(id);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }
        const isAdmin = checkIsAdmin(req.user);
        if (post.user_id !== req.user.id && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Forbidden: not the post owner' });
        }
        await forumModel.deletePost(id);
        res.json({ success: true, message: 'Post deleted successfully', data: { message: 'Post deleted successfully' } });
    } catch (error) {
        console.error('deletePost error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete post' });
    }
};

const markSolved = async (req, res) => {
    try {
        const { id } = req.params;
        const { reply_id } = req.body;
        if (!reply_id) {
            return res.status(400).json({ success: false, message: 'reply_id is required' });
        }
        const post = await forumModel.getPostById(id);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }
        const isAdmin = checkIsAdmin(req.user);
        if (post.user_id !== req.user.id && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Forbidden: not the post owner' });
        }
        const reply = await forumModel.getReplyById(reply_id);
        if (!reply || String(reply.post_id) !== String(id)) {
            return res.status(404).json({ success: false, message: 'Reply not found on this post' });
        }
        await forumModel.markPostSolved(id, reply_id);
        const updated = await forumModel.getPostById(id);
        res.json({ success: true, ...updated, data: updated, post: updated });
    } catch (error) {
        console.error('markSolved error:', error);
        res.status(500).json({ success: false, message: 'Failed to mark post as solved' });
    }
};

// ─── Replies ─────────────────────────────────────────────────────────────────

const getReplies = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await forumModel.getPostById(id);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }
        const replies = await forumModel.getRepliesByPost(id);
        res.json({ success: true, replies, data: replies });
    } catch (error) {
        console.error('getReplies error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch replies' });
    }
};

const createReply = async (req, res) => {
    try {
        const { id } = req.params;
        const { body, parent_reply_id } = req.body;
        if (!body) {
            return res.status(400).json({ success: false, message: 'Reply body is required' });
        }
        const post = await forumModel.getPostById(id);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }
        const result = await forumModel.createReply({
            post_id: id,
            user_id: req.user.id,
            body,
            parent_reply_id
        });
        const reply = await forumModel.getReplyById(result.id);
        res.status(201).json({ success: true, ...reply, data: reply, reply });
    } catch (error) {
        console.error('createReply error:', error);
        res.status(500).json({ success: false, message: 'Failed to create reply' });
    }
};

const updateReply = async (req, res) => {
    try {
        const { replyId } = req.params;
        const reply = await forumModel.getReplyById(replyId);
        if (!reply) {
            return res.status(404).json({ success: false, message: 'Reply not found' });
        }
        const isAdmin = checkIsAdmin(req.user);
        if (reply.user_id !== req.user.id && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Forbidden: not the reply owner' });
        }
        const { body } = req.body;
        if (!body) {
            return res.status(400).json({ success: false, message: 'Reply body is required' });
        }
        await forumModel.updateReply(replyId, { body });
        const updated = await forumModel.getReplyById(replyId);
        res.json({ success: true, ...updated, data: updated, reply: updated });
    } catch (error) {
        console.error('updateReply error:', error);
        res.status(500).json({ success: false, message: 'Failed to update reply' });
    }
};

const deleteReply = async (req, res) => {
    try {
        const { replyId } = req.params;
        const reply = await forumModel.getReplyById(replyId);
        if (!reply) {
            return res.status(404).json({ success: false, message: 'Reply not found' });
        }
        const isAdmin = checkIsAdmin(req.user);
        if (reply.user_id !== req.user.id && !isAdmin) {
            return res.status(403).json({ success: false, message: 'Forbidden: not the reply owner' });
        }
        await forumModel.deleteReply(replyId);
        res.json({ success: true, message: 'Reply deleted successfully', data: { message: 'Reply deleted successfully' } });
    } catch (error) {
        console.error('deleteReply error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete reply' });
    }
};

// ─── Votes ───────────────────────────────────────────────────────────────────

const votePost = async (req, res) => {
    try {
        const { id } = req.params;
        const { vote_type } = req.body;
        if (!['UP', 'DOWN'].includes(vote_type)) {
            return res.status(400).json({ success: false, message: 'vote_type must be UP or DOWN' });
        }
        const post = await forumModel.getPostById(id);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found' });
        }
        await forumModel.votePost(req.user.id, id, vote_type);
        const userVote = await forumModel.getUserVoteOnPost(req.user.id, id);
        const updated = await forumModel.getPostById(id);
        res.json({
            success: true,
            vote_count: updated.vote_count,
            userVote,
            data: { vote_count: updated.vote_count, userVote }
        });
    } catch (error) {
        console.error('votePost error:', error);
        res.status(500).json({ success: false, message: 'Failed to vote on post' });
    }
};

const voteReply = async (req, res) => {
    try {
        const { replyId } = req.params;
        const { vote_type } = req.body;
        if (!['UP', 'DOWN'].includes(vote_type)) {
            return res.status(400).json({ success: false, message: 'vote_type must be UP or DOWN' });
        }
        const reply = await forumModel.getReplyById(replyId);
        if (!reply) {
            return res.status(404).json({ success: false, message: 'Reply not found' });
        }
        await forumModel.voteReply(req.user.id, replyId, vote_type);
        const userVote = await forumModel.getUserVoteOnReply(req.user.id, replyId);
        const vote_count = await forumModel.getReplyVoteCount(replyId);
        res.json({
            success: true,
            vote_count,
            userVote,
            data: { vote_count, userVote }
        });
    } catch (error) {
        console.error('voteReply error:', error);
        res.status(500).json({ success: false, message: 'Failed to vote on reply' });
    }
};

module.exports = {
    getPosts,
    getPost,
    createPost,
    updatePost,
    deletePost,
    markSolved,
    getReplies,
    createReply,
    updateReply,
    deleteReply,
    votePost,
    voteReply
};
