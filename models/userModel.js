const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String, 
    },
    lastName: {
        type: String, 
    },
    userName: {
        type: String, 
    },
    email: {
        type: String, 
    },
    password:{
        type: String, 
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    token: {
        type: String, 
    }
});

const userModel = mongoose.model("sampleUsers", userSchema);

module.exports = userModel;