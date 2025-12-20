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
import { Readable } from 'stream';

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

// ======================================================
// ✅ FINAL DRIVE OAUTH2 SETUP (Matched with your Keys)
// ======================================================

// 1. OAuth Client Init (Tumhare naye variable names ke saath)
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_OAUTH_CLIENT_ID,     // Tumne ye naam rakha hai
  process.env.GOOGLE_OAUTH_CLIENT_SECRET, // Tumne ye naam rakha hai
  "https://developers.google.com/oauthplayground"
);

// 2. Refresh Token Check & Set
const REFRESH_TOKEN = process.env.GOOGLE_DRIVE_REFRESH_TOKEN;

if (!REFRESH_TOKEN) {
  console.error("❌ ERROR: 'GOOGLE_DRIVE_REFRESH_TOKEN' nahi mila! Render Check karo.");
} else {
  console.log("✅ Drive Access Connected!");
}

// Token jodd do taaki server login rahe
oauth2Client.setCredentials({
  refresh_token: REFRESH_TOKEN
});

// 3. Drive Object Create karo
const drive = google.drive({ version: 'v3', auth: oauth2Client });


// 3. HELPER FUNCTIONS (Folder Logic)
async function findOrCreateFolder(folderName, parentId) {
  try {
    const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${parentId}' in parents and trashed=false`;
    const response = await drive.files.list({
      q: query, fields: 'files(id, name)', spaces: 'drive',
    });

    if (response.data.files.length > 0) return response.data.files[0].id;
    
    const file = await drive.files.create({
      resource: { name: folderName, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
      fields: 'id',
    });
    return file.data.id;
  } catch (error) {
    console.error('Folder Error:', error);
    throw error;
  }
}

async function setFilePublic(fileId) {
  try {
    await drive.permissions.create({
      fileId: fileId,
      requestBody: { role: 'reader', type: 'anyone' },
    });
  } catch (error) { console.error('Permission Error:', error); }
}

// ============ MULTER + GOOGLE DRIVE SETUP ============
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    // sirf file size limit rakhenge, fields par koi limit nahi
    fileSize: 800 * 1024 * 1024, // 800 MB tak allowed
  },
});



// (optional) scope reference – docs ke liye
const DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive.file'];






// Folder IDs (Avatar + Footage) – sab ko same vault par point kara sakte ho
const AVATAR_FOLDER_ID =
  process.env.DRIVE_FOLDER_ID ||
  process.env.GOOGLE_DRIVE_FOLDER_ID ||
  DRIVE_FOLDER_ID

const FOOTAGE_FOLDER_ID =
  process.env.FOOTAGE_FOLDER_ID ||
  process.env.DRIVE_FOOTAGE_FOLDER_ID ||
  process.env.GOOGLE_DRIVE_FOLDER_ID ||
  process.env.DRIVE_FOLDER_ID ||
  DRIVE_FOLDER_ID








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


