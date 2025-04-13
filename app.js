require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'secretsecret';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'campus_event_management',
  waitForConnections: true,
  connectionLimit: 10
});

app.use(helmet());
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace(/^Bearer\s+/, '');
  if (!token) {
    return res.status(401).json({ error: 'Missing or invalid token.' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin privilege required.' });
  }
  next();
}

function requireStudent(req, res, next) {
  if (!req.user || req.user.role !== 'student') {
    return res.status(403).json({ error: 'Student privilege required.' });
  }
  next();
}

function requireOrganizerOrAdmin(req, res, next) {
  if (!req.user) {
    return res.status(403).json({ error: 'No user in request.' });
  }
  if (req.user.role !== 'organizer' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Organizer or Admin privilege required.' });
  }
  next();
}

app.get('/api/ping', (req, res) => {
  res.json({ message: 'CEMS backend (MySQL) up and running.' });
});

app.post('/api/users', async (req, res) => {
  try {
    const { full_name, email, password, role } = req.body;
    if (!full_name || !email || !password) {
      return res.status(400).json({ error: 'full_name, email, and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }
    const [existing] = await pool.query('SELECT user_id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already taken.' });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
        'INSERT INTO users (full_name, email, password, role) VALUES (?,?,?,?)',
        [full_name, email, passwordHash, role || 'student']
    );
    const newUserId = result.insertId;
    res.status(201).json({
      id: newUserId,
      full_name,
      email,
      role: role || 'student'
    });
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: 'Server error creating user.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password required.' });
    }
    const [rows] = await pool.query(
        'SELECT user_id, full_name, email, password, role FROM users WHERE email = ?',
        [email]
    );
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }
    const tokenPayload = { id: user.user_id, email: user.email, role: user.role };
    const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token });
  } catch (err) {
    console.error('Error logging in:', err);
    res.status(500).json({ error: 'Server error logging in.' });
  }
});

