// app.js
require('dotenv').config();

const express       = require('express');
const cors          = require('cors');
const helmet        = require('helmet');
const rateLimit     = require('express-rate-limit');
const bcrypt        = require('bcrypt');
const jwt           = require('jsonwebtoken');
const nodemailer    = require('nodemailer');
const multer        = require('multer');
const path          = require('path');
const fs            = require('fs');

const connectMongoDB  = require('./mongoose');
const User            = require('./models/User');
const Event           = require('./models/Event');
const Resource        = require('./models/Resource');
const Registration    = require('./models/Registration');
const Feedback        = require('./models/Feedback');
const Notification    = require('./models/Notification');
const Reminder        = require('./models/Reminder');
const Attendance      = require('./models/Attendance');

;(async () => {
  // 1) Mongo
  console.log('▶️  MONGO_URI =', process.env.MONGO_URI);
  await connectMongoDB();
  console.log('✅  MongoDB Connected');

  // 2) Express init
  const app        = express();
  const PORT       = process.env.PORT || 3000;
  const JWT_SECRET = process.env.JWT_SECRET || 'supersecretlocalkey';

  // ─── Middleware ────────────────────────────────────────────────────────
  const allowedOrigins = ['http://localhost:8080', 'http://localhost:8081', 'http://localhost:8082', 'http://localhost:8083', 'http://localhost:8084'];

  app.use(cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  }));

  app.use(helmet());
  app.use(
      rateLimit({
        windowMs:        60 * 10000,
        max:             100,
        standardHeaders: true,
        legacyHeaders:   false,

        /* NEW → don’t count or block pre-flight requests */
        skip: (req) => req.method === 'OPTIONS',

        /* optional: still return CORS header on 429 */
        handler: (req, res) => {
          res.set('Access-Control-Allow-Origin', 'http://localhost:8080');
          res.status(429).json({ error: 'Too many requests' });
        },
      })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // ─── Static file upload dir ─────────────────────────────────────────────
  const uploadDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
  app.use('/files', express.static(uploadDir));

  // ─── Mail transport ────────────────────────────────────────────────────
  const mailTransport = process.env.SMTP_HOST
    ? nodemailer.createTransport({
        host:   process.env.SMTP_HOST,
        port:   +process.env.SMTP_PORT || 587,
        secure: false,
        auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      })
    : null;

  // ─── Multer setup ──────────────────────────────────────────────────────
  const storage = multer.diskStorage({
    destination: (_req,_file,cb) => cb(null, uploadDir),
    filename:    (_req,file,cb) => {
      const safe = file.originalname.replace(/\s+/g,'_');
      cb(null, `${Date.now()}-${safe}`);
    }
  });
  const upload = multer({
    storage,
    limits: { fileSize: 15*1024*1024 },
    fileFilter: (_req,file,cb) => {
      const a = ['.pdf','.ppt','.pptx','.doc','.docx'];
      a.includes(path.extname(file.originalname).toLowerCase())
        ? cb(null,true)
        : cb(new Error('Only document files allowed.'));
    }
  });

  // ─── Auth helpers ─────────────────────────────────────────────────────
  function requireAuth(req,res,next){
    const t = (req.headers.authorization||'').replace(/^Bearer\s+/i,'');
    if(!t) return res.status(401).json({error:'Missing token'});
    try {
      req.user = jwt.verify(t,JWT_SECRET);
      next();
    } catch {
      res.status(401).json({error:'Invalid or expired token'});
    }
  }
  const requireAdmin = (req,res,next)=>
    req.user.role==='admin' ? next() : res.status(403).json({error:'Admin only'});
  const requireStudent = (req,res,next)=>
    req.user.role==='student' ? next() : res.status(403).json({error:'Student only'});
  const requireOrganizerOrAdmin = (req,res,next)=>
    ['organizer','admin'].includes(req.user.role)
      ? next()
      : res.status(403).json({error:'Organizer or admin only'});

  // ─── Notification helper ──────────────────────────────────────────────
  async function dispatchEventNotification(eventId, subject, body) {
    // send to students (subscribers) …
    const students = await User.find({ role:'student' });
    if (!students.length) return;
    await Notification.insertMany(
      students.map(u=>({ user:u._id, message:body, type:'event_update' }))
    );
    if (mailTransport) {
      try {
        await mailTransport.sendMail({
          from:    process.env.SMTP_FROM||'no-reply@cems.local',
          bcc:     students.map(u=>u.email),
          subject, text:body
        });
      } catch(e){ console.error('❌ email:',e) }
    }
  }

  // ─── Routes ───────────────────────────────────────────────────────────

  // Health
  app.get('/api/ping', (_r, res) => res.json({ message:'CEMS up' }));

  // Register
  app.post('/api/users', async (req,res)=>{
    const { full_name,email,password,role } = req.body;
    if (!full_name||!email||!password)
      return res.status(400).json({error:'name,email,password required'});
    if (password.length<6)
      return res.status(400).json({error:'Password ≥ 6 chars'});

    if (await User.findOne({ email }))
      return res.status(409).json({error:'Email taken'});

    const hash = await bcrypt.hash(password,10);
    const u = new User({ full_name,email,password:hash,role });
    await u.save();
    res.status(201).json({ id:u._id, full_name:u.full_name, email:u.email, role:u.role });
  });

  // Login
  app.post('/api/auth/login', async (req,res)=>{
    const { email,password } = req.body;
    if (!email||!password)
      return res.status(400).json({error:'email & password required'});

    const u = await User.findOne({ email });
    if (!u || !(await u.comparePassword(password)))
      return res.status(401).json({error:'Invalid credentials'});

    const effectiveRole = u.role === 'professor' ? 'organizer' : u.role;
    const token = jwt.sign(
        { id: u._id, username: u.full_name, role: effectiveRole },
        JWT_SECRET,
        { expiresIn: '1h' }
    );
    res.json({ token });
  });

  // List approved events
  // GET /api/events   – approved events + accurate RSVP counts
  app.get('/api/events', async (_req, res) => {
    try {
      const ev = await Event.aggregate([
        { $match: { status: 'approved' } },

        /* join registrations where registration.event === event._id (as string) */
        {
          $lookup: {
            from: 'registrations',
            let: { eid: { $toString: '$_id' } },   // ObjectId → string
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$event', '$$eid'] } // compare strings
                }
              }
            ],
            as: 'regs'
          }
        },

        { $addFields: { rsvp_count: { $size: '$regs' } } },
        { $project: { regs: 0 } },
        { $sort: { event_date: 1, event_time: 1 } }
      ]);

      res.json(ev);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Fetching events failed' });
    }
  });



  // Search events
  app.get('/api/events/search', async (req,res)=>{
    const { keyword,status,start,end,venue,category,organizer } = req.query;
    const filter = {};
    if (keyword) filter.$or = [
      { event_name:  new RegExp(keyword,'i') },
      { description: new RegExp(keyword,'i') }
    ];
    if (status)      filter.status       = status;
    if (start||end)  filter.event_date   = {
      ...(start && { $gte:new Date(start)}),
      ...(end   && { $lte:new Date(end)  })
    };
    if (venue)       filter.venue_id     = venue;
    if (category)    filter.category_id  = category;
    if (organizer)   filter.organizer_id = organizer;

    try {
      const ev = await Event.find(filter)
                            .sort({ event_date:1,event_time:1 });
      res.json(ev);
    } catch(e){
      console.error(e);
      res.status(500).json({error:'Search failed'});
    }
  });

  // Create event
  app.post('/api/events', requireAuth, requireOrganizerOrAdmin, async (req,res)=>{
    try {
      const ev = new Event({
        ...req.body,
        organizer_id:req.user.id,
        status:'pending'
      });
      await ev.save();
      res.status(201).json({ event:ev });
    } catch(e){
      console.error(e);
      res.status(500).json({error:'Create event failed'});
    }
  });

  // Approve / Reject
  app.patch('/api/events/:id/approve', requireAuth, requireAdmin, async (req,res)=>{
    const ev = await Event.findByIdAndUpdate(req.params.id, { status:'approved' }, { new:true });
    if (!ev) return res.status(404).json({error:'Not found'});
    await dispatchEventNotification(ev._id,'Event Approved',`"${ev.event_name}" approved`);
    res.json({ message:'Approved' });
  });
  app.patch('/api/events/:id/reject', requireAuth, requireAdmin, async (req,res)=>{
    const ev = await Event.findByIdAndUpdate(req.params.id, { status:'rejected' }, { new:true });
    if (!ev) return res.status(404).json({error:'Not found'});
    res.json({ message:'Rejected' });
  });

  // Update event
  app.patch('/api/events/:id', requireAuth, requireOrganizerOrAdmin, async (req,res)=>{
    const ev = await Event.findByIdAndUpdate(req.params.id, req.body, { new:true });
    if (!ev) return res.status(404).json({error:'Not found'});
    await dispatchEventNotification(ev._id,'Event Updated',`"${ev.event_name}" updated`);
    res.json({ event:ev });
  });

  // Resources
  app.post('/api/events/:id/resources', requireAuth, requireOrganizerOrAdmin, upload.single('file'), async (req,res)=>{
    if(!req.file) return res.status(400).json({error:'File required'});
    const r = new Resource({
      event: req.params.id,
      name:  req.file.originalname,
      url:   `/files/${req.file.filename}`
    });
    await r.save();
    res.status(201).json({ message:'Uploaded', resource:r });
  });
  app.get('/api/events/:id/resources', requireAuth, async (req,res)=>{
    const list = await Resource.find({ event:req.params.id });
    res.json(list);
  });

  // Registrations
  app.post('/api/events/:id/registrations', requireAuth, requireStudent, async (req,res)=>{
    const exists = await Registration.findOne({ event:req.params.id, user:req.user.id });
    if (exists) return res.status(400).json({error:'Already registered'});
    await Registration.create({ event:req.params.id, user:req.user.id });
    res.status(201).json({ message:'Registered' });
  });
  app.delete('/api/events/:id/registrations', requireAuth, requireStudent, async (req,res)=>{
    const r = await Registration.findOneAndDelete({ event:req.params.id, user:req.user.id });
    if (!r) return res.status(400).json({error:'Not registered'});
    res.json({ message:'Cancelled' });
  });


