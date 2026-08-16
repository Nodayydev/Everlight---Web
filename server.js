import 'dotenv/config';
import express from 'express';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const required = ['JWT_SECRET'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) throw new Error(`Hiányzó környezeti változó: ${missing.join(', ')}`);

const dbFile = 'everlight.db';
const db = new sqlite3.Database(dbFile);

const app = express();
const root = path.dirname(fileURLToPath(import.meta.url));
app.use(express.json({ limit: '2mb' }));
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.static(root));

const safeUser = (user) => ({ id: user.id, username: user.username, displayName: user.display_name || user.username.split('#')[0], bio: user.bio || '', avatar: user.avatar || '', cover: user.cover || '', nameColor: user.name_color || '#67e7dd', profileColor: user.profile_color || '#273638', status: user.status || '✦ Elérhető', pronouns: user.pronouns || '', location: user.location || '', website: user.website || '' });
const tokenFor = (user) => jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });
function auth(req, res, next) { try { req.userId = jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), process.env.JWT_SECRET).id; next(); } catch { res.status(401).json({ error: 'Jelentkezz be újra.' }); } }
function validUsername(value) { return /^[\p{L}\p{N}_.-]{3,24}#[0-9]{4}$/u.test(value); }
function clean(value, max) { return String(value || '').trim().slice(0, max); }

function dbRun(sql, params = []) { return new Promise((resolve, reject) => { db.run(sql, params, function(err) { if (err) reject(err); else resolve(this); }); }); }
function dbGet(sql, params = []) { return new Promise((resolve, reject) => { db.get(sql, params, (err, row) => { if (err) reject(err); else resolve(row); }); }); }
function dbAll(sql, params = []) { return new Promise((resolve, reject) => { db.all(sql, params, (err, rows) => { if (err) reject(err); else resolve(rows); }); }); }

async function createSchema() {
  try {
    await dbRun(`CREATE TABLE IF NOT EXISTS everlight_users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, email TEXT, password_hash TEXT NOT NULL, display_name TEXT, bio TEXT, avatar TEXT, cover TEXT, name_color TEXT, profile_color TEXT, status TEXT, pronouns TEXT, location TEXT, website TEXT, last_seen DATETIME DEFAULT CURRENT_TIMESTAMP, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
    await dbRun(`CREATE TABLE IF NOT EXISTS everlight_posts (id INTEGER PRIMARY KEY AUTOINCREMENT, author_id INTEGER NOT NULL, body TEXT DEFAULT '', category TEXT DEFAULT 'Gondolat', image TEXT, is_anonymous INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (author_id) REFERENCES everlight_users(id) ON DELETE CASCADE)`);
    await dbRun(`CREATE TABLE IF NOT EXISTS everlight_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, sender_id INTEGER NOT NULL, recipient_id INTEGER NOT NULL, body TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (sender_id) REFERENCES everlight_users(id) ON DELETE CASCADE, FOREIGN KEY (recipient_id) REFERENCES everlight_users(id) ON DELETE CASCADE)`);
  } catch (err) { console.error('Schema hiba:', err); }
}

async function touch(id) { await dbRun('UPDATE everlight_users SET last_seen = CURRENT_TIMESTAMP WHERE id = ?', [id]); }

app.post('/api/auth/enter', async (req, res, next) => { try {
  const username = clean(req.body.username, 30).toLowerCase(); const password = String(req.body.password || ''); const email = clean(req.body.email, 254) || null;
  if (!validUsername(username)) return res.status(400).json({ error: 'A név formátuma: nev#1234.' });
  if (password.length < 6) return res.status(400).json({ error: 'A jelszó legalább 6 karakter legyen.' });
  let user = await dbGet('SELECT * FROM everlight_users WHERE username = ?', [username]);
  if (!user) { const hash = await bcrypt.hash(password, 12); const result = await dbRun('INSERT INTO everlight_users (username, email, password_hash, display_name) VALUES (?, ?, ?, ?)', [username, email, hash, username.split('#')[0]]); user = await dbGet('SELECT * FROM everlight_users WHERE id = ?', [result.lastID]); }
  else if (!await bcrypt.compare(password, user.password_hash)) return res.status(401).json({ error: 'Hibás jelszó.' });
  await touch(user.id); res.json({ token: tokenFor(user), user: safeUser(user) });
} catch (error) { next(error); } });

app.get('/api/auth/me', auth, async (req, res, next) => { try { const user = await dbGet('SELECT * FROM everlight_users WHERE id = ?', [req.userId]); if (!user) return res.status(401).json({ error: 'A fiók nem található.' }); await touch(req.userId); res.json({ user: safeUser(user) }); } catch (error) { next(error); } });

app.put('/api/profile', auth, async (req, res, next) => { try { const p = req.body; const image = (value, max = 1500000) => typeof value === 'string' && value.length <= max ? value : ''; await dbRun('UPDATE everlight_users SET display_name=?, bio=?, avatar=?, cover=?, name_color=?, profile_color=?, status=?, pronouns=?, location=?, website=?, last_seen=CURRENT_TIMESTAMP WHERE id=?', [clean(p.displayName, 30), clean(p.bio, 160), image(p.avatar), image(p.cover), /^#[0-9a-f]{6}$/i.test(p.nameColor) ? p.nameColor : '#67e7dd', /^#[0-9a-f]{6}$/i.test(p.profileColor) ? p.profileColor : '#273638', clean(p.status, 40), clean(p.pronouns, 30), clean(p.location, 50), clean(p.website, 100), req.userId]); const user = await dbGet('SELECT * FROM everlight_users WHERE id = ?', [req.userId]); res.json({ user: safeUser(user) }); } catch (error) { next(error); } });

app.get('/api/posts', async (req, res, next) => { try { const rows = await dbAll(`SELECT p.*, u.username, u.display_name, u.avatar, u.name_color FROM everlight_posts p JOIN everlight_users u ON u.id=p.author_id ORDER BY p.created_at DESC LIMIT 100`); res.json({ posts: rows || [] }); } catch (error) { next(error); } });

app.post('/api/posts', auth, async (req, res, next) => { try { const body = clean(req.body.body, 280); const image = typeof req.body.image === 'string' && req.body.image.length <= 1500000 ? req.body.image : null; if (!body && !image) return res.status(400).json({ error: 'Írj valamit vagy adj hozzá képet.' }); if (/(https?:\/\/\S+.*){3,}|(.)\2{10,}/i.test(body)) return res.status(400).json({ error: 'A spam-szűrő megállította a bejegyzést.' }); const category = ['Gondolat', 'Történet', 'Idézet', 'Élet', 'Alkotás'].includes(req.body.category) ? req.body.category : 'Gondolat'; const result = await dbRun('INSERT INTO everlight_posts (author_id, body, category, image, is_anonymous) VALUES (?, ?, ?, ?, ?)', [req.userId, body, category, image, req.body.anonymous ? 1 : 0]); await touch(req.userId); const post = await dbGet(`SELECT p.*,u.username,u.display_name,u.avatar,u.name_color FROM everlight_posts p JOIN everlight_users u ON u.id=p.author_id WHERE p.id=?`, [result.lastID]); res.status(201).json({ post }); } catch (error) { next(error); } });

app.get('/api/online', async (req, res, next) => { try { const users = await dbAll(`SELECT id, username, display_name, avatar, name_color FROM everlight_users WHERE last_seen > datetime('now', '-5 minutes') ORDER BY last_seen DESC LIMIT 12`); res.json({ users: users || [] }); } catch (error) { next(error); } });

app.get('/api/messages/:username', auth, async (req, res, next) => { try { const other = await dbGet('SELECT id, username, display_name, avatar FROM everlight_users WHERE username=?', [clean(req.params.username, 30).toLowerCase()]); if (!other) return res.status(404).json({ error: 'Ez a felhasználó nem található.' }); const messages = await dbAll(`SELECT m.*, s.username sender_username, s.display_name sender_name FROM everlight_messages m JOIN everlight_users s ON s.id=m.sender_id WHERE (m.sender_id=? AND m.recipient_id=?) OR (m.sender_id=? AND m.recipient_id=?) ORDER BY m.created_at ASC LIMIT 100`, [req.userId, other.id, other.id, req.userId]); res.json({ user: safeUser(other), messages: messages || [] }); } catch (error) { next(error); } });

app.post('/api/messages/:username', auth, async (req, res, next) => { try { const body = clean(req.body.body, 1000); if (!body) return res.status(400).json({ error: 'Az üzenet üres.' }); const other = await dbGet('SELECT id FROM everlight_users WHERE username=?', [clean(req.params.username, 30).toLowerCase()]); if (!other) return res.status(404).json({ error: 'A címzett nem található.' }); if (other.id === req.userId) return res.status(400).json({ error: 'Magadnak nem küldhetsz üzenetet.' }); const result = await dbRun('INSERT INTO everlight_messages (sender_id, recipient_id, body) VALUES (?, ?, ?)', [req.userId, other.id, body]); await touch(req.userId); res.status(201).json({ id: result.lastID }); } catch (error) { next(error); } });

app.use((error, req, res, next) => { console.error(error); res.status(500).json({ error: 'Szerverhiba. Nézd meg a szerver konzolt.' }); });

(async () => {
  await createSchema();
  app.listen(Number(process.env.PORT || 5470), () => console.log(`Everlight fut a ${process.env.PORT || 5470} porton.`));
})();
