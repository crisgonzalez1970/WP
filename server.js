const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');
const path = require('path');
const { google } = require('googleapis');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, 'data', 'app.db');
if (!fs.existsSync(path.join(__dirname, 'data'))) fs.mkdirSync(path.join(__dirname, 'data'));
const db = new sqlite3.Database(DB_PATH);

// initialize DB
db.serialize(() => {
  db.run(
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT
    )`
  );

  // insert default admin user if not exists
  db.get('SELECT id FROM users WHERE username = ?', ['admin'], (err, row) => {
    if (err) return console.error(err);
    if (!row) {
      const hash = bcrypt.hashSync('admin', 10);
      db.run('INSERT INTO users (username, password) VALUES (?, ?)', ['admin', hash]);
      console.log('Created default user: admin / admin');
    }
  });
});

const app = express();
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
  })
);

app.use(express.static(path.join(__dirname, 'public')));

function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  res.status(401).json({ error: 'Unauthorized' });
}

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });
  db.get('SELECT id, password FROM users WHERE username = ?', [username], (err, row) => {
    if (err) return res.status(500).json({ error: 'DB error' });
    if (!row) return res.status(401).json({ error: 'Invalid user or password' });
    const ok = bcrypt.compareSync(password, row.password);
    if (!ok) return res.status(401).json({ error: 'Invalid user or password' });
    req.session.userId = row.id;
    req.session.username = username;
    res.json({ success: true });
  });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

app.get('/api/profile', requireAuth, (req, res) => {
  res.json({ username: req.session.username });
});

// Accept drive config (account name + key JSON) and folderId; store in session for demo
app.post('/api/drive-config', requireAuth, (req, res) => {
  const { accountName, keyJson, folderId } = req.body;
  if (!accountName || !keyJson || !folderId)
    return res.status(400).json({ error: 'accountName, keyJson and folderId are required' });
  // store in session (not persisted)
  req.session.driveConfig = { accountName, keyJson, folderId };
  res.json({ success: true });
});

app.get('/api/drive-files', requireAuth, async (req, res) => {
  const cfg = req.session.driveConfig;
  if (!cfg) return res.status(400).json({ error: 'Drive config not set' });
  try {
    let key;
    try {
      key = JSON.parse(cfg.keyJson);
    } catch (e) {
      return res.status(400).json({ error: 'keyJson must be valid JSON' });
    }

    // Use service account JWT
    const jwtClient = new google.auth.JWT({
      email: key.client_email,
      key: key.private_key,
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    });

    const drive = google.drive({ version: 'v3', auth: jwtClient });

    // list files in folder
    const q = `'${cfg.folderId}' in parents and trashed = false`;
    const resp = await drive.files.list({ q, fields: 'files(id,name,mimeType,webViewLink)' });
    res.json({ files: resp.data.files || [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Drive error', details: String(err) });
  }
});

// Fallback route
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
