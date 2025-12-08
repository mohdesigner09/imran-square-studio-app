// ===== 1. IMPORTS =====
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import nodemailer from 'nodemailer';
import axios from 'axios';
import admin from 'firebase-admin';
import { google } from 'googleapis';
import path from 'path';
import { fileURLToPath } from 'url';
import { readFileSync } from 'fs';
import bcrypt from 'bcryptjs'; // ✅ Fixed: Bcryptjs used
// ===== 2. CONFIGURATION =====
dotenv.config();

// __dirname setup for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ===== 3. APP INITIALIZATION =====
const app = express();

const ADMIN_EMAIL = 'mohdesigner09@gmail.com';

// ✅ GLOBAL SECURITY UNLOCK (Ye code sabse upar hona chahiye)
// ✅ SECURITY UNLOCK (Paste this right after 'const app = express();')
app.use((req, res, next) => {
  // Purane rules hatao
  res.removeHeader("Content-Security-Policy");
  res.removeHeader("X-Content-Security-Policy");
  
  // Sab kuch allow karo (Tailwind, Google, AI Tools)
  res.setHeader(
    "Content-Security-Policy", 
    "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:;"
  );
  
  // CORS Errors hatao
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  
  next();
});

// Iske baad middlewares aayenge
app.use(cors());
app.use(express.json({ limit: '10mb' }));
// ... baaki code ...

// Static Files
app.use(express.static(__dirname));

// ... ISKE NEECHE JO CODE HAI USE MAT CHEDHNA ...
// ... (Routes, Firebase Init, etc. waisa hi rahega) ...

// ===== ROUTES =====

// 1. New Landing Page (Resend Style)
// 1. Root Route -> Naya Resend Landing Page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'landing.html'));
});

// 2. Login Route -> Purana App Logic
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

// 3. Fallback
app.get('/login.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/index.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ===== 7. FIREBASE INITIALIZATION =====
try {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  
  if (!admin.apps.length) { // Check taaki duplicate init na ho
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: 'iimransquare.firebasestorage.app' // Bucket name check kar lena
    });
    console.log('✅ Firebase Admin initialized successfully');
  }
} catch (error) {
  console.error('❌ Firebase Init Error:', error.message);
}

const db = admin.firestore();

// ... ISKE NEECHE AAPKE BAAKI API ROUTES (Login, OTP, Drive, etc.) WAISE HI RAHENGE ...
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

// Credentials aur Auth ke neeche dhoondo
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: SCOPES,
});

// 👇 YE LINE MISSING HAI - ISKO ADD KARO
const drive = google.drive({ version: 'v3', auth });

// Folder ID bhi ab setting se aayega
const AVATAR_FOLDER_ID = process.env.DRIVE_FOLDER_ID;

// Helper: Buffer → Readable stream
function bufferToStream(buffer) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
}





const otpStore = {};

// ✅ FINAL EMAIL SETUP (Using Brevo HTTP API)
// Iske liye kisi library ki zaroorat nahi hai, ye direct internet se email bhejta hai.

