const joi = require("@hapi/joi");

const validateSignUp = (data) => {
    try {
        const signUpSchema = joi.object({
            firstName: joi.string().min(3).max(30).regex(/^[a-zA-Z]+$/).required().messages({
                'string.empty': 'First name cannot be left empty', 
                'string.min': 'First name must be at least 3 characters long', 
                'any.required': 'First name is required', 
            }),
            lastName: joi.string().min(3).max(30).regex(/^[a-zA-Z]+$/).required().messages({
                'string.empty': 'Last name cannot be left empty', 
                'string.min': 'Last name must be at least 3 characters long', 
                'any.required': 'Last name is required', 
            }),
            userName: joi.string().min(3).max(30).alphanum().required().messages({
                'string.empty': 'username cannot be left empty', 
                'string.min': 'username must be at least 3 characters long', 
                'any.required': 'username is required', 
            }),
            email: joi.string().min(9).email({tlds: {allow: false}}).required().messages({
                'string.empty': 'email cannot be left empty', 
                'string.min': 'email must be at least 9 characters long', 
                'any.required': 'email is required', 
            }),
            password: joi.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/).required().messages({
                'string.empty': 'password cannot be left empty', 
                'string.min': 'password must be at least 8 characters long', 
                'any.required': 'password is required', 
            }),
        })
        return signUpSchema.validate(data);
        
    } catch (err) {
        res.status(500).json({
            Error: "Error validating user: "+err.message
        })
    }
}



const validateLogIn = (data) => {
    try {
        const signUpSchema = joi.object({
            userName: joi.string().min(3).max(30).alphanum().messages({
                'string.empty': 'username cannot be left empty', 
                'string.min': 'username must be at least 3 characters long', 
                'any.required': 'username is required', 
            }),
            email: joi.string().min(9).email({tlds: {allow: false}}).messages({
                'string.empty': 'email cannot be left empty', 
                'string.min': 'email must be at least 9 characters long', 
                'any.required': 'email is required', 
            }),
            password: joi.string().min(8).regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/).required().messages({
                'string.empty': 'password cannot be left empty', 
                'string.min': 'password must be at least 8 characters long', 
                'any.required': 'password is required', 
            }),
        })
        return signUpSchema.validate(data);
        
    } catch (err) {
        res.status(500).json({
            Error: "Error validating user: "+err.message
        })
    }
}



module.exports = {
    validateSignUp,
    validateLogIn,
}