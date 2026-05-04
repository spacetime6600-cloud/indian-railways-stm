const axios = require('axios');
axios.post('http://localhost:5000/api/auth/login', {
  email: 'admin@kinetic.ai',
  password: 'password123'
}).then(res => console.log(res.data)).catch(err => console.error(err.response ? err.response.data : err.message));
