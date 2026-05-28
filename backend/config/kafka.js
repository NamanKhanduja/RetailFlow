/**
 * config/kafka.js  —  RetailFlow Kafka Provider Configuration
 * ───────────────────────────────────────────────────────────
 * Manages the lifespan of the Kafka client and unified producer.
 */

const { Kafka, logLevel } = require('kafkajs');

const brokerString = process.env.KAFKA_BROKERS || 'localhost:9092';
const brokers = brokerString.split(',').map(b => b.trim());

// Initialise the Kafka Client
const kafka = new Kafka({
  clientId: 'retailflow-backend',
  brokers: brokers,
  logLevel: logLevel.WARN // Quiet warnings unless critical
});

// Single unified producer instance
const producer = kafka.producer({
  allowAutoTopicCreation: true,
  transactionTimeout: 30000
});

/**
 * Connect the Kafka Producer instance with retry policy
 */
async function connectProducer() {
  console.log(`🔌 Initialising Kafka connection to brokers: [${brokers.join(', ')}]...`);
  try {
    await producer.connect();
    console.log('✅ Kafka Producer connected successfully.');
  } catch (err) {
    console.warn('⚠️ [RetailFlow Kafka] Connection failed. If Kafka is not running locally, events will not stream.');
    console.error('   Error Details:', err.message);
  }
}

/**
 * Disconnect the producer instance gracefully
 */
async function disconnectProducer() {
  console.log('🔌 Disconnecting Kafka Producer...');
  try {
    await producer.disconnect();
    console.log('✅ Kafka Producer disconnected gracefully.');
  } catch (err) {
    console.error('[RetailFlow Kafka] Disconnection error:', err.message);
  }
}

module.exports = {
  kafka,
  producer,
  connectProducer,
  disconnectProducer
};
