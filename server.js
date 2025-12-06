// ===== IMPORTS – sab top pe =====
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import bcrypt from 'bcrypt';
import axios from 'axios';
import admin from 'firebase-admin';
import { readFileSync } from 'fs';
import multer from 'multer';
import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';
import { Readable } from 'stream';

// ===== CONFIG / GLOBALS =====
dotenv.config();

// __dirname / __filename for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Express app
const app = express();

// Static files (HTML, JS, CSS, images)
app.use(express.static(__dirname));

// Middlewares
app.use(cors());
// Pehle tha:
// app.use(express.json());

// Ab aise karo:
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));


// Root landing
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'landing.html'));
});

// Index/dashboard route
app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});


const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);



admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: 'iimransquare.firebasestorage.app'
});

const db = admin.firestore();
console.log('✅ Firebase Admin initialized');

// ============ MULTER + GOOGLE DRIVE SETUP ============
const upload = multer({ storage: multer.memoryStorage() });

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

// Credentials ab Environment Variables se aayenge (Render ke liye safe)
const credentials = {
  type: 'service_account',
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
  private_key: process.env.GOOGLE_PRIVATE_KEY ? process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined,
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLIENT_ID,
};

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: SCOPES,
});

// Folder ID bhi ab setting se aayega
const AVATAR_FOLDER_ID = process.env.DRIVE_FOLDER_ID;

// Helper: Buffer → Readable stream
function bufferToStream(buffer) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}


// ✅ Gmail SMTP Transporter
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465, // Secure port use karenge
  secure: true, // true for 465, false for other ports
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// Test connection on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Gmail SMTP connection failed:', error);
  } else {
    console.log('✅ Gmail SMTP ready to send emails');
  }
});

const otpStore = {};

