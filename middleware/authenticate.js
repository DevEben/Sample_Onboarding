const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');
require('dotenv').config();


const authenticate = async (req, res, next) => {
    try {
        const hasAuthorization = req.headers.authorization;
        if (!hasAuthorization) {
            return res.status(400).json({
                message: 'Invalid authorization'
            })
        }
        const token = hasAuthorization.split(' ')[1];
        if (!token) {
            return res.status(404).json({
                message: "Token not found"
            });
        }
        const decodedToken = jwt.verify(token, process.env.SECRET)
        if (!decodedToken) {
            return res.status(400).json({
                message: "Token not valid"
            });
        }        
        const user = await userModel.findById(decodedToken.userId);
        if (!user) {
            return res.status(404).json({
                message: "Not authorized! User not found"
            })
        }

        req.user = decodedToken

        next();
    } catch (err) {
        return res.status(500).json({
            Error: "Error authenticating user: "+err.message
        })
    }
};

module.exports = {
    authenticate,

}