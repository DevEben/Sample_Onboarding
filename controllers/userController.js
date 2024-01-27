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
            const subject = 'Email Verification'

            const generateOTP = () => {
                const min = 1000;
                const max = 9999;
                return Math.floor(Math.random() * (max - min + 1)) + min;
            }
            
            const OTP = generateOTP();
        
              user.otp = OTP
              const html = generateDynamicEmail(user.userName, OTP)
              sendMail({
                email: user.email,
                html,
                subject
              })
            await user.save();
            return res.status(200).json({
                message: "user registered successfully",
                data: {
                    id: user._id,
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
      const id = req.params.id;
      const token = req.params.token;
      const user = await userModel.findById(id);
      const { userInput } = req.body;

      if (user.isVerified === false) {
        jwt.verify(token, process.env.SECRET)
        if (userInput === user.otp) {
            // Update the user if verification is successful
            await userModel.findByIdAndUpdate(id, { isVerified: true }, { new: true });
            return res.status(200).send("You have been successfully verified. Kindly visit the login page.");
          } else {
            return res.status(400).json({
              message: "Incorrect OTP, Please check your email for the code"
            })
          }
      } else {
        return res.status(400).json({
            message: "User already verified, please proceed to login page",
        });
      }

    } catch (err) {
      if (err instanceof jwt.JsonWebTokenError) {
        return res.status(500).send("<h5>OTP expired, click on the resend OTP link</h5><script>setTimeout(() => { window.location.href = '/api/v1/login'; }, 3000);</script>");
      } else {
        return res.status(500).json({
          message: "Internal server error: " + err.message,
        });
      }
    }
  };



// Function to resend the OTP incase the user didn't get the OTP
const resendOTP = async (req, res) => {
    try {
        const id = req.params.id;
        const user = await userModel.findById(id);
        const token = jwt.sign({ userId: user._id, userName: user.userName, email: user.email }, process.env.SECRET, { expiresIn: "300s" })
        user.token = token
  
        const generateOTP = () => {
          const min = 1000;
          const max = 9999;
          return Math.floor(Math.random() * (max - min + 1)) + min;
      }
      const subject = 'Email Verification'
      const OTP = generateOTP();
  
        user.otp = OTP
        const html = generateDynamicEmail(user.userName, OTP)
        sendMail({
          email: user.email,
          html,
          subject
        })
        await user.save()
        return res.status(200).json({
          message: "Please check your email for a new OTP"
        })

    } catch (err) {
      return res.status(500).json({
        message: "Internal server error: " + err.message,
      });
    }
  };



// Function to login a registered user
const logIn = async (req, res) => {
    try {
        const { email, userName, password } = req.body;
        const checkEmail = await userModel.findOne( { $or: [{ email: userName }, { userName: email }, { email: email }, { userName: userName }] } );
        if (!checkEmail) {
          return res.status(404).json({
            message: 'User not registered'
          });
        }
            const checkPassword = bcrypt.compareSync(password, checkEmail.password);
            if (!checkPassword) {
                return res.status(404).json({
                    message: "Password is incorrect"
                })
            }
            if (checkEmail.isVerified === true) {
                const token = jwt.sign({
                    userId: checkEmail._id,
                    userName: checkEmail.userName,
                    isAdmin: checkEmail.isAdmin
                }, process.env.SECRET, { expiresIn: "5h" });
                res.status(200).json({
                    message: "Login Successfully! Welcome " + checkEmail.userName,
                    token: token
                })
                checkEmail.token = token;
                await checkEmail.save();
                return;
            } else {
                return res.status(400).json({
                    message: "Sorry user not verified yet."
                })
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
    resendOTP,
    logIn,
    forgetPassword,
    resetPage,
    resetPassword,
    signOut,

}