// ✅ SEND OTP - Gmail Version
app.post('/api/send-otp', async (req, res) => {
  try {
    const { email } = req.body;
    console.log('📩 /api/send-otp email =', email);

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 60 * 1000; // 60 sec
    otpStore[email] = { code, expiresAt };

    // Send email via Gmail
    try {
      await transporter.sendMail({
        from: `"IMRAN SQUARE" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: 'Your IMRAN SQUARE Login Code',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f97316;">IMRAN SQUARE Studio</h2>
            <p>Your verification code is:</p>
            <h1 style="color: #f97316; font-size: 32px; letter-spacing: 8px;">${code}</h1>
            <p style="color: #666;">This code expires in 60 seconds.</p>
            <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
          </div>
        `
      });
      
      console.log('✅ OTP email sent to:', email);
      return res.json({ success: true, message: 'OTP sent to your email' });
      
    } catch (emailError) {
      console.error('❌ Email send failed:', emailError);
      // Fallback: still save OTP and return success (for dev testing)
      console.log('📱 DEV MODE OTP:', code);
      return res.json({ success: true, message: 'OTP generated (email failed)', code });
    }

  } catch (err) {
    console.error('❌ send-otp error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});


// VERIFY OTP + Create/Update User in Firestore
app.post('/api/verify-otp', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ success: false, message: 'Email and code required' });
    }

    const record = otpStore[email];
    if (!record) {
      return res.status(400).json({ success: false, message: 'No OTP generated for this email' });
    }

    if (Date.now() > record.expiresAt) {
      delete otpStore[email];
      return res.status(400).json({ success: false, message: 'OTP expired' });
    }

    if (record.code !== code) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    // OTP correct, clear it
    delete otpStore[email];

    // Check if user exists in Firestore
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).get();

    let userData;
    let isNew = false;

    if (snapshot.empty) {
      // New user - create document
      const newUserRef = usersRef.doc();
      userData = {
        userId: newUserRef.id,
        email: email,
        role: 'user',
        subscription: 'free',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLogin: admin.firestore.FieldValue.serverTimestamp()
      };
      await newUserRef.set(userData);
      console.log(`✅ New user created: ${email}`);
      isNew = true;
    } else {
      // Existing user - update last login
      const userDoc = snapshot.docs[0];
      userData = { userId: userDoc.id, ...userDoc.data() };
      await usersRef.doc(userDoc.id).update({
        lastLogin: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`✅ Existing user logged in: ${email}`);
      isNew = false;
    }

return res.json({
  success: true,
  message: 'OTP verified',
  isNew,
  user: {
    userId: userData.userId,
    email: userData.email,
    firstName: userData.firstName || '',
    lastName: userData.lastName || '',
    username: userData.username || '',
    role: userData.role || 'user',
    subscription: userData.subscription || 'free'
  }
});

  } catch (err) {
    console.error('❌ Verify OTP error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});


// COMPLETE REGISTRATION - update profile after OTP
app.post('/api/complete-registration', async (req, res) => {
  try {
    const { email, firstName, lastName, username, role, password } = req.body;
    
    if (!email || !firstName || !lastName || !username || !password) {
      return res.status(400).json({ success: false, message: 'All fields required including password' });
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email).limit(1).get();
    
    if (snapshot.empty) {
      return res.status(404).json({ success: false, message: 'User not found for this email' });
    }

    const userDoc = snapshot.docs[0];
    const userId = userDoc.id;

    await usersRef.doc(userId).update({
      firstName,
      lastName,
      username,
      password: hashedPassword,  // ← YE LINE IMPORTANT
      role: role || 'user',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const updatedDoc = await usersRef.doc(userId).get();
    const userData = { userId, ...updatedDoc.data() };

    return res.json({
      success: true,
      message: 'Profile completed',
      user: {
        userId: userData.userId,
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        username: userData.username,
        role: userData.role,
        subscription: userData.subscription || 'free'
      }
    });
  } catch (err) {
    console.error('Complete registration error:', err);
    return res.status(500).json({ success: false, message: 'Server error while completing registration' });
  }
});

// USERNAME + PASSWORD LOGIN
app.post('/api/login-username', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Username and password required' });
    }

    const usersRef = db.collection('users');
    const snapshot = await usersRef
      .where('username', '==', username)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return res.status(400).json({ success: false, message: 'Invalid username or password' });
    }

    const userDoc = snapshot.docs[0];
    const data = userDoc.data();

    if (!data.password) {
      return res.status(400).json({
        success: false,
        message: 'This account does not have a password yet. Please login with email/OTP.'
      });
    }

    const match = await bcrypt.compare(password, data.password);
    if (!match) {
      return res.status(400).json({ success: false, message: 'Invalid username or password' });
    }

    // Update lastLogin
    await usersRef.doc(userDoc.id).update({
      lastLogin: admin.firestore.FieldValue.serverTimestamp()
    });

    const user = {
      userId: userDoc.id,
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      username: data.username,
      role: data.role || 'user',
      subscription: data.subscription || 'free'
    };

    return res.json({
      success: true,
      message: 'Login successful',
      user
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Server error while logging in' });
  }
});


// UPLOAD AVATAR → Google Drive + Firestore
app.post('/api/account/upload-avatar', upload.single('avatar'), async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'Missing userId' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const usersRef = db.collection('users');
    const userRef = usersRef.doc(userId);
    const snap = await userRef.get();

    if (!snap.exists) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Upload file to Google Drive
    const fileName = `avatar-${userId}-${Date.now()}.jpg`;

    const fileMetadata = {
      name: fileName,
      parents: [AVATAR_FOLDER_ID],
    };

    const media = {
      mimeType: req.file.mimetype || 'image/jpeg',
      body: bufferToStream(req.file.buffer),
    };

    const driveRes = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id',
    });

    const fileId = driveRes.data.id;

    // Make file public (anyone with link can view)
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // Get direct link
    const fileRes = await drive.files.get({
      fileId,
      fields: 'webContentLink, webViewLink',
    });

    const photoUrl = fileRes.data.webContentLink || fileRes.data.webViewLink || '';

    // Save URL in Firestore
    await userRef.update({
      photo: photoUrl,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updatedSnap = await userRef.get();
    const updatedUser = { userId, ...updatedSnap.data() };

    return res.json({
      success: true,
      message: 'Avatar uploaded',
      photoUrl,
      user: {
        userId: updatedUser.userId,
        email: updatedUser.email,
        firstName: updatedUser.firstName || '',
        lastName: updatedUser.lastName || '',
        username: updatedUser.username || '',
        role: updatedUser.role || 'user',
        subscription: updatedUser.subscription || 'free',
        photo: updatedUser.photo || null,
      },
    });
  } catch (err) {
    console.error('❌ Upload avatar error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// UPDATE PROFILE (name / username / photo)
app.post('/api/account/update-profile', async (req, res) => {
  try {
    const { userId, firstName, lastName, username, photo } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'Missing userId' });
    }

    const usersRef = db.collection('users');
    const userRef  = usersRef.doc(userId);
    const snap     = await userRef.get();

    if (!snap.exists) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const data = snap.data();

    // If username change requested, check uniqueness (case‑insensitive)
    if (username && username !== data.username) {
      const takenSnap = await usersRef
        .where('username', '==', username)
        .get();

      if (!takenSnap.empty) {
        return res.status(400).json({
          success: false,
          message: 'This username is already taken.'
        });
      }
    }

    const updates = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (typeof firstName === 'string') updates.firstName = firstName;
    if (typeof lastName === 'string')  updates.lastName  = lastName;
    if (typeof username === 'string')  updates.username  = username;
    if (typeof photo === 'string')     updates.photo     = photo;

    await userRef.update(updates);

    const updatedSnap = await userRef.get();
    const updatedUser = { userId, ...updatedSnap.data() };

    return res.json({
      success: true,
      message: 'Profile updated',
      user: {
        userId: updatedUser.userId,
        email: updatedUser.email,
        firstName: updatedUser.firstName || '',
        lastName: updatedUser.lastName || '',
        username: updatedUser.username || '',
        role: updatedUser.role || 'user',
        subscription: updatedUser.subscription || 'free',
        photo: updatedUser.photo || null
      }
    });
  } catch (err) {
    console.error('❌ Update profile error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});


// ============= MIDDLEWARE =============

// Check if user is authenticated (has valid userId)
const isAuthenticated = async (req, res, next) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    // Verify user exists in Firestore
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(401).json({ success: false, message: 'Invalid user' });
    }
    
    // Attach user data to request
    req.user = { userId, ...userDoc.data() };
    next();
  } catch (err) {
    console.error('❌ Auth middleware error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Check if user is admin
const isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required' });
  }
  next();
};

console.log('✅ Middleware configured');

// ============= ADMIN ROUTES =============

// Get all users (Admin only)
app.post('/api/admin/users', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = [];
    
    usersSnapshot.forEach(doc => {
      users.push({ userId: doc.id, ...doc.data() });
    });
    
    // Sort by createdAt (newest first)
    users.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return b.createdAt.toMillis() - a.createdAt.toMillis();
      }
      return 0;
    });
    
    console.log(`✅ Admin fetched ${users.length} users`);
    res.json({ success: true, users });
    
  } catch (err) {
    console.error('❌ Get users error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update user subscription (Admin only)
app.post('/api/admin/update-subscription', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { targetUserId, subscription } = req.body;
    
    if (!targetUserId || !subscription) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }
    
    if (!['free', 'paid'].includes(subscription)) {
      return res.status(400).json({ success: false, message: 'Invalid subscription type' });
    }
    
    await db.collection('users').doc(targetUserId).update({
      subscription: subscription,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`✅ Admin updated user ${targetUserId} subscription to ${subscription}`);
    res.json({ success: true, message: 'Subscription updated' });
    
  } catch (err) {
    console.error('❌ Update subscription error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Create project (Admin only)
app.post('/api/admin/create-project', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { projectName } = req.body;
    
    if (!projectName) {
      return res.status(400).json({ success: false, message: 'Project name required' });
    }
    
    const projectRef = db.collection('projects').doc();
    const projectData = {
      projectId: projectRef.id,
      name: projectName,
      createdBy: req.user.userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'active'
    };
    
    await projectRef.set(projectData);
    
    console.log(`✅ Admin created project: ${projectName}`);
    res.json({ success: true, message: 'Project created', project: projectData });
    
  } catch (err) {
    console.error('❌ Create project error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

console.log('✅ Admin routes configured');

// ============= USER ROUTES =============

// Get user profile
app.post('/api/user/profile', isAuthenticated, async (req, res) => {
  try {
    res.json({ 
      success: true, 
      user: {
        userId: req.user.userId,
        email: req.user.email,
        role: req.user.role,
        subscription: req.user.subscription
      }
    });
  } catch (err) {
    console.error('❌ Get profile error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Get all projects (All users)
app.post('/api/user/projects', isAuthenticated, async (req, res) => {
  try {
    const projectsSnapshot = await db.collection('projects')
      .where('status', '==', 'active')
      .get();
    
    const projects = [];
    projectsSnapshot.forEach(doc => {
      projects.push({ projectId: doc.id, ...doc.data() });
    });
    
    // Sort by createdAt (newest first)
    projects.sort((a, b) => {
      if (a.createdAt && b.createdAt) {
        return b.createdAt.toMillis() - a.createdAt.toMillis();
      }
      return 0;
    });
    
    console.log(`✅ User fetched ${projects.length} projects`);
    res.json({ success: true, projects });
    
  } catch (err) {
    console.error('❌ Get projects error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

console.log('✅ User routes configured');


// Main chat endpoint
app.post('/api/chat', async (req, res) => {
  const { userMessage, model } = req.body;
  
  console.log('\n🟢 === NEW REQUEST ===');
  console.log('📝 Message:', userMessage);
  console.log('🤖 Model:', model);
  console.log('⏰ Time:', new Date().toLocaleTimeString());
  
  if (!userMessage) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    let response;
    
    // ============= GEMINI MODELS =============
    if (model?.startsWith('gemini-')) {
      console.log('🔷 Using Gemini API...');
      
      const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
      if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY not found in .env file');
      }

      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

      response = await axios.post(geminiUrl, {
        contents: [{
          parts: [{ text: userMessage }]
        }]
      });

      console.log('✅ Gemini Response received');
      return res.json(response.data);
    }
    
    // ============= PERPLEXITY =============
    else if (model === 'perplexity-online') {
      console.log('🟣 Using Perplexity API...');
      
      const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
      if (!PERPLEXITY_API_KEY) {
        throw new Error('PERPLEXITY_API_KEY not found in .env file');
      }

      response = await axios.post(
        'https://api.perplexity.ai/chat/completions',
        {
          model: 'sonar',
          messages: [{ 
            role: 'user', 
            content: userMessage 
          }]
        },
        {
          headers: {
            'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Perplexity Response received');
      return res.json(response.data);
    }
    // ============= GROQ MODELS =============
    else if (model?.startsWith('groq-')) {
      console.log('⚡ Using Groq API...');
      
      const GROQ_API_KEY = process.env.GROQ_API_KEY;
      if (!GROQ_API_KEY) {
        throw new Error('GROQ_API_KEY not found in .env file');
      }

      const groqModels = {
        'groq-llama-8b': 'llama-3.1-8b-instant'
      };

      const groqModel = groqModels[model] || 'llama-3.1-8b-instant';

      response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          model: groqModel,
          messages: [{ 
            role: 'user', 
            content: userMessage 
          }],
          temperature: 0.7,
          max_tokens: 1024
        },
        {
          headers: {
            'Authorization': `Bearer ${GROQ_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Groq Response received');
      return res.json(response.data);
    }

    // ============= SERPER SEARCH =============
    else if (model === 'serper-search') {
      console.log('🔍 Using Serper Google Search...');
      
      const SERPER_API_KEY = process.env.SERPER_API_KEY;
      if (!SERPER_API_KEY) {
        throw new Error('SERPER_API_KEY not found in .env file');
      }

      response = await axios.post(
        'https://google.serper.dev/search',
        {
          q: userMessage,
          num: 5
        },
        {
          headers: {
            'X-API-KEY': SERPER_API_KEY,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('✅ Serper Search completed');
      
      const results = response.data.organic || [];
      const formattedResults = results.map((r, i) => 
        `${i+1}. **${r.title}**\n${r.snippet}\n[${r.link}](${r.link})`
      ).join('\n\n');

      return res.json({
        candidates: [{
          content: {
            parts: [{
              text: `🔍 **Google Search Results:**\n\n${formattedResults}`
            }]
          }
        }]
      });
    }
    
    // ============= DEFAULT FALLBACK =============
    else {
      console.log('⚠️ Unknown model, using Gemini 2.0 Flash as fallback');
      const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`;

      response = await axios.post(geminiUrl, {
        contents: [{
          parts: [{ text: userMessage }]
        }]
      });

      return res.json(response.data);
    }

  } catch (error) {
    console.error('\n❌ === ERROR ===');
    console.error('Message:', error.message);
    console.error('Response:', error.response?.data);
    
    res.status(500).json({
      error: 'API Error',
      message: error.message,
      details: error.response?.data || 'No additional details'
    });
  }
});

// ===== FOOTAGE METADATA API =====
app.post('/api/footage/create', async (req, res) => {
  try {
const { projectId, userId, fileName, fileSize, duration, title, thumbnail, format } = req.body;

const footageData = {
  projectId,
  userId,
  fileName,
  fileSize: fileSize || 0,
  duration: duration || '00:00',
  title: title || fileName,
  // thumbnailDataUrl: thumbnail || '',   // ❌ is line ko comment/remove karo
  format: format || 'long',
  status: 'queued',
  kind: 'raw',
  rawDriveLink: '',
  editedDriveLink: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
};

// List footage for a project
app.get('/api/footage/list', async (req, res) => {
  try {
    const { projectId } = req.query;

    let q = db.collection('footage');
    if (projectId) {
      q = q.where('projectId', '==', projectId);
    }

    const snap = await q.get();
    const items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    // Sort in JS to avoid Firestore index error
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ items });
  } catch (err) {
    console.error('Footage list error:', err);
    res.status(500).json({ error: 'Failed to load footage' });
  }
});




    const docRef = await db.collection('footage').add(footageData);

    res.json({ success: true, footageId: docRef.id });
  } catch (err) {
    console.error('Footage create error:', err);
    res.status(500).json({ error: 'Failed to create footage doc' });
  }
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`\n🚀 Multi-AI API Proxy running at http://localhost:${PORT}`);
  console.log('📡 Endpoints:');
  console.log('   GET  /              - Health check');
  console.log('   POST /api/send-otp  - Send OTP');
  console.log('   POST /api/verify-otp- Verify OTP');
  console.log('   POST /api/chat      - Chat endpoint');
  console.log('\n✅ Ready to receive requests!\n');
});

// ============ FOOTAGE QUEUE ENDPOINT ============
app.post('/api/footage/create-queue', async (req, res) => {
  try {
    const { projectId, userId, fileName, sizeMB, thumbnailDataUrl, kind } = req.body;

    if (!projectId || !userId || !fileName) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const footageRef = db.collection('footage').doc();
    const footageId = footageRef.id;

    const newFootage = {
      footageId,
      projectId,
      userId,
      kind: kind || 'raw',
      fileName,
      sizeMB: sizeMB || 0,
      thumbnailDataUrl: thumbnailDataUrl || '',
      status: 'queued',
      driveLink: '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await footageRef.set(newFootage);

    return res.json({
      success: true,
      message: 'Footage queued successfully',
      footage: { ...newFootage, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    });
  } catch (err) {
    console.error('❌ Create footage queue error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});
