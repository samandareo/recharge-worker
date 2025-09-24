const amqp = require("amqplib");
require("dotenv").config();

const RABBITMQ_URL = process.env.RABBITMQ_URL;
const CONNECTION_TIMEOUT = 10000; // 10 seconds
const HEARTBEAT = 60; // 60 seconds

class RabbitMQConnectionManager {
  constructor() {
    this.connection = null;
    this.isConnected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 5000;
    this.channels = new Map(); // Track all channels
    this.isShuttingDown = false;
  }

  async connect() {
    if (this.isConnected && this.connection && !this.connection.connection.stream.destroyed) {
      return this.connection;
    }

    try {
      console.log("🔄 Establishing RabbitMQ connection...");
      
      this.connection = await amqp.connect(RABBITMQ_URL, {
        heartbeat: HEARTBEAT,
        timeout: CONNECTION_TIMEOUT
      });

      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log("✅ RabbitMQ connection established");

      // Handle connection events
      this.connection.on('error', this.handleConnectionError.bind(this));
      this.connection.on('close', this.handleConnectionClose.bind(this));

      return this.connection;

    } catch (error) {
      console.error("❌ Failed to connect to RabbitMQ:", error.message);
      this.isConnected = false;
      throw error;
    }
  }

  async createChannel(channelName = null) {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const channel = await this.connection.createChannel();
      
      // Track the channel
      const channelId = channelName || `channel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.channels.set(channelId, channel);

      // Handle channel events
      channel.on('error', (error) => {
        console.error(`❌ Channel ${channelId} error:`, error.message);
        this.channels.delete(channelId);
      });

      channel.on('close', () => {
        console.log(`📝 Channel ${channelId} closed`);
        this.channels.delete(channelId);
      });

      return { channel, channelId };

    } catch (error) {
      console.error("❌ Failed to create channel:", error.message);
      throw error;
    }
  }

  async handleConnectionError(error) {
    console.error("❌ RabbitMQ connection error:", error.message);
    this.isConnected = false;
    this.channels.clear();
    
    if (!this.isShuttingDown) {
      await this.reconnect();
    }
  }

  async handleConnectionClose() {
    console.warn("⚠️ RabbitMQ connection closed");
    this.isConnected = false;
    this.channels.clear();
    
    if (!this.isShuttingDown) {
      await this.reconnect();
    }
  }

  async reconnect() {
    if (this.isShuttingDown || this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectDelay * this.reconnectAttempts, 30000); // Max 30 seconds
    
    console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${delay}ms...`);
    
    setTimeout(async () => {
      if (!this.isShuttingDown) {
        try {
          await this.connect();
        } catch (error) {
          console.error("❌ Reconnection failed:", error.message);
        }
      }
    }, delay);
  }

  async close() {
    console.log("🔄 Closing RabbitMQ connection...");
    this.isShuttingDown = true;
    
    try {
      // Close all channels first
      for (const [channelId, channel] of this.channels) {
        try {
          await channel.close();
          console.log(`✅ Channel ${channelId} closed`);
        } catch (error) {
          console.error(`❌ Error closing channel ${channelId}:`, error.message);
        }
      }
      this.channels.clear();

      // Close connection
      if (this.connection) {
        await this.connection.close();
        console.log("✅ RabbitMQ connection closed successfully");
      }
      
      this.isConnected = false;
    } catch (error) {
      console.error("❌ Error closing RabbitMQ connection:", error.message);
    }
  }

  // Health check
  isHealthy() {
    return this.isConnected && 
           this.connection && 
           !this.connection.connection.stream.destroyed;
  }

  // Get connection statistics
  getStats() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      activeChannels: this.channels.size,
      isShuttingDown: this.isShuttingDown
    };
  }
}

// Export singleton instance
const connectionManager = new RabbitMQConnectionManager();

module.exports = connectionManager;