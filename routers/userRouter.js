const express = require('express');

const router = express.Router();

const { signUp, verify, logIn, forgetPassword, resetPage, resetPassword, } = require('../controllers/userController');
const { authenticate } = require('../middleware/authenticate');

// Endpoint to register a new user
router.post('/sign-up', signUp);

// Endpoint to verify a new user
router.get('/verify/:userId/:token', verify);

// Endpoint to logIn a new user
router.post('/login', logIn);

// Endpoint to forget password
router.post('/reset', forgetPassword);

//Endpoint to load reset password page
router.get('/resetPage/:id', resetPage);

//Endpoint to reset user's password
router.put('/reset-password', resetPassword)


module.exports = router;