// GET /api/events/:id/registrations/count  →  { count: 42 }
  app.get('/api/events/:id/registrations/count', async (req, res) => {
    const count = await Registration.countDocuments({ event: req.params.id });
    res.json({ count });
  });

  // Feedback
  app.get('/api/events/:id/feedback', async (req,res)=>{
    const f = await Feedback.find({ event:req.params.id }).sort({ createdAt:-1 });
    res.json(f);
  });
  app.post('/api/events/:id/feedback', requireAuth, requireStudent, async (req,res)=>{
    const { rating, comments } = req.body;
    if (!rating) return res.status(400).json({error:'Rating required'});
    const fb = await Feedback.create({ event:req.params.id, user:req.user.id, rating, comments });
    res.status(201).json({ message:'Submitted', feedback:fb });
  });

  // Notifications
  app.get('/api/notifications', requireAuth, async (req,res)=>{
    const n = await Notification.find({ user:req.user.id }).sort({ createdAt:-1 });
    res.json(n);
  });
  app.post('/api/notifications', requireAuth, async (req,res)=>{
    const { message } = req.body;
    if (!message) return res.status(400).json({error:'message required'});
    const n = await Notification.create({ user:req.user.id, message });
    res.status(201).json({ notification:n });
  });
  app.patch('/api/notifications/:id/read', requireAuth, async (req,res)=>{
    const n = await Notification.findByIdAndUpdate(req.params.id, { read:true }, { new:true });
    if (!n) return res.status(404).json({error:'Not found'});
    res.json({ message:'Marked read' });
  });

  // Attendance (checkin/checkout)
  app.post('/api/events/:id/checkin', requireAuth, requireStudent, async (req,res)=>{
    let a = await Attendance.findOneAndUpdate(
      { event:req.params.id,user:req.user.id },
      { checkin:Date.now(), attended:true },
      { upsert:true,new:true }
    );
    res.status(201).json({ message:'Checked in', attendance:a });
  });
  app.post('/api/events/:id/checkout', requireAuth, requireStudent, async (req,res)=>{
    const a = await Attendance.findOneAndUpdate(
      { event:req.params.id,user:req.user.id },
      { checkout:Date.now() },
      { new:true }
    );
    if (!a) return res.status(404).json({error:'No checkin record'});
    res.json({ message:'Checked out', attendance:a });
  });
  app.get('/api/events/:id/attendance', requireAuth, async (req,res)=>{
    const list = await Attendance.find({ event:req.params.id }).populate('user','full_name email');
    res.json(list);
  });

  // Reminders
  app.post('/api/events/:id/reminder', requireAuth, async (req,res)=>{
    const { local } = req.body;
    if (!local || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(local))
      return res.status(400).json({error:'Provide "local": "YYYY-MM-DD HH:mm"'});
    const when = new Date(local.replace(' ','T'));
    if (when < new Date()) return res.status(400).json({error:'Time in past'});
    const r = await Reminder.findOneAndUpdate(
      { event:req.params.id },
      { time:when, sent:false },
      { upsert:true,new:true }
    );
    res.status(201).json({ reminder:r });
  });

  // Background reminder dispatcher
  setInterval(async()=>{
    const due = await Reminder.find({ sent:false, time:{ $lte: new Date() }});
    for(const r of due){
      const ev = await Event.findById(r.event);
      await dispatchEventNotification(ev._id,'Reminder',`"${ev.event_name}" is coming up`);
      r.sent = true;
      await r.save();
    }
  }, 60*1000);

  // ─── Start ─────────────────────────────────────────────────────────────
  app.listen(PORT, ()=>console.log(`🚀  Listening on ${PORT}`));
})();