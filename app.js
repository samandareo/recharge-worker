const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const errorHandler = require("./middlewares/error");

const app = express();

// CORS configuration for admin panel access
const corsOptions = {
    origin: "https://aspadmin.diderappstore.top",
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie']
};

// Middlewares
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.use(morgan("dev"));

// Explicit preflight handler for all API routes
app.options('*', cors(corsOptions));

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