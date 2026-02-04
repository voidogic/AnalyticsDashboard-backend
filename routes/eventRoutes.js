const express = require('express');
const { body } = require('express-validator');
const eventController = require('../controllers/eventController');
const { verifyToken, isAdmin, isUser } = require('../middleware/authMiddleware');


const router = express.Router();

// Validation rules
const eventValidation = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Event name is required and must be less than 100 characters'),
  body('description').trim().isLength({ min: 1, max: 500 }).withMessage('Description is required and must be less than 500 characters'),
  body('year').isInt({ min: 2020, max: 2030 }).withMessage('Year must be between 2020 and 2030'),
  body('startDate').isISO8601().withMessage('Valid start date is required'),
  body('endDate').isISO8601().withMessage('Valid end date is required'),
  body('venue').trim().isLength({ min: 1 }).withMessage('Venue is required'),
  body('totalBudget').isFloat({ min: 0 }).withMessage('Total budget must be a positive number')
];

const subEventValidation = [
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('Sub-event name is required'),
  body('description').trim().isLength({ min: 1, max: 300 }).withMessage('Description is required'),
  body('event').isMongoId().withMessage('Valid event ID is required'),
  body('startTime').isISO8601().withMessage('Valid start time is required'),
  body('endTime').isISO8601().withMessage('Valid end time is required'),
  body('maxParticipants').isInt({ min: 1 }).withMessage('Max participants must be at least 1'),
  body('registrationFee').isFloat({ min: 0 }).withMessage('Registration fee must be non-negative')
];

const registrationValidation = [
  body('subEventId').isMongoId().withMessage('Valid sub-event ID is required')
];

// Event Routes (Admin only)

router.post('/events', verifyToken, isAdmin, eventValidation, eventController.createEvent);
router.get('/events', verifyToken, eventController.getAllEvents);
router.get('/events/:id', verifyToken, eventController.getEventById);
router.put('/events/:id', verifyToken, isAdmin, eventValidation, eventController.updateEvent);
router.delete('/events/:id', verifyToken, isAdmin, eventController.deleteEvent);

// Sub-Event Routes (Admin only)
router.post('/sub-events', verifyToken, isAdmin, subEventValidation, eventController.createSubEvent);
router.get('/events/:eventId/sub-events', verifyToken, eventController.getSubEventsByEvent);
router.put('/sub-events/:id', verifyToken, isAdmin, subEventValidation, eventController.updateSubEvent);
router.delete('/sub-events/:id', verifyToken, isAdmin, eventController.deleteSubEvent);

// Registration Routes (User only)
router.post('/register', verifyToken, isUser, registrationValidation, eventController.registerForEvent);
router.get('/my-registrations', verifyToken, isUser, eventController.getStudentRegistrations);

// Registration Status (Admin only)
router.put(
  '/registrations/:id/status',
  verifyToken,
  isAdmin,
  [
    body('status')
      .isIn(['registered', 'confirmed', 'attended', 'cancelled'])
      .withMessage('Invalid status')
  ],
  eventController.updateRegistrationStatus
);

module.exports = router;
