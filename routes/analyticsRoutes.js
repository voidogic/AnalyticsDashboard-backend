const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { verifyToken, isAdmin, isUser } = require('../middleware/authMiddleware');

// All analytics routes require authentication
router.use(verifyToken);

// Yearly overview analytics (admin)
router.get('/yearly-overview', isAdmin, analyticsController.getYearlyOverview);

// Yearly trends for charts (admin)
router.get('/yearly-trends', isAdmin, analyticsController.getYearlyTrends);

// Revenue per event (admin)
router.get('/revenue-per-event', isAdmin, analyticsController.getRevenuePerEvent);

// Participation ratio for specific event (admin)
router.get('/participation-ratio/:eventId', isAdmin, analyticsController.getParticipationRatio);

// Event-wise analytics (admin)
router.get('/event/:eventId', isAdmin, analyticsController.getEventAnalytics);

// Student analytics (user)
router.get('/student', isUser, analyticsController.getStudentAnalytics);

module.exports = router;
