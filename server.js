const app = require("./app")
const connectDB = require('./config/db');
const { PORT } = require("./config/config");

connectDB();

const server = app.listen(PORT, "0.0.0.0", async () =>{
    console.log(`Server is running on port => ${PORT}`);
})


process.on("unhandaledRejection", (err, promise) => {
    console.log(`Error: ${err.message}`);
    server.close(() => process.exit(1));
})