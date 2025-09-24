const app = require("./app");
const connectDB = require('./config/db');
const { PORT } = require("./config/config");
const { consumeQueue, consumer } = require("./utils/consumer");
const { producer } = require("./utils/producer");

let server;
let isShuttingDown = false;

async function startServer() {
    try {
        // Connect to database
        console.log("🔄 Connecting to database...");
        await connectDB();
        console.log("✅ Database connected successfully");

        // Start HTTP server
        server = app.listen(PORT, "0.0.0.0", () => {
            console.log(`🚀 HTTP Server is running on port ${PORT}`);
        });

        // Start RabbitMQ consumer
        console.log("🔄 Starting RabbitMQ consumer...");
        await consumeQueue();
        console.log("✅ RabbitMQ consumer started successfully");

        // Wait a moment for producer to initialize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Check RabbitMQ producer health
        if (producer.isHealthy()) {
            console.log("✅ RabbitMQ producer is healthy");
        } else {
            console.warn("⚠️ RabbitMQ producer is not ready yet");
        }

        console.log("🎉 All services started successfully!");
        console.log("📊 Service Status:");
        console.log(`   - HTTP Server: Running on port ${PORT}`);
        console.log(`   - Database: Connected`);
        console.log(`   - RabbitMQ Consumer: ${consumer.isConnected ? 'Connected' : 'Disconnected'}`);
        console.log(`   - RabbitMQ Producer: ${producer.isHealthy() ? 'Healthy' : 'Unhealthy'}`);

    } catch (error) {
        console.error("❌ Failed to start server:", error.message);
        process.exit(1);
    }
}

async function shutdown(signal, err) {
    if (isShuttingDown) {
        console.log("⏳ Shutdown already in progress...");
        return;
    }

    isShuttingDown = true;
    console.log(`\n📝 Received ${signal}. Starting graceful shutdown...`);

    if (err) {
        console.error(`❌ Fatal error: ${err.message}`);
    }

    const shutdownTimeout = setTimeout(() => {
        console.error("⏰ Graceful shutdown timeout. Forcing exit...");
        process.exit(1);
    }, 15000); // 15 seconds timeout

    try {
        // Stop accepting new connections
        if (server) {
            console.log("🔄 Closing HTTP server...");
            server.close();
            console.log("✅ HTTP server closed");
        }

        // Close RabbitMQ consumer
        console.log("🔄 Closing RabbitMQ consumer...");
        await consumer.close();
        console.log("✅ RabbitMQ consumer closed");

        // Close RabbitMQ producer
        console.log("🔄 Closing RabbitMQ producer...");
        await producer.close();
        console.log("✅ RabbitMQ producer closed");

        clearTimeout(shutdownTimeout);
        console.log("✅ Graceful shutdown completed");
        process.exit(err ? 1 : 0);

    } catch (shutdownError) {
        console.error("❌ Error during shutdown:", shutdownError.message);
        clearTimeout(shutdownTimeout);
        process.exit(1);
    }
}

// Handle different shutdown signals
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Handle unhandled rejections
process.on("unhandledRejection", (err) => {
    console.error("❌ Unhandled Promise Rejection:", err.message);
    shutdown("unhandledRejection", err);
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
    console.error("❌ Uncaught Exception:", err.message);
    shutdown("uncaughtException", err);
});

// Health check endpoint helper
app.get('/health', (req, res) => {
    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        services: {
            http: server ? 'running' : 'stopped',
            consumer: consumer.isConnected ? 'connected' : 'disconnected',
            producer: producer.isHealthy() ? 'healthy' : 'unhealthy'
        },
        stats: {
            consumer: consumer.getStats ? consumer.getStats() : {},
            producer: producer.getStats ? producer.getStats() : {}
        }
    };
    
    const allHealthy = health.services.consumer === 'connected' && 
                      health.services.producer === 'healthy';
    
    res.status(allHealthy ? 200 : 503).json(health);
});

// Start the server
startServer();