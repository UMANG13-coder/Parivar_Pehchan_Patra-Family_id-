const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const { JWT_SECRET } = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

// ============================================
// HELPER: Generate Tracking Number
// ============================================
function generateTrackingNumber() {
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += Math.floor(Math.random() * 10);
  }
  return id;
}

// ============================================
// HELPER: Generate Official 12-digit Family ID
// ============================================
function generateFamilyIdNumber() {
  let id = '';
  for (let i = 0; i < 12; i++) {
    id += Math.floor(Math.random() * 10);
  }
  return id;
}

// ============================================
// POST /api/auth/seed-admin
// Creates the default admin account
// ============================================
router.post('/seed-admin', async (req, res) => {
  try {
    const existingAdmin = await prisma.userAccount.findUnique({
      where: { mobile_number: '8888888888' }
    });

    if (existingAdmin) {
      return res.status(400).json({ error: 'Admin already exists' });
    }

    const hashedPassword = await bcrypt.hash('Admin@123', 10);

    await prisma.$transaction(async (tx) => {
      const family = await tx.family.create({
        data: { tracking_number: `ADM-FAM-${Date.now()}` }
      });

      const citizen = await tx.citizen.create({
        data: {
          full_name: 'System Admin',
          aadhaar_id: `ADMIN-${Date.now()}`,
          family_id: family.family_id,
          is_head_of_family: true
        }
      });

      await tx.userAccount.create({
        data: {
          mobile_number: '8888888888',
          hashed_password: hashedPassword,
          role: 'admin',
          citizen_id: citizen.citizen_id
        }
      });
    });

    res.status(201).json({ message: 'Admin seeded successfully (8888888888 / Admin@123)' });
  } catch (error) {
    console.error('Error seeding admin:', error);
    res.status(500).json({ error: 'Failed to seed admin' });
  }
});

