const express = require('express');
const amqp = require('amqplib');
const connectDB = require('./config/db');
const Recharge = require('./models/Recharge'); // Import your model if needed
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = 4001;
const RABBITMQ_URL = 'amqp://localhost';
const QUEUE_NAME = 'recharge-queue';
const RECHARGE_URL = 'https://rechargemasterbd.com/sendapi/request';

connectDB();

async function startConsumer() {
    const operators = {
        "Gramenphone": "GP",
        "Robi": "RB",
        "Airtel": "AT",
        "Banglalink": "BL",
        "Teletalk": "TT"
    }

    try {
        const connection = await amqp.connect(RABBITMQ_URL);
        const channel = await connection.createChannel();
        await channel.assertQueue(QUEUE_NAME, { durable: true });

        console.log(`Waiting for messages in ${QUEUE_NAME}...`);

        channel.consume(QUEUE_NAME, async (msg) => {
            if (msg !== null) {
                const data = JSON.parse(msg.content.toString());
                console.log("Received recharge request:", data);
                

                const request_data = {
                    number: data.phoneNumber,
                    service: 64,
                    amount: data.amount,
                    type: 1,
                    id: Date.now(),
                    user: "01781573626",
                    key: "D3181OSW9X6UJCN7RG50ZMKYK2BKG6RHJO8NRV0J6H54Q37KWU",
                    operator: operators[data.operator]
                }

                const request_header = {
                    'band-key': 'flexisoftwarebd'
                }

                try {
                    const response = await axios.post(RECHARGE_URL, request_data, { headers: request_header });
                    console.log("Recharge API Response:", response.data);

                    if (response.data.success) {
                        await Recharge.findByIdAndUpdate(data.rechargeId, { status: 'completed' });
                        console.log("Recharge status updated to completed");
                    } else {
                        console.log("Recharge failed:", response.data.message);
                    }

                } catch (error) {
                    console.error("Error calling Recharge API:", error);
                }

                channel.ack(msg);
            }
        });
    } catch (error) {
        console.error("RabbitMQ Consumer Error:", error);
    }
}

// Express routes
app.use(express.json());

// Health check endpoint
app.get('/', (req, res) => {
    res.json({ status: 'Recharge Worker is running' });
});

// Get all recharges
app.get('/recharges', async (req, res) => {
    try {
        const recharges = await Recharge.find().sort({ createdAt: -1 });
        res.json(recharges);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start both Express server and Consumer
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    startConsumer();
});