app.get('/api/events', async (req, res) => {
  try {
    const [rows] = await pool.query(
        `SELECT event_id, event_name, description, event_date, event_time,
              venue_id, category_id, organizer_id, status
       FROM events
       WHERE status='approved'
       ORDER BY event_date, event_time`
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching approved events:', err);
    res.status(500).json({ error: 'Server error fetching events.' });
  }
});

app.get('/api/events/search', async (req, res) => {
  const { keyword, status, start, end, venue, category, organizer } = req.query;
  let whereClauses = [];
  let params = [];

  if (keyword) {
    whereClauses.push("(LOWER(event_name) LIKE ? OR LOWER(description) LIKE ?)");
    const lowerKey = `%${keyword.toLowerCase()}%`;
    params.push(lowerKey, lowerKey);
  }
  if (status) {
    whereClauses.push("LOWER(status) = ?");
    params.push(status.toLowerCase());
  }
  if (start) {
    whereClauses.push("event_date >= ?");
    params.push(start);
  }
  if (end) {
    whereClauses.push("event_date <= ?");
    params.push(end);
  }
  if (venue) {
    whereClauses.push("venue_id = ?");
    params.push(parseInt(venue, 10));
  }
  if (category) {
    whereClauses.push("category_id = ?");
    params.push(parseInt(category, 10));
  }
  if (organizer) {
    whereClauses.push("organizer_id = ?");
    params.push(parseInt(organizer, 10));
  }

  let sql = `
    SELECT event_id, event_name, description, event_date, event_time,
           venue_id, category_id, organizer_id, status
    FROM events
  `;
  if (whereClauses.length > 0) {
    sql += " WHERE " + whereClauses.join(" AND ");
  }
  sql += " ORDER BY event_date, event_time";

  try {
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('Error searching events:', err);
    res.status(500).json({ error: 'Server error searching events.' });
  }
});

app.post('/api/events', requireAuth, requireOrganizerOrAdmin, async (req, res) => {
  try {
    const { event_name, description, event_date, event_time, venue_id, category_id } = req.body;
    if (!event_name || !description || !event_date || !event_time) {
      return res.status(400).json({ error: 'Missing required fields: event_name, description, event_date, event_time' });
    }
    const organizer_id = req.user.id;
    const [result] = await pool.query(
        `INSERT INTO events
       (event_name, description, event_date, event_time, venue_id, category_id, organizer_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
        [event_name, description, event_date, event_time, venue_id || null, category_id || null, organizer_id]
    );
    const newEventId = result.insertId;
    const [created] = await pool.query(
        `SELECT event_id, event_name, description, event_date, event_time,
              venue_id, category_id, organizer_id, status
       FROM events
       WHERE event_id = ?`,
        [newEventId]
    );
    res.status(201).json({ message: 'Event created.', event: created[0] });
  } catch (err) {
    console.error('Error creating event:', err);
    res.status(500).json({ error: 'Server error creating event.' });
  }
});

app.patch('/api/events/:id/approve', requireAuth, requireAdmin, async (req, res) => {
  const eventId = parseInt(req.params.id, 10);
  try {
    const [rows] = await pool.query("SELECT event_id FROM events WHERE event_id=?", [eventId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    await pool.query("UPDATE events SET status='approved' WHERE event_id=?", [eventId]);
    const [updated] = await pool.query(
        `SELECT event_id, event_name, description, event_date, event_time,
              venue_id, category_id, organizer_id, status
       FROM events
       WHERE event_id=?`,
        [eventId]
    );
    res.json({ message: 'Event approved.', event: updated[0] });
  } catch (err) {
    console.error('Error approving event:', err);
    res.status(500).json({ error: 'Server error approving event.' });
  }
});

app.patch('/api/events/:id/reject', requireAuth, requireAdmin, async (req, res) => {
  const eventId = parseInt(req.params.id, 10);
  try {
    const [rows] = await pool.query("SELECT event_id FROM events WHERE event_id=?", [eventId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    await pool.query("UPDATE events SET status='rejected' WHERE event_id=?", [eventId]);
    const [updated] = await pool.query(
        `SELECT event_id, event_name, description, event_date, event_time,
              venue_id, category_id, organizer_id, status
       FROM events
       WHERE event_id=?`,
        [eventId]
    );
    res.json({ message: 'Event rejected.', event: updated[0] });
  } catch (err) {
    console.error('Error rejecting event:', err);
    res.status(500).json({ error: 'Server error rejecting event.' });
  }
});

app.post('/api/events/:id/registrations', requireAuth, requireStudent, async (req, res) => {
  const eventId = parseInt(req.params.id, 10);
  try {
    const [evRows] = await pool.query("SELECT status FROM events WHERE event_id=?", [eventId]);
    if (evRows.length === 0) {
      return res.status(404).json({ error: 'Event not found.' });
    }
    if (evRows[0].status !== 'approved') {
      return res.status(400).json({ error: 'Event not approved yet.' });
    }
    const [dup] = await pool.query(
        `SELECT registration_id
       FROM registrations
       WHERE event_id=? AND user_id=? AND status='registered'`,
        [eventId, req.user.id]
    );
    if (dup.length > 0) {
      return res.status(400).json({ error: 'You have already registered for this event.' });
    }
    await pool.query(
        "INSERT INTO registrations (event_id, user_id, status) VALUES (?, ?, 'registered')",
        [eventId, req.user.id]
    );
    res.status(201).json({ message: 'Registration successful.' });
  } catch (err) {
    console.error('Error registering:', err);
    res.status(500).json({ error: 'Server error registering for event.' });
  }
});

app.delete('/api/events/:id/registrations', requireAuth, requireStudent, async (req, res) => {
  const eventId = parseInt(req.params.id, 10);
  try {
    const [rows] = await pool.query(
        `SELECT registration_id
       FROM registrations
       WHERE event_id=? AND user_id=? AND status='registered'`,
        [eventId, req.user.id]
    );
    if (rows.length === 0) {
      return res.status(400).json({ error: 'You are not currently registered for this event.' });
    }
    await pool.query(
        "UPDATE registrations SET status='cancelled' WHERE event_id=? AND user_id=?",
        [eventId, req.user.id]
    );
    res.json({ message: 'Registration canceled.' });
  } catch (err) {
    console.error('Error canceling registration:', err);
    res.status(500).json({ error: 'Server error canceling registration.' });
  }
});

app.get('/api/events/:id/feedback', async (req, res) => {
  const eventId = parseInt(req.params.id, 10);
  try {
    const [feedbackRows] = await pool.query(
        `SELECT feedback_id, user_id, rating, comments, created_at
       FROM feedback
       WHERE event_id=?
       ORDER BY created_at DESC`,
        [eventId]
    );
    res.json(feedbackRows);
  } catch (err) {
    console.error('Error listing feedback:', err);
    res.status(500).json({ error: 'Server error listing feedback.' });
  }
});

app.post('/api/events/:id/feedback', requireAuth, requireStudent, async (req, res) => {
  const eventId = parseInt(req.params.id, 10);
  const { rating, comments } = req.body;
  try {
    if (!rating) {
      return res.status(400).json({ error: 'Missing required field: rating (1-5).' });
    }
    await pool.query(
        `INSERT INTO feedback (event_id, user_id, rating, comments)
       VALUES (?, ?, ?, ?)`,
        [eventId, req.user.id, rating, comments || '']
    );
    res.status(201).json({ message: 'Feedback submitted.' });
  } catch (err) {
    console.error('Error submitting feedback:', err);
    res.status(500).json({ error: 'Server error creating feedback.' });
  }
});

app.get('/api/notifications', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.query(
        `SELECT notification_id, message, is_read, created_at
       FROM notifications
       WHERE user_id=?
       ORDER BY created_at DESC`,
        [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    console.error('Error listing notifications:', err);
    res.status(500).json({ error: 'Server error listing notifications.' });
  }
});

app.post('/api/notifications', requireAuth, async (req, res) => {
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Missing required field: message' });
  }
  try {
    await pool.query(
        `INSERT INTO notifications (user_id, message)
       VALUES (?, ?)`,
        [req.user.id, message]
    );
    res.status(201).json({ message: 'Notification created.' });
  } catch (err) {
    console.error('Error creating notification:', err);
    res.status(500).json({ error: 'Server error creating notification.' });
  }
});

app.patch('/api/notifications/:id/read', requireAuth, async (req, res) => {
  const notifId = parseInt(req.params.id, 10);
  try {
    await pool.query(
        `UPDATE notifications
       SET is_read=TRUE
       WHERE notification_id=? AND user_id=?`,
        [notifId, req.user.id]
    );
    res.json({ message: 'Notification marked as read.' });
  } catch (err) {
    console.error('Error marking notification read:', err);
    res.status(500).json({ error: 'Server error updating notification.' });
  }
});

app.listen(PORT, () => {
  console.log(`CEMS backend (MySQL) listening on port ${PORT}.`);
  console.log('Set JWT_SECRET, DB_HOST, DB_USER, DB_PASS, and DB_NAME in production environments.');
});
