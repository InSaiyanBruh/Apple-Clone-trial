const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const https = require('https');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

mongoose.connect(process.env.MONGO_URL || 'mongodb://localhost:27017/iPhone');

const UserSchema = new mongoose.Schema({
    username: String,
    email: { type: String, unique: true },
    password: String,
    googleId: String,
    displayName: String,
    avatar: String,
});
const User = mongoose.model('User', UserSchema);

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '289829610487-ntn4hdteq3om8aio1mh4ip00k7t7t51p.apps.googleusercontent.com';
const JWT_SECRET = process.env.JWT_SECRET || 'mySecretKey';

function verifyGoogleIdToken(idToken) {
    return new Promise((resolve, reject) => {
        const url = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`;
        https.get(url, (resp) => {
            let data = '';
            resp.on('data', chunk => data += chunk);
            resp.on('end', () => {
                try {
                    const info = JSON.parse(data);
                    if (info.error) return reject(new Error(info.error_description));
                    if (info.aud !== GOOGLE_CLIENT_ID) return reject(new Error('Invalid audience'));
                    resolve(info);
                } catch (e) { reject(e); }
            });
        }).on('error', reject);
    });
}

app.post('/auth/google', async (req, res) => {
    try {
        const { id_token } = req.body;
        const payload = await verifyGoogleIdToken(id_token);
        let user = await User.findOne({ email: payload.email });
        if (!user) {
            const base = payload.name || payload.email.split('@')[0];
            let username = base.replace(/\s+/g, '').toLowerCase();
            let suffix = 0;
            while (await User.findOne({ username: suffix ? `${username}${suffix}` : username })) suffix++;
            username = suffix ? `${username}${suffix}` : username;
            user = new User({ username, email: payload.email, googleId: payload.sub, displayName: payload.name, avatar: payload.picture });
        } else {
            user.googleId = payload.sub;
            user.avatar = payload.picture;
            user.displayName = payload.name;
        }
        await user.save();
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ ok: true, token });
    } catch (err) {
        res.status(400).json({ ok: false, message: 'Auth failed' });
    }
});

app.post('/signup', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (await User.findOne({ email })) return res.json({ ok: false, message: 'User exists' });
        const hashed = await bcrypt.hash(password, 10);
        const user = new User({ username, email, password: hashed });
        await user.save();
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ ok: true, token });
    } catch { res.status(500).json({ ok: false, message: 'Signup failed' }); }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) return res.json({ ok: false, message: 'Invalid credentials' });
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '30d' });
        res.json({ ok: true, token });
    } catch { res.status(500).json({ ok: false, message: 'Login failed' }); }
});

app.post('/contact', (req, res) => {
    // Simulate saving or emailing contact form
    console.log('Contact form:', req.body);
    res.json({ message: 'Message received' });
});

app.post('/order', (req, res) => {
    // Simulate order processing
    console.log('Order:', req.body);
    res.json({ message: 'Order placed' });
});

app.listen(3000, () => console.log('Backend on 3000'));