import React, { useEffect, useState } from 'react';

function App() {
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);

  // Fetch events from the backend when the component mounts
  useEffect(() => {
    fetch('http://localhost:3001/events')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => setEvents(data))
      .catch(err => setError(err.message));
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Upcoming Events</h1>
      {error ? (
        <p style={{ color: 'red' }}>Error: {error}</p>
      ) : (
        <ul>
          {events.map(event => (
            <li key={event.id}>
              <strong>{event.title}</strong> - {event.date}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default App;
