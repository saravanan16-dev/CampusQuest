const express = require('express');
const {
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
} = require('../controllers/forumController');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
const optionalAuth = authMiddleware.optional || ((req, res, next) => next());

// IMPORTANT: Static sub-paths (/replies/:replyId) must come BEFORE the dynamic /:id routes.

// Reply-specific routes (must precede /:id to avoid conflict)
router.put('/forum/replies/:replyId', authMiddleware, updateReply);
router.delete('/forum/replies/:replyId', authMiddleware, deleteReply);
router.post('/forum/replies/:replyId/vote', authMiddleware, voteReply);

// Post routes
router.get('/forum', optionalAuth, getPosts);
router.get('/forum/:id', optionalAuth, getPost);
router.post('/forum', authMiddleware, createPost);
router.put('/forum/:id', authMiddleware, updatePost);
router.delete('/forum/:id', authMiddleware, deletePost);
router.put('/forum/:id/solve', authMiddleware, markSolved);

// Reply routes scoped to a post
router.get('/forum/:id/replies', optionalAuth, getReplies);
router.post('/forum/:id/replies', authMiddleware, createReply);

// Vote on a post
router.post('/forum/:id/vote', authMiddleware, votePost);

module.exports = router;
