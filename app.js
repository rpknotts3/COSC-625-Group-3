const express = require('express');
const cors = require('cors');  // Import the CORS middleware

const app = express();
const PORT = 3001;

// Enable CORS for all routes
app.use(cors());

// A simple test route to verify the server is running
app.get('/', (req, res) => {
  res.send('CEMS Backend API is running');
});

// A sample endpoint that returns a list of events
app.get('/events', (req, res) => {
  const sampleEvents = [
    { id: 1, title: 'CEMS Kick-Off Meeting', date: '2025-03-25' },
    { id: 2, title: 'Tech Workshop', date: '2025-04-01' }
  ];
  res.json(sampleEvents);
});

// Start the server on port 3001
app.listen(PORT, () => {
  console.log('Server listening on port ' + PORT);
});
