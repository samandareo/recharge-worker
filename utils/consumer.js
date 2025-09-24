const amqp = require("amqplib");
const { createRechargeRequest } = require("../services/rechargeRequest");
require("dotenv").config();

const RABBITMQ_URL = process.env.RABBITMQ_URL;
const QUEUE_NAME = "recharge-queue";
const RETRY_DELAY = 5000; // 5 seconds
const MAX_RETRIES = 3;

class RabbitMQConsumer {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
    this.shouldReconnect = true;
    this.reconnectAttempts = 0;
  }

  async connect() {
    try {
      console.log("🔄 Connecting to RabbitMQ...");
      this.connection = await amqp.connect(RABBITMQ_URL);
      this.channel = await this.connection.createChannel();
      
      // Set prefetch count to process one message at a time
      await this.channel.prefetch(1);
      

      // Assert main queue (no DLX arguments to avoid precondition error)
      await this.channel.assertQueue(QUEUE_NAME, { 
        durable: true
        // To enable DLX in the future, add arguments here after deleting the queue from RabbitMQ
        // arguments: {
        //   'x-dead-letter-exchange': 'dlx',
        //   'x-dead-letter-routing-key': 'recharge-queue-dlq'
        // }
      });

      // (Optional) DLX setup - only if you want to use DLQ and have deleted the queue first
      // await this.channel.assertExchange('dlx', 'direct', { durable: true });
      // await this.channel.assertQueue('recharge-queue-dlq', { durable: true });
      // await this.channel.bindQueue('recharge-queue-dlq', 'dlx', 'recharge-queue-dlq');

      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log("✅ Connected to RabbitMQ successfully");

      // Handle connection events
      this.connection.on('error', this.handleConnectionError.bind(this));
      this.connection.on('close', this.handleConnectionClose.bind(this));

    } catch (error) {
      console.error("❌ Failed to connect to RabbitMQ:", error.message);
      this.isConnected = false;
      await this.reconnect();
    }
  }

  async handleConnectionError(error) {
    console.error("❌ RabbitMQ connection error:", error.message);
    this.isConnected = false;
    await this.reconnect();
  }

  async handleConnectionClose() {
    console.warn("⚠️ RabbitMQ connection closed");
    this.isConnected = false;
    if (this.shouldReconnect) {
      await this.reconnect();
    }
  }

  async reconnect() {
    if (!this.shouldReconnect) return;

    this.reconnectAttempts++;
    const delay = Math.min(RETRY_DELAY * this.reconnectAttempts, 30000); // Max 30 seconds
    
    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}) in ${delay}ms...`);
    
    setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error("❌ Reconnection failed:", error.message);
      }
    }, delay);
  }

  async processMessage(msg) {
    if (!msg) return;

    let data;
    try {
      data = JSON.parse(msg.content.toString());
      console.log("[x] Received message:", data);
    } catch (parseError) {
      console.error("❌ Failed to parse message:", parseError.message);
      this.channel.nack(msg, false, false); // Don't requeue invalid JSON
      return;
    }

    try {
      const result = await createRechargeRequest(data);
      
      if (result.success) {
        this.channel.ack(msg);
        console.log("✅ Message processed successfully");
      } else {
        console.error("❌ Failed to create recharge request:", result.error);
        
        // Check retry count
        const retryCount = (msg.properties.headers && msg.properties.headers['x-retry-count']) || 0;
        
        if (retryCount < MAX_RETRIES) {
          // Retry with exponential backoff
          const delay = Math.pow(2, retryCount) * 1000; // 1s, 2s, 4s
          
          setTimeout(() => {
            this.channel.publish('', QUEUE_NAME, msg.content, {
              persistent: true,
              headers: {
                'x-retry-count': retryCount + 1,
                'x-original-timestamp': msg.properties.headers?.['x-original-timestamp'] || Date.now()
              }
            });
          }, delay);
          
          this.channel.ack(msg); // Remove original message
          console.log(`🔄 Message will be retried in ${delay}ms (attempt ${retryCount + 1}/${MAX_RETRIES})`);
        } else {
          // Send to dead letter queue
          this.channel.nack(msg, false, false);
          console.error(`💀 Message sent to DLQ after ${MAX_RETRIES} failed attempts`);
        }
      }
    } catch (error) {
      console.error("❌ Error processing message:", error.message);
      this.channel.nack(msg, false, true); // Requeue for retry
    }
  }

  async startConsuming() {
    if (!this.isConnected) {
      await this.connect();
    }

    console.log(`[*] Waiting for messages in queue: ${QUEUE_NAME}`);
    
    await this.channel.consume(
      QUEUE_NAME,
      this.processMessage.bind(this),
      { noAck: false }
    );
  }

  async close() {
    console.log("🔄 Closing RabbitMQ consumer...");
    this.shouldReconnect = false;
    
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      console.log("✅ RabbitMQ consumer closed successfully");
    } catch (error) {
      console.error("❌ Error closing RabbitMQ consumer:", error.message);
    }
  }

  // Health check method
  isHealthy() {
    return this.isConnected && this.channel && !this.channel.closing;
  }

  // Get connection stats
  getStats() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      shouldReconnect: this.shouldReconnect
    };
  }
}

// Singleton instance
const consumer = new RabbitMQConsumer();

async function consumeQueue() {
  await consumer.startConsuming();
}

module.exports = { consumeQueue, consumer };
