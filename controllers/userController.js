require("../models/userModel");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { validateSignUp, validateLogIn, } = require("../middleware/validator");
const userModel = require("../models/userModel");
require("dotenv").config();
const sendMail = require("../email");
const { generateDynamicEmail } = require("../emailText");
const {resetFunc} = require("../forgot");
const resetHTML = require("../resetHTML");

//Function to signUp a new user
const signUp = async (req, res) => {
    try {
        const { error } = validateSignUp(req.body);
        if (error) {
            return res.status(500).json({
                message: error.details[0].message,
            })
        } else {
            const userData = {
                firstName: req.body.firstName.trim(),
                lastName: req.body.lastName.trim(),
                userName: req.body.userName.trim(),
                email: req.body.email.trim(),
                password: req.body.password.trim()
            }

            const checkEmail = await userModel.findOne({ email: userData.email.toLowerCase() });
            if (checkEmail) {
                return res.status(200).json({
                    message: "User with the email already exists"
                })
            }

            const titleCase = (inputWord) => {
                word = inputWord.toLowerCase()
                firstLetter = inputWord.charAt(0).toUpperCase()
                return firstLetter + (word.slice(1))
            }

            const salt = bcrypt.genSaltSync(12)
            const hashedPassword = bcrypt.hashSync(userData.password, salt);

            const user = new userModel({
                firstName: titleCase(userData.firstName),
                lastName: titleCase(userData.lastName),
                userName: userData.userName.toLowerCase(),
                email: userData.email.toLowerCase(),
                password: hashedPassword
            })

            const token = jwt.sign({ userId: user._id, userName: user.userName, email: user.email }, process.env.SECRET, { expiresIn: "300s" })
            user.token = token

            const subject = "VERIFY YOUR ACCOUNT";
            const link = `${req.protocol}://${req.get('host')}/api/v1/verify/${user.id}/${user.token}`;
            const html = generateDynamicEmail(user.userName, link);

            sendMail({
                email: user.email,
                html,
                subject
            })
            await user.save();
            return res.status(200).json({
                message: "user registered successfully",
                data: {
                    firstName: user.firstName,
                    lastName: user.lastName,
                    userName: user.userName,
                    email: user.email,
                    token: user.token,
                    isVerified: user.isVerified
                }
            })
        }
    } catch (err) {
        return res.status(500).json({
            message: "Internal server error: " + err.message,
        })
    }
};


// Function to verify a new user 
const verify = async (req, res) => {
    try {
        const userId = req.params.userId;
        const user = await userModel.findById(userId);

        if (!user) {
            return res.status(404).send("User not found");
        }

        // Verify the initial token
        jwt.verify(user.token, process.env.SECRET);

        // Check verification status
        if (!user.isVerified) {
            // Update isVerified status to true
            await userModel.findByIdAndUpdate(userId, { isVerified: true }, { new: true });
            return res.status(200).send("You've been successfully verified. Kindly visit the Log in page to continue.");
        }

        // Refresh token if expired
        try {
            await new Promise((resolve, reject) => {
                jwt.verify(user.token, process.env.SECRET, (err) => {
                    if (err instanceof jwt.JsonWebTokenError) {
                        // Generate a new token and update user
                        const newToken = jwt.sign({ userId: user._id, userName: user.userName, email: user.email }, process.env.SECRET, { expiresIn: "300s" });
                        user.token = newToken;
                        user.save();

                        // Send email for re-verification
                        const subject = "RE-VERIFY YOUR ACCOUNT";
                        const link = `${req.protocol}://${req.get('host')}/api/v1/verify/${user.id}/${user.token}`;
                        const html = generateDynamicEmail(user.userName, link);

                        sendMail({
                            email: user.email,
                            html,
                            subject
                        });

                        reject("This link is expired. Check your email for another email to verify.");
                    } else {
                        resolve();
                    }
                });
            });
        } catch (err) {
            return res.status(400).send(err);
        }
    } catch (err) {
        return res.status(500).json({
            message: "Internal server error: " + err.message,
        });
    }
};









// const verify = async (req, res) => {
//     try {
//         const userId = req.params.userId;
//         const user = await userModel.findById(userId);
//         jwt.verify(user.token, process.env.SECRET);

//             if (user.isVerified === false) {
//                 await userModel.findByIdAndUpdate(userId, {isVerified: true}, {new: true});
//                 return res.status(200).send("You've been successfully verified, kindly visit the Log in page to continue.");
//             }
//             jwt.verify(user.token, process.env.SECRET, async (err) => {
//                 if (err instanceof jwt.JsonWebTokenError) {
//                 const newtoken = jwt.sign({userId: user._id, userName: user.userName, email: user.email}, process.env.SECRET, {expiresIn: "300s"})
//                 user.token = newtoken
//                 user.save()

