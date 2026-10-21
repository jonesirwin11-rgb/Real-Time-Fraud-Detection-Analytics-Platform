const { MongoMemoryServer } = require('mongodb-memory-server');

async function start() {
  console.log('Initializing MongoDB instance on port 27017...');
  const mongod = await MongoMemoryServer.create({
    instance: {
      port: 27017,
      dbName: 'fraud_db',
    },
    binary: {
      version: '6.0.14' // Lightweight & stable Windows binary
    }
  });

  const uri = mongod.getUri();
  console.log(`MongoDB started successfully at ${uri}`);
  console.log(`Listening on port ${mongod.instanceInfo.port}`);
  
  process.on('SIGINT', async () => {
    console.log('Stopping MongoDB...');
    await mongod.stop();
    process.exit(0);
  });
}

start().catch(err => {
  console.error('Failed to start MongoDB:', err);
  process.exit(1);
});
