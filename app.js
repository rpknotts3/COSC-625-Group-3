// app.js
require('dotenv').config();

const express       = require('express');
const cors          = require('cors');
const helmet        = require('helmet');
const rateLimit     = require('express-rate-limit');
const bcrypt        = require('bcrypt');
const jwt           = require('jsonwebtoken');
const mysql         = require('mysql2/promise');
const nodemailer    = require('nodemailer');
const multer        = require('multer');
const path          = require('path');
const fs            = require('fs');

const connectMongoDB = require('./mongoose');
const User           = require('./models/User');

;(async () => {
  try {
    // 1) Connect to Mongo
    console.log('▶️  MONGO_URI =', process.env.MONGO_URI);
    await connectMongoDB();
    console.log('✅  MongoDB Connected Successfully');

    // 2) Init Express
    const app = express();
    const PORT = process.env.PORT || 3000;
    const JWT_SECRET = process.env.JWT_SECRET || 'supersecretlocalkey';

    // 3) MySQL pool
    const pool = mysql.createPool({
      host:     process.env.DB_HOST || 'localhost',
      user:     process.env.DB_USER || 'root',
      password: process.env.DB_PASS || '',
      database: process.env.DB_NAME || 'campus_event_management',
      waitForConnections: true,
      connectionLimit:    10
    });

    // ─── Global middleware ────────────────────────────────────────────────
    app.use(helmet());
    app.use(rateLimit({
      windowMs: 15 * 60 * 1000,
      max:      100,
      standardHeaders: true,
      legacyHeaders:   false
    }));
    app.use(express.json());
    app.use(cors());
    app.use(express.urlencoded({ extended: true }));

    // ─── Static files ──────────────────────────────────────────────────────
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    app.use('/files', express.static(uploadDir));

    // ─── Mail transport ────────────────────────────────────────────────────
    const mailTransport = process.env.SMTP_HOST
      ? nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT || 587),
          secure: false,
          auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        })
      : null;

    // ─── Multer setup ──────────────────────────────────────────────────────
    const storage = multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, uploadDir),
      filename:    (_req, file, cb) => {
        const safe = file.originalname.replace(/\s+/g, '_');
        cb(null, `${Date.now()}-${safe}`);
      }
    });
    const upload = multer({
      storage,
      limits: { fileSize: 15 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        const allowed = ['.pdf','.ppt','.pptx','.doc','.docx'];
        allowed.includes(path.extname(file.originalname).toLowerCase())
          ? cb(null, true)
          : cb(new Error('Only document files allowed.'));
      }
    });

    // ─── Auth helpers ─────────────────────────────────────────────────────
    function requireAuth(req, res, next) {
      const token = (req.headers.authorization||'').replace(/^Bearer\s+/i,'');
      if (!token) return res.status(401).json({ error: 'Missing or invalid token.' });
      try {
        req.user = jwt.verify(token, JWT_SECRET);
        next();
      } catch {
        res.status(401).json({ error: 'Invalid or expired token.' });
      }
    }
    const requireAdmin = (req, res, next) =>
      req.user?.role === 'admin'
        ? next()
        : res.status(403).json({ error: 'Admin privilege required.' });
    const requireStudent = (req, res, next) =>
      req.user?.role === 'student'
        ? next()
        : res.status(403).json({ error: 'Student privilege required.' });
    function requireOrganizerOrAdmin(req, res, next) {
      if (req.user && ['organizer','admin'].includes(req.user.role)) return next();
      res.status(403).json({ error: 'Organizer or Admin privilege required.' });
    }

    // ─── Notification & Reminder helpers ──────────────────────────────────
    async function dispatchEventNotification(eventId, subject, body) {
      const [recipients] = await pool.query(
        `SELECT u.user_id, u.email
         FROM users u
         WHERE u.role='student' AND (
           (SELECT course_id FROM events WHERE event_id=?) IS NULL
           OR EXISTS (
             SELECT 1 FROM course_enrollments ce
             WHERE ce.course_id=(SELECT course_id FROM events WHERE event_id=?)
               AND ce.user_id=u.user_id
           )
         )`,
        [eventId,eventId]
      );
      if (!recipients.length) return;

      const rows = recipients.map(r => [r.user_id, body, 'event_update']);
      await pool.query('INSERT INTO notifications (user_id,message,notification_type) VALUES ?', [rows]);

      if (mailTransport) {
        try {
          await mailTransport.sendMail({
            from: process.env.SMTP_FROM || 'no-reply@cems.local',
            bcc: recipients.map(r => r.email),
            subject,
            text: body
          });
        } catch (e) {
          console.error('Email error:', e);
        }
      }
    }

    async function scheduleReminder(eventId, when) {
      const ts = toMySqlDateTime(when);
      if (!ts) throw new Error('Invalid reminder time');
      await pool.query(
        `INSERT INTO event_reminders (event_id, reminder_time)
         VALUES (?,?)
         ON DUPLICATE KEY UPDATE reminder_time=VALUES(reminder_time), is_sent=FALSE`,
        [eventId, ts]
      );
    }

    function toMySqlDateTime(d) {
      if (!(d instanceof Date) || isNaN(d)) return null;
      return d.toISOString().slice(0,19).replace('T',' ');
    }

    // ─── Routes ───────────────────────────────────────────────────────────
    app.get('/api/ping', (_req, res) => res.json({ message: 'CEMS backend up.' }));

    // User registration
    app.post('/api/users', async (req, res) => {
      console.log('Incoming registration body:', req.body);
      try {
        const { full_name, email, password, role } = req.body;
        if (!full_name || !email || !password)
          return res.status(400).json({ error: 'full_name, email, and password are required.' });
        if (password.length < 6)
          return res.status(400).json({ error: 'Password must be at least 6 characters long.' });

        if (await User.findOne({ email }))
          return res.status(409).json({ error: 'Email taken.' });

        const hashed = await bcrypt.hash(password, 10);
        const newUser = new User({ full_name, email, password: hashed, role: role || 'student' });
        await newUser.save();

        res.status(201).json({
          id: newUser._id,
          full_name: newUser.full_name,
          email: newUser.email,
          role: newUser.role
        });
      } catch (e) {
        console.error('Registration error:', e);
        res.status(500).json({ error: 'Server error creating user.' });
      }
    });

    // User login
    app.post('/api/auth/login', async (req, res) => {
      const { email, password } = req.body;
      if (!email || !password)
        return res.status(400).json({ error: 'email and password required.' });

      try {
        const user = await User.findOne({ email });
        if (!user || !(await user.comparePassword(password)))
          return res.status(401).json({ error: 'Invalid credentials.' });

        const token = jwt.sign(
          { id: user._id, email: user.email, role: user.role },
          JWT_SECRET,
          { expiresIn: '1h' }
        );
        res.json({ token });
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error logging in.' });
      }
    });

    // Event listing & search
    app.get('/api/events', async (_req, res) => {
      try {
        const [rows] = await pool.query(
          `SELECT event_id,event_name,description,event_date,event_time,venue_id,category_id,organizer_id,status
           FROM events WHERE status='approved' ORDER BY event_date,event_time`
        );
        res.json(rows);
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error fetching events.' });
      }
    });

    app.get('/api/events/search', async (req, res) => {
      const { keyword, status, start, end, venue, category, organizer } = req.query;
      const where = [], params = [];
      if (keyword) {
        where.push('(LOWER(event_name) LIKE ? OR LOWER(description) LIKE ?)');
        params.push(`%${keyword.toLowerCase()}%`, `%${keyword.toLowerCase()}%`);
      }
      if (status)   { where.push('LOWER(status)=?');    params.push(status.toLowerCase()); }
      if (start)    { where.push('event_date>=?');      params.push(start); }
      if (end)      { where.push('event_date<=?');      params.push(end); }
      if (venue)    { where.push('venue_id=?');         params.push(Number(venue)); }
      if (category) { where.push('category_id=?');      params.push(Number(category)); }
      if (organizer){ where.push('organizer_id=?');     params.push(Number(organizer)); }

      let sql = 'SELECT event_id,event_name,description,event_date,event_time,venue_id,category_id,organizer_id,status FROM events';
      if (where.length) sql += ' WHERE ' + where.join(' AND ');
      sql += ' ORDER BY event_date,event_time';

      try {
        const [rows] = await pool.query(sql, params);
        res.json(rows);
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error searching events.' });
      }
    });

    // Create event
    app.post('/api/events', requireAuth, requireOrganizerOrAdmin, async (req, res) => {
      const { event_name, description, event_date, event_time, venue_id, category_id, course_id } = req.body;
      if (!event_name || !description || !event_date || !event_time)
        return res.status(400).json({ error: 'Missing required fields.' });

      try {
        const [r] = await pool.query(
          `INSERT INTO events
           (event_name,description,event_date,event_time,venue_id,category_id,organizer_id,course_id,status)
           VALUES (?,?,?,?,?,?,?,?,'pending')`,
          [event_name, description, event_date, event_time, venue_id||null, category_id||null, req.user.id, course_id||null]
        );
        const [created] = await pool.query('SELECT * FROM events WHERE event_id=?', [r.insertId]);
        res.status(201).json({ message: 'Event created.', event: created[0] });
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error creating event.' });
      }
    });

    // Approve/reject event
    app.patch('/api/events/:id/approve', requireAuth, requireAdmin, async (req, res) => {
      const id = Number(req.params.id);
      const [rows] = await pool.query('SELECT * FROM events WHERE event_id=?', [id]);
      if (!rows.length) return res.status(404).json({ error: 'Event not found.' });

      await pool.query('UPDATE events SET status="approved" WHERE event_id=?', [id]);
      await dispatchEventNotification(id, 'New Event Approved', `Event "${rows[0].event_name}" approved.`);
      res.json({ message: 'Event approved.' });
    });

    app.patch('/api/events/:id/reject', requireAuth, requireAdmin, async (req, res) => {
      const id = Number(req.params.id);
      const [rows] = await pool.query('SELECT * FROM events WHERE event_id=?', [id]);
      if (!rows.length) return res.status(404).json({ error: 'Event not found.' });

      await pool.query('UPDATE events SET status="rejected" WHERE event_id=?', [id]);
      res.json({ message: 'Event rejected.' });
    });

    // Update event
    app.patch('/api/events/:id', requireAuth, requireOrganizerOrAdmin, async (req, res) => {
      const id = Number(req.params.id);
      const { event_name, description, event_date, event_time, venue_id, category_id } = req.body;
      const [rows] = await pool.query('SELECT * FROM events WHERE event_id=?', [id]);
      if (!rows.length) return res.status(404).json({ error: 'Event not found.' });

      await pool.query(
        `UPDATE events SET
           event_name=COALESCE(?,event_name),
           description=COALESCE(?,description),
           event_date=COALESCE(?,event_date),
           event_time=COALESCE(?,event_time),
           venue_id=COALESCE(?,venue_id),
           category_id=COALESCE(?,category_id)
         WHERE event_id=?`,
        [event_name,description,event_date,event_time,venue_id,category_id, id]
      );
      await dispatchEventNotification(id, 'Event Updated', `Event "${rows[0].event_name}" has updates.`);
      res.json({ message: 'Event updated.' });
    });

    // Resource upload/listing
    app.post('/api/events/:id/resources', requireAuth, requireOrganizerOrAdmin, upload.single('file'), async (req, res) => {
      const eventId = Number(req.params.id);
      if (!req.file) return res.status(400).json({ error: 'File required.' });

      try {
        await pool.query(
          'INSERT INTO event_resources (event_id,resource_name,resource_url) VALUES (?,?,?)',
          [eventId, req.file.originalname, `/files/${req.file.filename}`]
        );
        res.status(201).json({ message: 'Resource uploaded.' });
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error uploading resource.' });
      }
    });

    app.get('/api/events/:id/resources', requireAuth, async (req, res) => {
      const id = Number(req.params.id);
      try {
        const [rows] = await pool.query(
          'SELECT resource_id,resource_name,resource_url,uploaded_at FROM event_resources WHERE event_id=?',
          [id]
        );
        res.json(rows);
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error fetching resources.' });
      }
    });

    // Registrations & feedback
    app.post('/api/events/:id/registrations', requireAuth, requireStudent, async (req, res) => {
      const id = Number(req.params.id);
      try {
        const [ev] = await pool.query(
          'SELECT status, course_id FROM events WHERE event_id = ?',
          [id]
        );
        if (!ev.length) return res.status(404).json({ error: 'Event not found.' });
        if (ev[0].status !== 'approved') return res.status(400).json({ error: 'Event not approved yet.' });

        if (ev[0].course_id) {
          const [en] = await pool.query(
            'SELECT 1 FROM course_enrollments WHERE course_id = ? AND user_id = ?',
            [ev[0].course_id, req.user.id]
          );
          if (!en.length) return res.status(403).json({ error: 'Not enrolled in course' });
        }

        const [dup] = await pool.query(
          'SELECT 1 FROM registrations WHERE event_id = ? AND user_id = ? AND status = "registered"',
          [id, req.user.id]
        );
        if (dup.length) return res.status(400).json({ error: 'Already registered.' });

        await pool.query(
          'INSERT INTO registrations (event_id, user_id, status) VALUES (?, ?, "registered")',
          [id, req.user.id]
        );
        res.status(201).json({ message: 'Registration successful.' });
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error registering.' });
      }
    });

    app.delete('/api/events/:id/registrations', requireAuth, requireStudent, async (req, res) => {
      const id = Number(req.params.id);
      try {
        const [rows] = await pool.query(
          'SELECT 1 FROM registrations WHERE event_id=? AND user_id=? AND status="registered"',
          [id, req.user.id]
        );
        if (!rows.length) return res.status(400).json({ error: 'Not registered.' });

        await pool.query(
          'UPDATE registrations SET status="cancelled" WHERE event_id=? AND user_id=?',
          [id, req.user.id]
        );
        res.json({ message: 'Registration canceled.' });
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error canceling registration.' });
      }
    });

    // Feedback
    app.get('/api/events/:id/feedback', async (req, res) => {
      const id = Number(req.params.id);
      try {
        const [rows] = await pool.query(
          'SELECT feedback_id,user_id,rating,comments,created_at FROM feedback WHERE event_id=? ORDER BY created_at DESC',
          [id]
        );
        res.json(rows);
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error listing feedback.' });
      }
    });

    app.post('/api/events/:id/feedback', requireAuth, requireStudent, async (req, res) => {
      const id = Number(req.params.id);
      const { rating, comments } = req.body;
      if (!rating) return res.status(400).json({ error: 'rating required.' });
      try {
        await pool.query(
          'INSERT INTO feedback (event_id,user_id,rating,comments) VALUES (?,?,?,?)',
          [id, req.user.id, rating, comments || '']
        );
        res.status(201).json({ message: 'Feedback submitted.' });
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error creating feedback.' });
      }
    });

    // Notifications
    app.get('/api/notifications', requireAuth, async (req, res) => {
      try {
        const [rows] = await pool.query(
          'SELECT notification_id,message,is_read,notification_type,created_at FROM notifications WHERE user_id=? ORDER BY created_at DESC',
          [req.user.id]
        );
        res.json(rows);
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error listing notifications.' });
      }
    });

    app.post('/api/notifications', requireAuth, async (req, res) => {
      const { message } = req.body;
      if (!message) return res.status(400).json({ error: 'message required.' });
      try {
        await pool.query('INSERT INTO notifications (user_id,message) VALUES (?,?)', [req.user.id, message]);
        res.status(201).json({ message: 'Notification created.' });
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error creating notification.' });
      }
    });

    app.patch('/api/notifications/:id/read', requireAuth, async (req, res) => {
      try {
        await pool.query(
          'UPDATE notifications SET is_read=TRUE WHERE notification_id=? AND user_id=?',
          [Number(req.params.id), req.user.id]
        );
        res.json({ message: 'Notification marked as read.' });
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error updating notification.' });
      }
    });

    // Check-in / Check-out
    app.post('/api/events/:id/checkin', requireAuth, requireStudent, async (req, res) => {
      const eventId = Number(req.params.id);
      try {
        const [[ev]] = await pool.query(
          'SELECT status FROM events WHERE event_id = ?',
          [eventId]
        );
        if (!ev) return res.status(404).json({ error: 'Event not found.' });
        if (ev.status !== 'approved') return res.status(400).json({ error: 'Event not approved.' });

        const [[reg]] = await pool.query(
          'SELECT registration_id FROM registrations WHERE event_id = ? AND user_id = ? AND status = "registered"',
          [eventId, req.user.id]
        );
        if (!reg) return res.status(403).json({ error: 'You did not RSVP for this event.' });

        await pool.query(
          `INSERT INTO event_attendance (event_id, user_id, check_in_time, attended)
           VALUES (?, ?, NOW(), TRUE)
           ON DUPLICATE KEY UPDATE check_in_time=VALUES(check_in_time), attended=TRUE`,
          [eventId, req.user.id]
        );
        res.status(201).json({ message: 'Checked-in successfully.' });
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error during check-in.' });
      }
    });

    app.post('/api/events/:id/checkout', requireAuth, requireStudent, async (req, res) => {
      const eventId = Number(req.params.id);
      try {
        const [results] = await pool.query(
          'UPDATE event_attendance SET check_out_time = NOW() WHERE event_id = ? AND user_id = ?',
          [eventId, req.user.id]
        );
        if (!results.affectedRows) return res.status(404).json({ error: 'No check-in record found.' });
        res.json({ message: 'Checked-out successfully.' });
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error during check-out.' });
      }
    });

    // Attendance report
    app.get('/api/events/:id/attendance', requireAuth, async (req, res) => {
      const eventId = Number(req.params.id);
      try {
        const [[ev]] = await pool.query(
          'SELECT organizer_id FROM events WHERE event_id = ?',
          [eventId]
        );
        if (!ev) return res.status(404).json({ error: 'Event not found.' });
        const isOwner = ev.organizer_id === req.user.id;
        if (!(req.user.role === 'admin' || isOwner))
          return res.status(403).json({ error: 'Not authorized.' });

        const [rows] = await pool.query(
          `SELECT u.full_name, u.email, a.check_in_time, a.check_out_time, a.attended
           FROM event_attendance a
           JOIN users u ON u.user_id = a.user_id
           WHERE a.event_id = ? ORDER BY a.check_in_time`,
          [eventId]
        );
        res.json(rows);
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error generating report.' });
      }
    });

    // Reminder configuration
    app.post('/api/events/:id/reminder', requireAuth, async (req, res) => {
      const eventId = Number(req.params.id);
      try {
        const [[ev]] = await pool.query(
          'SELECT organizer_id,event_date,event_time,status FROM events WHERE event_id=?',
          [eventId]
        );
        if (!ev) return res.status(404).json({ error: 'Event not found.' });
        if (ev.status !== 'approved')
          return res.status(400).json({ error: 'Event must be approved first.' });
        if (!(req.user.role === 'admin' || ev.organizer_id === req.user.id))
          return res.status(403).json({ error: 'Not authorized.' });

        if (!req.body.local)
          return res.status(400).json({ error: 'Provide "local": "YYYY-MM-DD HH:mm".' });
        const match = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2})$/.exec(req.body.local);
        if (!match) return res.status(400).json({ error: 'local time format invalid.' });

        const when = new Date(`${match[1]}T${match[2]}:00`);
        if (isNaN(when)) return res.status(400).json({ error: 'local time invalid.' });
        if (when < new Date()) return res.status(400).json({ error: 'local time is in the past.' });

        await scheduleReminder(eventId, when);
        res.status(201).json({
          message: 'Reminder scheduled.',
          reminder_time: toMySqlDateTime(when)
        });
      } catch (e) {
        console.error(e);
        res.status(500).json({ error: 'Server error scheduling reminder.' });
      }
    });

    // Background reminder dispatcher
    setInterval(async () => {
      try {
        const [due] = await pool.query(
          `SELECT r.reminder_id, r.event_id, e.event_name
           FROM event_reminders r
           JOIN events e ON e.event_id = r.event_id
           WHERE r.is_sent = FALSE AND r.reminder_time <= NOW()`
        );
        for (const row of due) {
          const msg = `Reminder: "${row.event_name}" is coming up soon.`;
          await dispatchEventNotification(row.event_id, 'Event Reminder', msg);
          await pool.query('UPDATE event_reminders SET is_sent = TRUE WHERE reminder_id = ?', [
            row.reminder_id
          ]);
        }
        if (due.length) console.log(`Sent ${due.length} reminder(s).`);
      } catch (e) {
        console.error('Reminder worker error:', e);
      }
    }, 60_000);

    // ─── Start server ───────────────────────────────────────────────────────
    app.listen(PORT, () => console.log(`🚀  CEMS backend listening on port ${PORT}`));

  } catch (err) {
    console.error('❌  Failed to start server:', err);
    process.exit(1);
  }
})();