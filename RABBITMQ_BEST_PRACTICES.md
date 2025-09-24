# RabbitMQ Consumer & Producer - Best Practices Implementation

## Key Improvements Made

### 🔧 **Connection Management**
- **Singleton Pattern**: Both consumer and producer use singleton instances to prevent multiple connections
- **Connection Pooling**: Proper connection reuse with health checks
- **Graceful Shutdown**: Handles SIGINT/SIGTERM signals for clean shutdown
- **Auto-Reconnection**: Automatic reconnection with exponential backoff and max retry limits

### 🛡️ **Error Handling & Resilience**
- **Dead Letter Queues (DLQ)**: Failed messages are sent to DLQ after max retries
- **Message Retry Logic**: Built-in retry mechanism with exponential backoff
- **Publisher Confirms**: Ensures messages are successfully delivered
- **Connection Health Checks**: Monitors connection status continuously

### 📦 **Message Buffering**
- **Offline Buffering**: Messages are buffered when connection is down and sent when reconnected
- **Prefetch Control**: Consumer processes one message at a time (`prefetch: 1`)
- **Message Acknowledgment**: Proper ACK/NACK handling for reliable message processing

### 🎯 **Performance Optimizations**
- **Heartbeat Configuration**: Keeps connections alive efficiently
- **Channel Management**: Proper channel lifecycle management
- **Memory Management**: Prevents memory leaks from persistent connections

## Usage Examples

### Consumer Usage
```javascript
const { consumeQueue } = require('./utils/consumer');

// Start consuming messages
consumeQueue().catch(console.error);
```

### Producer Usage
```javascript
const { sendRechargeRequestQueue } = require('./utils/producer');

// Send a message
const result = await sendRechargeRequestQueue({
  rechargeId: "12345",
  userId: "user123",
  phoneNumber: "+1234567890",
  amount: 100,
  operator: "Verizon"
});

if (result.success) {
  console.log("Message sent successfully");
} else {
  console.error("Failed to send message:", result.error);
}
```

### Health Check Example
```javascript
const { producer } = require('./utils/producer');

// Check producer health
if (producer.isHealthy()) {
  console.log("Producer is healthy");
} else {
  console.log("Producer is not healthy:", producer.getStats());
}
```

## Configuration

Make sure your `.env` file has:
```env
RABBITMQ_URL=amqp://username:password@localhost:5672
```

## Queue Structure

### Main Queues
- `recharge-queue` - Input queue for recharge requests
- `recharge-response-queue` - Output queue for recharge responses

### Dead Letter Queues
- `recharge-queue-dlq` - Failed recharge requests
- `recharge-response-queue-dlq` - Failed recharge responses

## Monitoring

Both consumer and producer provide statistics:
```javascript
console.log("Consumer stats:", consumer.getStats());
console.log("Producer stats:", producer.getStats());
```

## Best Practices Implemented

1. ✅ **Connection Reuse**: Single connection per service
2. ✅ **Graceful Shutdown**: Clean resource cleanup
3. ✅ **Error Recovery**: Auto-reconnection with backoff
4. ✅ **Message Durability**: Persistent messages and durable queues  
5. ✅ **Dead Letter Handling**: Failed message management
6. ✅ **Publisher Confirms**: Guaranteed delivery
7. ✅ **Prefetch Control**: Prevent message overload
8. ✅ **Health Monitoring**: Connection status tracking
9. ✅ **Message Buffering**: Offline message handling
10. ✅ **Retry Logic**: Exponential backoff retries