//                 const subject = "RE-VERIFY YOUR ACCOUNT";
//                 const link = `${req.protocol}://${req.get('host')}/api/v1/verify/${user.id}/${user.token}`;
//                 const html = generateDynamicEmail(user.userName, link);

//                 sendMail({
//                     email: user.email,
//                     html, 
//                     subject
//                 })
//                 return res.status(400).send("This link is expired. Kindly check your email for another email to verify.")
//             }
//             });

//     } catch (err) {
//         return res.status(500).json({
//             message: "Internal server error: "+err.message,
//         })
//     }
// };



// Function to login a registered user
const logIn = async (req, res) => {
    try {
        const { error } = validateLogIn(req.body);
        if (error) {
            return res.status(500).json({
                message: error.details[0].message,
            })
        } else {
            const { email, userName, password } = req.body;
            // Try finding by email
            let checkUser = await userModel.findOne({ email });

            // If not found by email, try finding by userName
            if (!checkUser) {
                checkUser = await userModel.findOne({ userName });
            }

            if (!checkUser) {
                return res.status(404).json({
                    message: "User not found, Please register"
                });
            }
            const checkPassword = bcrypt.compareSync(password, checkUser.password);
            if (!checkPassword) {
                return res.status(404).json({
                    message: "Password is incorrect"
                })
            }
            if (checkUser.isVerified === true) {
                const token = jwt.sign({
                    userId: checkUser._id,
                    userName: checkUser.userName,
                    isAdmin: checkUser.isAdmin
                }, process.env.SECRET, { expiresIn: "5h" });
                res.status(200).json({
                    message: "Login Successfully! Welcome " + checkUser.userName,
                    token: token
                })
                checkUser.token = token;
                await checkUser.save();
                return;
            } else {
                return res.status(400).json({
                    message: "Sorry user not verified yet."
                })
            }
        }
    } catch (err) {
        return res.status(500).json({
            message: "Internal server error: " + err.message,
        });
    }
};


// Function to forget password
const forgetPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const checkUser = await userModel.findOne({ email: email.toLowerCase() });
        if (!checkUser) {
            return res.status(404).json({
                message: "User not found, Please register"
            });
        }
        const subject = "RESET YOUR PASSWORD";
            const link = `${req.protocol}://${req.get('host')}/api/v1/resetPage/${checkUser.id}`;
            const html = resetFunc(user.userName, link);

            sendMail({
                email: email,
                html,
                subject
            })
            return res.status(200).json({
                message: "Kindly check your email to reset your password",
              })

    } catch (err) {
        return res.status(500).json({
            message: "Internal server error: " + err.message,
        });
    }
};


// Function to load the Reset Password Page
const resetPage = async (req, res) => {
    try {
        const id = req.params.id
        const user = await userModel.findById(id);
        if (!user) {
            return res.status(404).send("User not found");
        }
        const resetPage = resetHTML(id)

        // Sends the HTML as a response to the user
        return res.status(200).send(resetPage)
        
    } catch (err) {
        return res.status(500).json({
            message: "Internal server error: " + err.message,
        });
    }
};


//Function to reset Password 
const resetPassword = async (req, res) => {
    try {
        const id = req.params.id;
        const {password} = req.body;
  
        if (!password) {
          return res.status(400).json({
            message: "Password cannot be empty",
          });
        }
  
        const salt = bcrypt.genSaltSync(12);
        const hashPassword = bcrypt.hashSync(password, salt);
  
        await userModel.findByIdAndUpdate(id, { password: hashPassword }, { new: true });
        return res.send("<h3>Password reset successfully</h3>");
        
    } catch (err) {
        return res.status(500).json({
            message: "Internal server error: " + err.message,
        });
    }
};



// Function to SignOut a logged in user
const signOut = async (req, res) => {
    try {
        const id = req.user.id
        const newUser = await userModel.findById(id)
        if (!newUser) {
          return res.status(404).json({
            message: 'User not found'
          });
        }
    
        newUser.token = null;
        await newUser.save();
        return res.status(201).json({
          message: `user has been signed out successfully`
        })
      }
      catch (err) {
        return res.status(500).json({
          message: 'Internal Server Error: ' + err.message,
        })
      }
};


module.exports = {
    signUp,
    verify,
    logIn,
    forgetPassword,
    resetPage,
    resetPassword,
    signOut,

}