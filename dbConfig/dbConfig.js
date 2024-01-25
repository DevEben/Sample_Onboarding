const mongoose = require("mongoose");
require('dotenv').config();

const url = process.env.DATABASE;

mongoose.connect(url)
.then(() => {
    console.log("Connection to database established successfully")
})
.catch((err) => {
    console.log("Error connecting to database: " +err.message)
})