// 🚀 DIRECT RESUMABLE UPLOAD (High-Speed Logic)
app.post('/api/drive/init-upload', async (req, res) => {
  try {
    const { userName, projectName, fileName, fileType } = req.body;
    
    // 1. Hierarchy Check/Create
    const ROOT_ID = process.env.DRIVE_FOLDER_ID;
    const userId = await findOrCreateFolder(userName, ROOT_ID);
    const projectsFolderId = await findOrCreateFolder("Projects", userId);
    const projectSpecificId = await findOrCreateFolder(projectName, projectsFolderId);
    const targetFolder = await findOrCreateFolder("Raw Footage", projectSpecificId);

    // 2. Placeholder File banao (Gets ID instantly)
    const placeholder = await drive.files.create({
      resource: { name: fileName, parents: [targetFolder], mimeType: fileType },
      fields: 'id, webViewLink',
    });

    const fileId = placeholder.data.id;
    const viewLink = placeholder.data.webViewLink;

    // 3. Public Permission set karo
    await setFilePublic(fileId);

    // 4. Google se Resumable Upload Link maango
    const tokenResponse = await oauth2Client.getAccessToken();
    const uploadRes = await axios.post(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=resumable`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${tokenResponse.token}`,
          'X-Upload-Content-Type': fileType,
          'Content-Type': 'application/json; charset=UTF-8'
        }
      }
    );

    // 5. Success! Sab kuch Client ko bhej do
    res.json({ 
      success: true, 
      uploadUrl: uploadRes.headers.location, 
      fileId: fileId,
      viewLink: viewLink 
    });

  } catch (error) {
    console.error('❌ Init Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});
// ========================
// RAW FOOTAGE UPLOAD → GOOGLE DRIVE + FIRESTORE
// ========================
app.post('/api/footage/upload', upload.single('file'), async (req, res) => {
  try {
    const { projectId, userId, fileName, sizeMB, thumbnailDataUrl, kind } = req.body;

    if (!FOOTAGE_FOLDER_ID) {
      console.error('❌ FOOTAGE_FOLDER_ID not configured in env');
      return res.status(500).json({
        success: false,
        message: 'Footage Drive folder not configured on server'
      });
    }

    if (!projectId || !userId) {
      return res.status(400).json({
        success: false,
        message: 'Missing projectId or userId'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No video file uploaded'
      });
    }

    // ✅ File name safe bana lo
    const safeFileName =
      fileName ||
      req.file.originalname ||
      `footage-${Date.now()}.mp4`;

    // ✅ Google Drive pe upload
    const fileMetadata = {
      name: safeFileName,
      parents: [FOOTAGE_FOLDER_ID],
    };

    const media = {
      mimeType: req.file.mimetype || 'video/mp4',
      body: bufferToStream(req.file.buffer),
    };

    const driveRes = await drive.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id',
    });

    const fileId = driveRes.data.id;

    // ✅ Public permission (anyone with link can view)
    await drive.permissions.create({
      fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // ✅ Download/View link le lo
    const driveFile = await drive.files.get({
      fileId,
      fields: 'webContentLink, webViewLink',
    });

    const rawDriveLink =
      driveFile.data.webContentLink ||
      driveFile.data.webViewLink ||
      '';

    // ✅ Firestore me metadata doc banao (footage collection)
    const footageData = {
      projectId,
      userId,
      fileName: safeFileName,
      sizeMB: parseFloat(sizeMB) || 0,
      title: safeFileName,
      kind: kind || 'raw',
      status: 'uploaded',      // queued / processing / ready later change kar sakte ho
      rawDriveLink,
      editedDriveLink: '',
      thumbnailDataUrl: thumbnailDataUrl || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const docRef = await db.collection('footage').add(footageData);

    console.log('✅ Footage uploaded:', {
      footageId: docRef.id,
      fileId,
      rawDriveLink,
    });

    return res.json({
      success: true,
      message: 'Footage uploaded successfully',
      footageId: docRef.id,
      driveFileId: fileId,
      rawDriveLink,
    });

  } catch (err) {
    console.error('❌ Footage upload error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload footage',
      error: err.message,
    });
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


// Helper to clean history for strict APIs (Perplexity/Groq)
function sanitizeMessages(history, currentUserMsg) {
  const cleanMessages = [];
  
  // 1. Add System Prompt first
  cleanMessages.push({ role: "system", content: "You are a helpful AI assistant." });

  // 2. Process History
  if (history && Array.isArray(history)) {
    for (const msg of history) {
      if (!msg.parts || !msg.parts[0]?.text) continue; // Skip empty
      
      const role = msg.role === 'model' ? 'assistant' : 'user';
      const content = msg.parts[0].text;

      // Merge consecutive messages of same role
      if (cleanMessages.length > 0 && cleanMessages[cleanMessages.length - 1].role === role) {
        cleanMessages[cleanMessages.length - 1].content += "\n\n" + content;
      } else {
        cleanMessages.push({ role, content });
      }
    }
  }

  // 3. Add Current User Message
  // Check if last message was also user, if so merge
  if (cleanMessages.length > 0 && cleanMessages[cleanMessages.length - 1].role === 'user') {
    cleanMessages[cleanMessages.length - 1].content += "\n\n" + currentUserMsg;
  } else {
    cleanMessages.push({ role: 'user', content: currentUserMsg });
  }

  return cleanMessages;
}

// Main chat endpoint
app.post('/api/chat', async (req, res) => {
  const { userMessage, model, history } = req.body;
  
  // 🔥 HELPER: History Cleaner (Perplexity ke liye zaroori)
  const sanitizeMessages = (hist, currentMsg) => {
    let clean = [];
    
    // 1. System Prompt (Zaroori hai)
    clean.push({ role: "system", content: "You are a helpful AI assistant." });

    // 2. History Process Karo
    if (hist && Array.isArray(hist)) {
      hist.forEach(msg => {
        if (!msg.parts || !msg.parts[0]?.text) return;
        
        const role = msg.role === 'model' ? 'assistant' : 'user';
        const content = msg.parts[0].text;

        // Logic: Agar pichla message same role ka tha, to merge karo
        if (clean.length > 0 && clean[clean.length - 1].role === role) {
          clean[clean.length - 1].content += "\n\n" + content;
        } else {
          clean.push({ role, content });
        }
      });
    }

    // 3. Current Message Add Karo (Safety Check)
    if (clean.length > 0 && clean[clean.length - 1].role === 'user') {
      clean[clean.length - 1].content += "\n\n" + currentMsg;
    } else {
      clean.push({ role: 'user', content: currentMsg });
    }

    return clean;
  };

  console.log('\n🟢 === NEW REQUEST ===');
  console.log('🤖 Requested Model:', model);
  

  if (!userMessage) return res.status(400).json({ error: 'Message is required' });

  try {
    let response;
    
    // ============= GEMINI MODELS (2.5 UPDATE) =============
    if (model?.startsWith('gemini-')) {
      console.log('🔷 Using Gemini API...');
      
      const keys = [
        process.env.GEMINI_API_KEY,
        process.env.GEMINI_API_KEY_1, process.env.GEMINI_API_KEY_2, 
        process.env.GEMINI_API_KEY_3, process.env.GEMINI_API_KEY_4
      ].filter(k => k && k.trim().length > 10);

      if (keys.length === 0) throw new Error('No Gemini API keys found in .env');

      // Prepare History
      let contents = [];
      if (history && Array.isArray(history)) {
        contents = history
          .filter(m => m.parts && m.parts[0]?.text)
          .map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.parts[0].text }]
          }));
      }
      contents.push({ role: 'user', parts: [{ text: userMessage }] });

      // Helper: Call Gemini
      const tryGemini = async (targetModel, keyAttempt) => {
        // v1beta is standard for new models
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${keyAttempt}`;
        console.log(`Trying: ${targetModel}...`);
        return await axios.post(url, { contents });
      };

      // 🔥 UPDATED FALLBACK CHAIN (2.5 Included)
      const fallbackList = [
        model,                      // 1. User selection
        'gemini-2.5-flash',         // 2. Latest Fast Model (Most likely to work)
        'gemini-2.5-pro',           // 3. Latest Smart Model
        'gemini-2.0-flash',         // 4. Previous Stable
        'gemini-1.5-flash',         // 5. Legacy
        'gemini-1.5-flash-002',     // 6. Specific Legacy Version
        'gemini-pro'                // 7. Oldest Reliable
      ];

      // Remove duplicates & filter empty
      const uniqueModels = [...new Set(fallbackList)].filter(m => m);
      
      let lastError = null;
      
      // Loop through models
      for (const currentModel of uniqueModels) {
        // Pick random key
        const currentKey = keys[Math.floor(Math.random() * keys.length)];
        
        try {
          response = await tryGemini(currentModel, currentKey);
          console.log(`✅ Success with ${currentModel}`);
          return res.json(response.data);
        } catch (err) {
          console.log(`❌ Failed ${currentModel}: ${err.response?.status || err.message}`);
          lastError = err;
          // Agar 429 hai to thoda wait karke agli key try karne ka logic bhi automatic loop me cover ho jayega
          // agar hum agli iteration me key change karein.
        }
      }

      throw lastError;
    }

    // ... (GROQ, PERPLEXITY, SERPER logic same as before - no changes needed there) ...
    // ============= GROQ MODELS =============
    else if (model?.startsWith('groq-')) {
      console.log('⚡ Using Groq API...');
      if (!process.env.GROQ_API_KEY) throw new Error('Missing GROQ_API_KEY');

      const groqModelMap = {
        'groq-llama-70b': 'llama-3.3-70b-versatile',
        'groq-llama-8b': 'llama-3.1-8b-instant'
      };
      const actualModel = groqModelMap[model] || 'llama-3.1-8b-instant';
      
      let messages = [{ role: "system", content: "You are a helpful AI assistant." }];
      if (history && Array.isArray(history)) {
          history.forEach(msg => {
             if(msg.parts?.[0]?.text) messages.push({
                 role: msg.role === 'model' ? 'assistant' : 'user',
                 content: msg.parts[0].text
             });
          });
      }
      messages.push({ role: 'user', content: userMessage });

      response = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        { model: actualModel, messages, temperature: 0.7, max_tokens: 1024 },
        { headers: { 'Authorization': `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' } }
      );
      return res.json(response.data);
    }

    // ============= PERPLEXITY =============
// ============= PERPLEXITY (FIXED) =============
    else if (model === 'perplexity-online') {
      console.log('🟣 Using Perplexity API...');
      if (!process.env.PERPLEXITY_API_KEY) throw new Error('Missing PERPLEXITY_API_KEY');
      
      // 🔥 Yahan Sanitizer Use Kiya Hai (Jo upar define kiya)
      const messages = sanitizeMessages(history, userMessage);

      response = await axios.post(
        'https://api.perplexity.ai/chat/completions',
        { 
            model: 'sonar', // Generic alias (Best for compatibility)
            messages: messages 
        },
        { headers: { 'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`, 'Content-Type': 'application/json' } }
      );
      return res.json(response.data);
    }

    // ============= SERPER =============
    else if (model === 'serper-search') {
      console.log('🔍 Serper Search...');
      if (!process.env.SERPER_API_KEY) throw new Error('Missing SERPER_API_KEY');
      response = await axios.post('https://google.serper.dev/search', 
        { q: userMessage, num: 5 },
        { headers: { 'X-API-KEY': process.env.SERPER_API_KEY, 'Content-Type': 'application/json' } }
      );
      const formatted = (response.data.organic || []).map((r, i) => `${i+1}. **${r.title}**\n${r.snippet}\n[Link](${r.link})`).join('\n\n');
      return res.json({ candidates: [{ content: { parts: [{ text: `🔍 **Results:**\n\n${formatted}` }] } }] });
    }

    else { throw new Error(`Model '${model}' not supported`); }

  } catch (error) {
    console.error('❌ FINAL API ERROR:', error.response?.data || error.message);
    res.status(500).json({
      error: 'API Failed',
      message: "All models failed. Please try again later."
    });
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




// 5. 👻 GHOST MODE (Impersonate User)
app.post('/api/admin/ghost-login', requireAdmin, async (req, res) => {
    const { targetUserId } = req.body;
    try {
        const doc = await db.collection('users').doc(targetUserId).get();
        if (!doc.exists) return res.status(404).json({ success: false, message: "User not found" });
        
        // Return user data (Simulating a login)
        return res.json({ success: true, user: { userId: doc.id, ...doc.data() } });
    } catch(e) { 
        console.error(e);
        return res.status(500).json({ success: false, message: "Ghost login failed" }); 
    }
});

// 6. 📢 SET ANNOUNCEMENT (Admin Only)
app.post('/api/admin/announce', requireAdmin, async (req, res) => {
    const { message, type } = req.body; // type: 'info', 'warning', 'success'
    try {
        // Save to a specific document in 'system' collection
        await db.collection('system').doc('global_announcement').set({
            message: message, // If empty, it clears the announcement
            type: type || 'info',
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            active: !!message
        });
        return res.json({ success: true, message: "Announcement updated." });
    } catch(e) { 
        console.error(e);
        return res.status(500).json({ success: false }); 
    }
});

// 7. 📡 GET ANNOUNCEMENT (Public API for all users)
app.get('/api/get-announcement', async (req, res) => {
    try {
        const doc = await db.collection('system').doc('global_announcement').get();
        if (doc.exists && doc.data().active) {
            return res.json({ success: true, announcement: doc.data() });
        }
        return res.json({ success: false });
    } catch(e) { return res.json({ success: false }); }
});

// 2. FINALIZE UPLOAD (Set Public & Return Links)
app.post('/api/drive/finalize-upload', async (req, res) => {
  try {
    const { fileId } = req.body;
    console.log(`✅ Finalizing File: ${fileId}`);

    // 1. File ko Public karo
    await setFilePublic(fileId);

    // 2. Links nikalo
    const fileRes = await drive.files.get({
      fileId,
      fields: 'webViewLink, webContentLink',
    });

    res.json({
      success: true,
      fileId: fileId,
      viewLink: fileRes.data.webViewLink,
      downloadLink: fileRes.data.webContentLink
    });

  } catch (error) {
    console.error('❌ Finalize Error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
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

// ============ GLOBAL ERROR HANDLER (MULTER + OTHERS) ============
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    console.error('Multer error:', err);
    return res.status(400).json({
      success: false,
      message: err.message || 'Upload error (multer)',
    });
  }

  console.error('Unhandled error:', err);
  return res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
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