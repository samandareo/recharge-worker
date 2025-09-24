const app = require("./app")
const connectDB = require('./config/db');
const { PORT } = require("./config/config");

connectDB();

const server = app.listen(PORT, "0.0.0.0", async () =>{
    console.log(`Server is running on port => ${PORT}`);
})

const shutdown = (err) => {
    if (err) {
        console.error(`Fatal error: ${err.message}`);
    }
    server.close(() => process.exit(1));
}

process.on("unhandledRejection", (err) => {
    shutdown(err);
})

process.on("uncaughtException", (err) => {
    shutdown(err);
})