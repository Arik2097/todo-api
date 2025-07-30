const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const logger = require('../config/logger');
const router = express.Router();


const generateToken = (userId) => {
    return jwt.sign({ userId }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: "1h" });
};

router.post("/register", async (req, res) => {
    try {
        const { name, email, password } = req.body;

        logger.info(`Registration attempt for email: ${email}`);

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            logger.warn(`Registration failed - user already exists: ${email}`);
            return res.status(400).json({
                success: false,
                message: "User already exists"
            });
        }

        const user = new User({ name, email, password });
        await user.save();

        const token = generateToken(user._id);

        logger.info(`User registered successfully: ${email}`);

        res.status(201).json({
            success: true,
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        logger.error(`Registration error: ${error.message}`);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        logger.info(`Login attempt for email: ${email}`);

        const user = await User.findOne({ email });
        if (!user) {
            logger.warn(`Login failed - user not found: ${email}`);


            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const isPasswordValid = await user.comparePassword(password);
        if (!isPasswordValid) {
            logger.warn(`Login failed - invalid password for: ${email}`);
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        const token = generateToken(user._id);

        logger.info(`User logged in successfully: ${email}`);

        res.json({
            success: true,
            token,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        logger.error(`Login error: ${error.message}`);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});


module.exports = router;