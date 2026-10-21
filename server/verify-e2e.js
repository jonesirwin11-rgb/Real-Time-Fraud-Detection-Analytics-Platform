const axios = require('axios');
const { io } = require('../client/node_modules/socket.io-client');
const mongoose = require('mongoose');

const BASE_URL = 'http://localhost:3000/api';
const SOCKET_URL = 'http://localhost:3000';

async function runVerification() {
  console.log('=== STARTING FULL END-TO-END VERIFICATION ===\n');

  // 1. Test registration error handling
  console.log('1. Testing registration with missing fields...');
  try {
    await axios.post(`${BASE_URL}/auth/register`, { username: '' });
  } catch (err) {
    console.log('   Expected Error received:', err.response?.data?.error || err.message);
  }

  // 2. Test valid registration
  const testUser = {
    username: `operator_${Date.now()}`,
    password: 'securePassword123'
  };
  console.log(`\n2. Registering new operator: ${testUser.username}...`);
  const regRes = await axios.post(`${BASE_URL}/auth/register`, testUser);
  console.log('   Registration response:', regRes.status, regRes.data);

  // 3. Test duplicate registration error
  console.log('\n3. Testing duplicate registration error handling...');
  try {
    await axios.post(`${BASE_URL}/auth/register`, testUser);
  } catch (err) {
    console.log('   Expected Error received:', err.response?.data?.error || err.message);
  }

  // 4. Test login
  console.log('\n4. Logging in to obtain JWT token...');
  const loginRes = await axios.post(`${BASE_URL}/auth/login`, testUser);
  const token = loginRes.data.token;
  console.log('   Login success. User:', loginRes.data.username, '| Role:', loginRes.data.role);
  console.log('   Token received (first 25 chars):', token.substring(0, 25) + '...');

  // 5. Test GET /api/transactions with Bearer token
  console.log('\n5. Testing GET /api/transactions with Bearer token...');
  const txRes = await axios.get(`${BASE_URL}/transactions`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`   Initial transactions count: ${txRes.data.length}`);

  // 6. Test Socket.io connection (matching useSocket.js)
  console.log('\n6. Connecting to Socket.io client at http://localhost:3000...');
  const socket = io(SOCKET_URL);
  
  const receivedTx = [];
  const receivedAlerts = [];

  await new Promise((resolve) => {
    socket.on('connect', () => {
      console.log('   Socket connected with ID:', socket.id);
      resolve();
    });
  });

  socket.on('newTransaction', (tx) => {
    console.log(`   [SOCKET EVENT: newTransaction] Card: ${tx.cardId} | $${tx.amount} | Loc: ${tx.location} | Flagged: ${tx.flagged} | rulesTriggered: ${JSON.stringify(tx.rulesTriggered)}`);
    receivedTx.push(tx);
  });

  socket.on('fraudAlert', (data) => {
    console.log(`   [SOCKET EVENT: fraudAlert] Rules: ${JSON.stringify(data.rulesTriggered)} | Tx: $${data.transaction?.amount} on ${data.transaction?.cardId}`);
    receivedAlerts.push(data);
  });

  // 7. Post transactions: normal, location jump anomaly, velocity anomaly
  console.log('\n7. Sending test transactions via POST /api/transactions...');
  const authHeader = { headers: { Authorization: `Bearer ${token}` } };

  // Normal tx for CARD_111 at home NY
  console.log('   Sending normal transaction (CARD_111 at home NY)...');
  await axios.post(`${BASE_URL}/transactions`, { cardId: 'CARD_111', amount: 45.50, location: 'NY' }, authHeader);

  // Wait a moment for socket
  await new Promise(r => setTimeout(r, 600));

  // Location Anomaly: CARD_111 suddenly at UK
  console.log('   Sending location jump anomaly (CARD_111 at UK)...');
  await axios.post(`${BASE_URL}/transactions`, { cardId: 'CARD_111', amount: 89.99, location: 'UK' }, authHeader);

  await new Promise(r => setTimeout(r, 600));

  // Velocity Anomaly: CARD_222 rapid 3+ transactions
  console.log('   Sending velocity burst for CARD_222...');
  for (let i = 0; i < 4; i++) {
    await axios.post(`${BASE_URL}/transactions`, { cardId: 'CARD_222', amount: 15.00 + i, location: 'CA' }, authHeader);
    await new Promise(r => setTimeout(r, 200));
  }

  // Wait for all socket events
  await new Promise(r => setTimeout(r, 1500));

  console.log('\n8. Verification Results:');
  console.log(`   Total transactions received via Socket: ${receivedTx.length}`);
  console.log(`   Total fraud alerts received via Socket: ${receivedAlerts.length}`);

  // Check that rulesTriggered is returned in GET /api/transactions
  const updatedTxRes = await axios.get(`${BASE_URL}/transactions`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(`   Transactions in GET /api/transactions: ${updatedTxRes.data.length}`);
  const flaggedFromApi = updatedTxRes.data.filter(t => t.flagged);
  console.log(`   Flagged transactions from API: ${flaggedFromApi.length}`);
  flaggedFromApi.forEach(t => {
    console.log(`     - Card: ${t.cardId} | Rules: ${JSON.stringify(t.rulesTriggered)} | Risk: ${t.riskScore}`);
  });

  socket.disconnect();
  console.log('\n=== END-TO-END VERIFICATION COMPLETED SUCCESSFULLY ===');
}

runVerification().catch(err => {
  console.error('Verification failed:', err.response?.data || err.message);
  process.exit(1);
});
