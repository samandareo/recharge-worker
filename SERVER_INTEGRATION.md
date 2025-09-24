# Recharge Worker - Integrated Server

Your server has been updated to properly integrate with RabbitMQ consumer and producer components.

## Features

### 🚀 **Integrated Startup**
- Database connection
- HTTP server startup
- RabbitMQ consumer initialization
- RabbitMQ producer health check
- Comprehensive startup logging

### 🛑 **Graceful Shutdown**
- Handles SIGTERM, SIGINT signals
- Stops accepting new HTTP connections
- Closes RabbitMQ consumer properly
- Closes RabbitMQ producer properly
- 15-second shutdown timeout for safety

### 📊 **Health Monitoring**
New health check endpoint available at `GET /health`:

```json
{
  "status": "ok",
  "timestamp": "2025-09-24T10:00:00.000Z",
  "uptime": 123.456,
  "services": {
    "http": "running",
    "consumer": "connected",
    "producer": "healthy"
  },
  "stats": {
    "consumer": {
      "isConnected": true,
      "reconnectAttempts": 0,
      "shouldReconnect": true
    },
    "producer": {
      "isConnected": true,
      "reconnectAttempts": 0,
      "bufferedMessages": 0,
      "isShuttingDown": false
    }
  }
}
```

## Running the Server

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

## Startup Sequence

1. 🔄 Connecting to database...
2. ✅ Database connected successfully
3. 🚀 HTTP Server is running on port 3000
4. 🔄 Starting RabbitMQ consumer...
5. ✅ RabbitMQ consumer started successfully
6. ✅ RabbitMQ producer is healthy
7. 🎉 All services started successfully!

## Shutdown Sequence

1. 📝 Received SIGINT. Starting graceful shutdown...
2. 🔄 Closing HTTP server...
3. ✅ HTTP server closed
4. 🔄 Closing RabbitMQ consumer...
5. ✅ RabbitMQ consumer closed
6. 🔄 Closing RabbitMQ producer...
7. ✅ RabbitMQ producer closed
8. ✅ Graceful shutdown completed

## Error Handling

The server handles various error scenarios:
- Database connection failures
- RabbitMQ connection issues
- Unhandled promise rejections
- Uncaught exceptions
- Graceful shutdown timeout (15s)

## Monitoring Commands

```bash
# Check if all services are healthy
curl http://localhost:3000/health

# Check specific service health
curl http://localhost:3000/health | jq '.services'

# Monitor logs for startup issues
tail -f logs/app.log  # if you have logging to file
```

## Environment Variables

Make sure these are set in your `.env` file:

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/recharge-worker

# RabbitMQ Configuration
RABBITMQ_URL=amqp://username:password@localhost:5672

# Admin Panel CORS (Production)
ADMIN_PANEL_ORIGIN=https://aspadmin.diderappstore.top
```

## Process Management (Production)

### Using PM2
```bash
# Install PM2
npm install -g pm2

# Start the application
pm2 start server.js --name "recharge-worker"

# Monitor
pm2 logs recharge-worker
pm2 monit

# Graceful restart
pm2 restart recharge-worker

# Stop
pm2 stop recharge-worker
```

### Using systemd (Linux)
```ini
# /etc/systemd/system/recharge-worker.service
[Unit]
Description=Recharge Worker Service
After=network.target

[Service]
Type=simple
User=node
WorkingDirectory=/path/to/recharge-worker
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

The server now properly coordinates all components and provides comprehensive monitoring and graceful shutdown capabilities.