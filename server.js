// javascript
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = 3000;
const MEME_DIR = path.join(__dirname, 'public', 'meme');
const REGISTRY_FILE = path.join(__dirname, 'registry.json');

if (!fs.existsSync(MEME_DIR)) fs.mkdirSync(MEME_DIR, { recursive: true });
if (!fs.existsSync(REGISTRY_FILE)) fs.writeFileSync(REGISTRY_FILE, '[]');

app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(express.json());

// Offensive words filter
const forbidden = ["fuck", "shit", "bitch", "asshole", "merde", "con", "pute"];

function isValidUsername(name) {
    if (!name) return false;
    const lower = name.toLowerCase();
    return !forbidden.some(word => lower.includes(word));
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, MEME_DIR),
    filename: (req, file, cb) => cb(null, randomUUID() + path.extname(file.originalname))
});
const upload = multer({ storage });

// API: login (set username cookie)
app.post('/api/login', (req, res) => {
    const { username } = req.body;
    if (!isValidUsername(username)) {
        return res.status(400).json({ error: 'Invalid username' });
    }
    res.cookie('username', username, { httpOnly: false });
    res.json({ success: true });
});

// javascript
// Replace existing /api/upload route with this (accept multiple files)
app.post('/api/upload', upload.array('media', 12), (req, res) => {
    const username = req.cookies.username;
    if (!isValidUsername(username)) {
        return res.status(400).json({ error: 'Invalid or missing username' });
    }
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
    }

    const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE));
    const now = Date.now();
    req.files.forEach(file => {
        const uuid = path.basename(file.filename, path.extname(file.filename));
        registry.push({ uuid, username, time: now });
    });
    fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2));
    res.json({ success: true });
});


// API: list memes (last 7 days)
app.get('/api/memes', (req, res) => {
    const registry = JSON.parse(fs.readFileSync(REGISTRY_FILE));
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const recent = registry.filter(m => Date.now() - m.time < oneWeek);
    recent.sort((a, b) => b.time - a.time);
    res.json(recent);
});

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
