const express = require('express');
const app = express();
const PORT = 3001;

// A simple route to test if the server is working
app.get('/', (req, res) => {
  res.send('CEMS Backend API is running');
});

// Start the server
app.listen(PORT, () => {
  console.log('Server listening on port ' + PORT);
});
