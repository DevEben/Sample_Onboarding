require("./dbConfig/dbConfig")
const express = require('express');
const router = require("./routers/userRouter");
require('dotenv').config();

const port = process.env.PORT;

const app = express();

app.use(express.json());
app.get('/', (req, res) => {
    res.send("Welcome to my Sample API")
})

app.use('/api/v1', router)

app.listen(port, () => {
    console.log("Server up and running on port: "+port)
})