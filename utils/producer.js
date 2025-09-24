const amqp = require("amqplib");
require("dotenv").config();

const RABBITMQ_URL = process.env.RABBITMQ_URL
const QUEUE_NAME = "recharge-response-queue";

let channel;

async function connectQueue() {
  if (!channel) {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertQueue(QUEUE_NAME, { durable: true });
  }
  return channel;
}

exports.sendRechargeRequestQueue = async (data) => {
  try {
    const ch = await connectQueue();
    ch.sendToQueue(
      QUEUE_NAME,
      Buffer.from(JSON.stringify(data)),
      { persistent: true }
    );
    console.log("📤 Message published:", data);
  } catch (err) {
    console.error("❌ Error publishing to queue:", err);
  }
};