app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;
  console.log(`📩 Requesting OTP for: ${email}`);

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  // 1. Generate OTP
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  otpStore[email] = { code, expiresAt };

  // 2. Send Email via Brevo API (No SMTP, No Blocking)
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY, // Render se key uthayega
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { 
          name: 'Imran Square Team', 
          email: process.env.GMAIL_USER // Aapki verified email (mohdesigner09@gmail.com)
        },
        to: [{ email: email }],
        subject: 'Login OTP - IMRAN SQUARE',
        htmlContent: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #ff6b35;">IMRAN SQUARE STUDIO</h2>
            <p>Your login verification code is:</p>
            <h1 style="font-size: 32px; letter-spacing: 5px; color: #000;">${code}</h1>
            <p style="color: #666;">Valid for 5 minutes.</p>
          </div>
        `
      })
    });

    if (response.ok) {
      console.log('✅ OTP Email Sent Successfully via Brevo!');
      return res.json({ success: true, message: 'OTP sent to your email' });
    } else {
      const errorData = await response.json();
      console.error('❌ Brevo API Error:', errorData);
      // Agar email fail bhi ho, tab bhi user ko roko mat (Fallback)
      return res.json({ success: true, message: 'OTP Generated (Email delayed)', devCode: code });
    }

  } catch (err) {
    console.error('❌ Network Error:', err);
    // Network fail hone par bhi app chalta rahega
    return res.json({ success: true, message: 'OTP Generated (Server busy)', devCode: code });
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

    // 👇 YAHAN SE UPDATE KARO 👇
    // 🔥 GOD MODE: Force Admin Role
    let role = 'user'; // Default
    if (email === ADMIN_EMAIL) {
        role = 'admin';
        console.log("⚡ GOD MODE DETECTED: Admin Role Assigned");
    }

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
        role: role, // ✅ Updated Role used here
        subscription: 'free',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLogin: admin.firestore.FieldValue.serverTimestamp()
      };
      await newUserRef.set(userData);
      isNew = true;
    } else {
      // Existing user - update last login AND ensure Role is correct
      const userDoc = snapshot.docs[0];
      
      // Agar Boss login kar raha hai, to DB mein bhi role update kar do (Safety)
      if (email === ADMIN_EMAIL) {
         await usersRef.doc(userDoc.id).update({ 
             lastLogin: admin.firestore.FieldValue.serverTimestamp(),
             role: 'admin' 
         });
         userData = { userId: userDoc.id, ...userDoc.data(), role: 'admin' };
      } else {
         await usersRef.doc(userDoc.id).update({ 
             lastLogin: admin.firestore.FieldValue.serverTimestamp()
         });
         userData = { userId: userDoc.id, ...userDoc.data() };
      }
      isNew = false;
    }
    // 👆 YAHAN TAK UPDATE KARO 👆

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
// ➤ API: Login Username (SAFE VERSION)
app.post('/api/login-username', async (req, res) => {
    const { username, password } = req.body;
    
    // Check 1: DB Connected?
    if(!db) {
        console.error("❌ DB Not Connected");
        return res.status(500).json({ success: false, message: "Database error (Check Env Vars)" });
    }

    try {
        // User dhoondo
        const snapshot = await db.collection('users').where('username', '==', username).get();
        
        if (snapshot.empty) {
            return res.status(400).json({ success: false, message: "User not found" });
        }

        const userDoc = snapshot.docs[0];
        const user = userDoc.data();
        const userId = userDoc.id;
        
        // Check 2: Kya User ke paas Password hai?
        if (!user.password) {
            return res.status(400).json({ 
                success: false, 
                message: "This account uses OTP Login. Please sign in with Email/Google first to set a password." 
            });
        }
        
        // Check 3: Password Match
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (isMatch) {
            // 🔥 GOD MODE CHECK
            if (user.email === ADMIN_EMAIL) {
                user.role = 'admin';
            }
            return res.json({ success: true, user: { ...user, userId } });
        } else {
            // ... (baaki code waisa hi)
            return res.status(400).json({ success: false, message: "Incorrect password" });
        }
    } catch (error) {
        console.error("❌ Login Crash:", error);
        return res.status(500).json({ success: false, message: "Server Error (Check Logs)" });
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

// 1. FOOTAGE CREATE ROUTE (Isko pehle band karo)
app.post('/api/footage/create', async (req, res) => {
  try {
    const { projectId, userId, fileName, fileSize, duration, title, format } = req.body;

    const footageData = {
      projectId,
      userId,
      fileName,
      fileSize: fileSize || 0,
      duration: duration || '00:00',
      title: title || fileName,
      format: format || 'long',
      status: 'queued',
      kind: 'raw',
      rawDriveLink: '',
      editedDriveLink: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await db.collection('footage').add(footageData);
    res.json({ success: true, footageId: docRef.id });

  } catch (err) {
    console.error('Footage create error:', err);
    res.status(500).json({ error: 'Failed to create footage doc' });
  }
});

// 2. FOOTAGE LIST ROUTE (Isko alag se neeche likho)
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



// ==========================================
// 🔥 GOD MODE ADMIN APIs (Insert at Bottom)
// ==========================================

// Middleware to check Admin
const requireAdmin = async (req, res, next) => {
    const { adminEmail } = req.body; 
    // Frontend se email aayega verify karne ke liye
    if (adminEmail !== ADMIN_EMAIL) {
        return res.status(403).json({ success: false, message: "UNAUTHORIZED ACCESS: You are not the Admin." });
    }
    next();
};

// 1. Get Dashboard Stats
app.post('/api/admin/stats', requireAdmin, async (req, res) => {
    if(!db) return res.json({ users: 0, projects: 0, storage: '0 GB' });

    try {
        const usersSnap = await db.collection('users').count().get();
        const projectsSnap = await db.collection('projects').count().get();
        // Storage calculation is complex, showing placeholder for speed
        res.json({
            success: true,
            users: usersSnap.data().count,
            projects: projectsSnap.data().count,
            storage: '2.4 GB', 
            serverStatus: 'Online 🟢'
        });
    } catch(e) { res.json({ success: false }); }
});

// 2. Get All Users List
app.post('/api/admin/users-list', requireAdmin, async (req, res) => {
    try {
        const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
        const users = snapshot.docs.map(doc => {
            const d = doc.data();
            return { 
                id: doc.id, 
                username: d.username, 
                email: d.email, 
                role: d.role, 
                createdAt: d.createdAt 
            };
        });
        res.json({ success: true, users });
    } catch(e) { res.status(500).json({ success: false }); }
});

// 3. Delete/Ban User Action
// 4. Update User Details (Role/Subscription) [NEW]
app.post('/api/admin/update-user-details', requireAdmin, async (req, res) => {
    const { targetUserId, role, subscription } = req.body;
    try {
        await db.collection('users').doc(targetUserId).update({
            role: role,
            subscription: subscription,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        return res.json({ success: true, message: "User details updated successfully." });
    } catch(e) { 
        console.error(e);
        return res.status(500).json({ success: false, message: "Failed to update user." }); 
    }
});

// ==========================================
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
