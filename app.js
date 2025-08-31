const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const errorHandler = require("./middlewares/error");

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

app.get("/api/", (req, res) => {
    res.send(`
        <html>
            <head>
                <title>API VERIFICATION</title>
            </head>
            <body>
                <h1 style="text-align: center">API is working...</h1>
            </body>
        </html>
    `)
})

// Routes
app.use("/api/admin", require("./routes/adminRoutes"));
app.use("/api/recharge", require("./routes/rechargeRoutes"));

// Error handler
app.use(errorHandler);

module.exports = app;