// ============================================
// POST /api/auth/signup
// Step 1: Identity Handshake
// Creates UserAccount + Citizen (Head) + Family (DRAFT)
// ============================================
router.post('/signup', async (req, res) => {
  try {
    const { full_name, aadhaar_id, mobile_number, password } = req.body;

    // Validate required fields
    if (!full_name || !aadhaar_id || !mobile_number || !password) {
      return res.status(400).json({ error: 'All fields are required: full_name, aadhaar_id, mobile_number, password' });
    }

    // Validate Aadhaar format
    if (!/^\d{12}$/.test(aadhaar_id)) {
      return res.status(400).json({ error: 'Aadhaar number must be exactly 12 digits.' });
    }

    // Validate mobile number format
    if (!/^[6-9]\d{9}$/.test(mobile_number)) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.' });
    }

    // Validate password strength (Government portal standards)
    const passwordErrors = [];
    if (password.length < 8) passwordErrors.push('at least 8 characters');
    if (!/[A-Z]/.test(password)) passwordErrors.push('one uppercase letter (A-Z)');
    if (!/[a-z]/.test(password)) passwordErrors.push('one lowercase letter (a-z)');
    if (!/[0-9]/.test(password)) passwordErrors.push('one digit (0-9)');
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) passwordErrors.push('one special character (!@#$%^&*)');
    if (passwordErrors.length > 0) {
      return res.status(400).json({ error: `Password must contain: ${passwordErrors.join(', ')}.` });
    }

    // Check if Aadhaar already registered
    const existingCitizen = await prisma.citizen.findUnique({ where: { aadhaar_id } });
    if (existingCitizen) {
      return res.status(409).json({ error: 'This Aadhaar number is already registered. If you already have an account, please login instead.' });
    }

    // Check if mobile number already registered
    const existingAccount = await prisma.userAccount.findUnique({ where: { mobile_number } });
    if (existingAccount) {
      return res.status(409).json({ error: 'This mobile number is already registered with another account. Please use a different number or login.' });
    }

    // Hash the password
    const hashed_password = await bcrypt.hash(password, 10);

    // Generate a unique tracking number
    let tracking_number = generateTrackingNumber();
    let trackingExists = await prisma.family.findUnique({ where: { tracking_number } });
    while (trackingExists) {
      tracking_number = generateTrackingNumber();
      trackingExists = await prisma.family.findUnique({ where: { tracking_number } });
    }

    // Create everything in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the Family in DRAFT state
      const family = await tx.family.create({
        data: {
          tracking_number,
          status: 'DRAFT',
        },
      });

      // 2. Create the Citizen (Head of Family)
      const citizen = await tx.citizen.create({
        data: {
          aadhaar_id,
          full_name,
          family_id: family.family_id,
          is_head_of_family: true,
          is_aadhaar_verified: true, // Head verifies via OTP during signup
        },
      });

      // Update the citizen to point head_id to themselves
      await tx.citizen.update({
        where: { citizen_id: citizen.citizen_id },
        data: { head_id: citizen.citizen_id },
      });

      // 3. Create the UserAccount (login credentials)
      const account = await tx.userAccount.create({
        data: {
          mobile_number,
          hashed_password,
          citizen_id: citizen.citizen_id,
          role: 'citizen',
        },
      });

      return { family, citizen, account };
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        accountId: result.account.account_id,
        citizenId: result.citizen.citizen_id,
        familyId: result.family.family_id,
        role: result.account.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'Registration successful! Your family application is in DRAFT state.',
      token,
      user: {
        account_id: result.account.account_id,
        full_name: result.citizen.full_name,
        aadhaar_id: result.citizen.aadhaar_id,
        mobile_number: result.account.mobile_number,
        role: result.account.role,
      },
      family: {
        family_id: result.family.family_id,
        tracking_number: result.family.tracking_number,
        status: result.family.status,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ============================================
// POST /api/auth/login
// ============================================
router.post('/login', async (req, res) => {
  try {
    const { mobile_number, password } = req.body;

    if (!mobile_number || !password) {
      return res.status(400).json({ error: 'Mobile number and password are required.' });
    }

    // Validate mobile number format
    if (!/^[6-9]\d{9}$/.test(mobile_number)) {
      return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.' });
    }

    // Find the account
    const account = await prisma.userAccount.findUnique({
      where: { mobile_number },
      include: {
        citizen: {
          include: {
            family: true,
          },
        },
      },
    });

    if (!account) {
      return res.status(401).json({ error: 'No account found with this mobile number. Please check or register first.' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, account.hashed_password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Incorrect password. Please try again or reset your password.' });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        accountId: account.account_id,
        citizenId: account.citizen_id,
        familyId: account.citizen.family_id,
        role: account.role,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful!',
      token,
      user: {
        account_id: account.account_id,
        full_name: account.citizen.full_name,
        aadhaar_id: account.citizen.aadhaar_id,
        mobile_number: account.mobile_number,
        role: account.role,
      },
      family: {
        family_id: account.citizen.family.family_id,
        tracking_number: account.citizen.family.tracking_number,
        family_id_number: account.citizen.family.family_id_number,
        status: account.citizen.family.status,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// ============================================
// GET /api/auth/me  (Protected)
// Returns the current logged-in user's profile
// ============================================
router.get('/me', async (req, res) => {
  // This route expects authMiddleware to be applied in server.js
  try {
    const account = await prisma.userAccount.findUnique({
      where: { account_id: req.user.accountId },
      include: {
        citizen: {
          include: {
            family: {
              include: {
                citizens: true,
              },
            },
          },
        },
      },
    });

    if (!account) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({
      user: {
        account_id: account.account_id,
        full_name: account.citizen.full_name,
        aadhaar_id: account.citizen.aadhaar_id,
        mobile_number: account.mobile_number,
        role: account.role,
      },
      family: account.citizen.family,
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

// ============================================
// POST /api/auth/seed-officer
// Creates a default officer account (for dev/demo)
// ============================================
router.post('/seed-officer', async (req, res) => {
  try {
    const existing = await prisma.userAccount.findUnique({ where: { mobile_number: '9999999999' } });
    if (existing) {
      return res.json({ message: 'Officer account already exists.', mobile: '9999999999', password: 'Officer@123' });
    }

    const hashed_password = await bcrypt.hash('Officer@123', 10);

    const result = await prisma.$transaction(async (tx) => {
      const family = await tx.family.create({
        data: { tracking_number: '00000000', status: 'ACTIVE' },
      });
      const citizen = await tx.citizen.create({
        data: {
          aadhaar_id: '000000000000',
          full_name: 'Verification Officer',
          family_id: family.family_id,
          is_head_of_family: true,
        },
      });
      const account = await tx.userAccount.create({
        data: {
          mobile_number: '9999999999',
          hashed_password,
          role: 'officer',
          citizen_id: citizen.citizen_id,
        },
      });
      return account;
    });

    res.json({
      message: 'Officer account created!',
      mobile: '9999999999',
      password: 'Officer@123',
    });
  } catch (error) {
    console.error('Seed officer error:', error);
    res.status(500).json({ error: 'Failed to create officer account.' });
  }
});

module.exports = router;
