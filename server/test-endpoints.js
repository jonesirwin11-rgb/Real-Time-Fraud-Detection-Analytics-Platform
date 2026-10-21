const http = require('http');

function post(url, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data: body }));
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  console.log("== REGISTER ==");
  try {
    const regRes = await post('http://localhost:3000/api/auth/register', JSON.stringify({
      username: 'admin',
      password: 'password',
      role: 'admin'
    }));
    console.log(`Status: ${regRes.status}`);
    console.log(`Body: ${regRes.data}`);
  } catch (err) {
    console.log(`Register Error: ${err.message}`);
  }

  console.log("== LOGIN ==");
  try {
    const loginRes = await post('http://localhost:3000/api/auth/login', JSON.stringify({
      username: 'admin',
      password: 'password'
    }));
    console.log(`Status: ${loginRes.status}`);
    console.log(`Body: ${loginRes.data}`);
  } catch (err) {
    console.log(`Login Error: ${err.message}`);
  }
})();
