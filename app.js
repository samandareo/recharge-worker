const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const errorHandler = require("./middlewares/error");

const app = express();

// CORS configuration for admin panel access
const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or Postman)
        if (!origin) return callback(null, true);
        
        const allowedOrigins = [
            'https://aspadmin.diderappstore.top',
            'http://localhost:3000', // for development
            'http://127.0.0.1:3000'  // for development
        ];
        
        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('Blocked origin:', origin);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'Cookie', 
        'X-Requested-With',
        'Accept',
        'Origin'
    ],
    exposedHeaders: ['Set-Cookie']
};

// Middlewares
app.use(cors(corsOptions));

app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowedOrigins = [
        'https://aspadmin.diderappstore.top',
        'http://localhost:3000',
        'http://127.0.0.1:3000'
    ];
    
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie, X-Requested-With, Accept, Origin');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }
    
    next();
});

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