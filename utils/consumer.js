const amqp = require("amqplib");
const { createRechargeRequest } = require("./services/rechargeRequest");
require("dotenv").config();

const RABBITMQ_URL = process.env.RABBITMQ_URL;
const QUEUE_NAME = "recharge-queue";

async function consumeQueue() {
  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    const channel = await connection.createChannel();

    await channel.assertQueue(QUEUE_NAME, { durable: true });

    console.log(`[*] Waiting for messages in queue: ${QUEUE_NAME}`);

    channel.consume(
      QUEUE_NAME,
      async (msg) => {
        if (msg !== null) {
          const data = JSON.parse(msg.content.toString());
          console.log("[x] Received message:", data);
          const result = await createRechargeRequest(data);
          if (result.success) {
            channel.ack(msg);
          } else {
            console.error("Failed to create recharge request:", result.error);
          }
        }
      },
      { noAck: false } // ensures messages are acknowledged manually
    );
  } catch (err) {
    console.error("❌ Error consuming queue:", err);
  }
}

module.exports = { consumeQueue };
