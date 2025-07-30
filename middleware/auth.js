const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ 
                success: false, 
                error: 'Access denied. No token provided.' 
            });
        }
        
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
        
        const user = await User.findById(decoded.userId);
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                error: 'Token is valid but user not found.' 
            });
        }
        
        req.user = user;
        next();
        
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid token.' 
            });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                success: false, 
                error: 'Token expired.' 
            });
        }
        
        res.status(500).json({ 
            success: false, 
            error: 'Server error during authentication.' 
        });
    }
};

module.exports = auth;