const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { verifyToken, isAdmin, isUser } = require('../middleware/authMiddleware');

// Validation middleware
const signupValidation = [
  body('fullName')
    .trim()
    .notEmpty()
    .withMessage('Full name is required')
    .isLength({ min: 2 })
    .withMessage('Full name must be at least 2 characters'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters')
];

const loginValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

// Public routes
router.post('/signup', signupValidation, authController.signup);
router.post('/signup/admin', signupValidation, authController.signup);
router.post('/login', loginValidation, authController.login);
router.post('/login/admin', loginValidation, authController.login);

// Protected routes
router.get('/profile', verifyToken, authController.getCurrentUser);
router.put('/profile', verifyToken, authController.updateProfile);
router.post('/change-password', verifyToken, authController.changePassword);
router.post('/logout', verifyToken, authController.logout);

// Admin only routes
router.get('/admin/profile', verifyToken, isAdmin, authController.getCurrentUser);

// User only routes
router.get('/user/profile', verifyToken, isUser, authController.getCurrentUser);

module.exports = router;
