const amqp = require("amqplib");
require("dotenv").config();

const RABBITMQ_URL = process.env.RABBITMQ_URL;
const QUEUE_NAME = "recharge-response-queue";
const RETRY_DELAY = 5000; // 5 seconds
const CONNECTION_TIMEOUT = 10000; // 10 seconds

class RabbitMQProducer {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.messageBuffer = []; // Buffer messages when disconnected
    this.isShuttingDown = false;
  }

  async connect() {
    try {
      console.log("🔄 Connecting to RabbitMQ Producer...");
      
      this.connection = await amqp.connect(RABBITMQ_URL, {
        heartbeat: 60,
        timeout: CONNECTION_TIMEOUT
      });
      

      // Use confirm channel for publisher confirms
      this.channel = await this.connection.createConfirmChannel();

      // Assert queue (no DLX arguments to avoid precondition error)
      await this.channel.assertQueue(QUEUE_NAME, { 
        durable: true
        // To enable DLX in the future, add arguments here after deleting the queue from RabbitMQ
        // arguments: {
        //   'x-dead-letter-exchange': 'dlx-response',
        //   'x-dead-letter-routing-key': 'recharge-response-queue-dlq'
        // }
      });

      // (Optional) DLX setup - only if you want to use DLQ and have deleted the queue first
      // await this.channel.assertExchange('dlx-response', 'direct', { durable: true });
      // await this.channel.assertQueue('recharge-response-queue-dlq', { durable: true });
      // await this.channel.bindQueue('recharge-response-queue-dlq', 'dlx-response', 'recharge-response-queue-dlq');

      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log("✅ RabbitMQ Producer connected successfully");

      // Handle connection events
      this.connection.on('error', this.handleConnectionError.bind(this));
      this.connection.on('close', this.handleConnectionClose.bind(this));
      this.channel.on('error', this.handleChannelError.bind(this));

      // Process buffered messages
      await this.processBufferedMessages();

    } catch (error) {
      console.error("❌ Failed to connect RabbitMQ Producer:", error.message);
      this.isConnected = false;
      
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        await this.reconnect();
      } else {
        console.error("❌ Max reconnection attempts reached. Producer disabled.");
      }
    }
  }

  async handleConnectionError(error) {
    console.error("❌ RabbitMQ Producer connection error:", error.message);
    this.isConnected = false;
    if (!this.isShuttingDown) {
      await this.reconnect();
    }
  }

  async handleConnectionClose() {
    console.warn("⚠️ RabbitMQ Producer connection closed");
    this.isConnected = false;
    if (!this.isShuttingDown) {
      await this.reconnect();
    }
  }

  async handleChannelError(error) {
    console.error("❌ RabbitMQ Producer channel error:", error.message);
    this.isConnected = false;
    if (!this.isShuttingDown) {
      await this.reconnect();
    }
  }

  async reconnect() {
    if (this.isShuttingDown) return;

    this.reconnectAttempts++;
    const delay = Math.min(RETRY_DELAY * this.reconnectAttempts, 30000); // Max 30 seconds
    
    console.log(`🔄 Producer reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`);
    
    setTimeout(async () => {
      if (!this.isShuttingDown) {
        await this.connect();
      }
    }, delay);
  }

  async processBufferedMessages() {
    if (this.messageBuffer.length === 0) return;

    console.log(`📤 Processing ${this.messageBuffer.length} buffered messages...`);
    
    const messages = [...this.messageBuffer];
    this.messageBuffer = [];

    for (const message of messages) {
      try {
        await this.sendMessage(message.data, message.options);
      } catch (error) {
        console.error("❌ Failed to send buffered message:", error.message);
        // Re-buffer failed message if connection is still down
        if (!this.isConnected) {
          this.messageBuffer.push(message);
        }
      }
    }
  }

  async sendMessage(data, options = {}) {
    if (!this.isConnected) {
      // Buffer message for later sending
      this.messageBuffer.push({ data, options });
      console.log("📦 Message buffered (producer disconnected):", data);
      return { success: false, error: "Producer not connected, message buffered" };
    }

    try {
      const messageOptions = {
        persistent: true,
        timestamp: Date.now(),
        messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        ...options
      };

      const sent = this.channel.sendToQueue(
        QUEUE_NAME,
        Buffer.from(JSON.stringify(data)),
        messageOptions
      );

      if (!sent) {
        throw new Error("Failed to send message to queue (queue full)");
      }

      // Wait for publisher confirm
      await this.channel.waitForConfirms();
      
      console.log("📤 Message published successfully:", data);
      return { success: true };

    } catch (error) {
      console.error("❌ Error publishing message:", error.message);
      
      // Buffer message if it's a connection issue
      if (error.message.includes('Channel closed') || error.message.includes('Connection closed')) {
        this.messageBuffer.push({ data, options });
        this.isConnected = false;
        await this.reconnect();
      }
      
      return { success: false, error: error.message };
    }
  }

  async close() {
    console.log("🔄 Closing RabbitMQ Producer...");
    this.isShuttingDown = true;
    
    try {
      // Send any buffered messages before closing
      if (this.isConnected && this.messageBuffer.length > 0) {
        await this.processBufferedMessages();
      }

      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      console.log("✅ RabbitMQ Producer closed successfully");
    } catch (error) {
      console.error("❌ Error closing RabbitMQ Producer:", error.message);
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
      bufferedMessages: this.messageBuffer.length,
      isShuttingDown: this.isShuttingDown
    };
  }
}

// Singleton instance
const producer = new RabbitMQProducer();

// Initialize connection when module is loaded
(async () => {
  await producer.connect();
})();

// Export the main function with backward compatibility
exports.sendRechargeRequestQueue = async (data, options) => {
  return await producer.sendMessage(data, options);
};

// Export producer instance for advanced usage
exports.producer = producer;
