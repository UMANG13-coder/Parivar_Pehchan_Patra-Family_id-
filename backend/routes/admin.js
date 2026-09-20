const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const router = express.Router();
const prisma = new PrismaClient();

// Middleware to check if user is admin
const authorizeAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  next();
};

router.use(authorizeAdmin);

// ============================================
// OFFICERS MANAGEMENT
// ============================================

// GET all officers
router.get('/officers', async (req, res) => {
  try {
    const officers = await prisma.userAccount.findMany({
      where: { role: 'officer' },
      include: {
        citizen: true // In our schema, everyone has a citizen profile
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(officers);
  } catch (error) {
    console.error('Error fetching officers:', error);
    res.status(500).json({ error: 'Failed to fetch officers' });
  }
});

// POST create an officer
// Note: Since UserAccount requires a Citizen in our schema, we must create a dummy Citizen profile for the officer.
router.post('/officers', async (req, res) => {
  try {
    const { mobile_number, password, full_name } = req.body;
    
    if (!mobile_number || !password || !full_name) {
      return res.status(400).json({ error: 'Mobile number, password, and full name are required.' });
    }

    const existingUser = await prisma.userAccount.findUnique({ where: { mobile_number } });
    if (existingUser) {
      return res.status(409).json({ error: 'Mobile number already registered.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const officer = await prisma.$transaction(async (tx) => {
      // 1. Create a dummy family for the officer (since citizen requires a family)
      const family = await tx.family.create({
        data: { tracking_number: `OFF-FAM-${Date.now()}` }
      });

      // 2. Create the Citizen profile
      const citizen = await tx.citizen.create({
        data: {
          full_name,
          aadhaar_id: `OFFICER-${Date.now()}`,
          family_id: family.family_id,
          is_head_of_family: true
        }
      });

      // 3. Create the UserAccount
      return await tx.userAccount.create({
        data: {
          mobile_number,
          hashed_password: hashedPassword,
          role: 'officer',
          citizen_id: citizen.citizen_id
        },
        include: { citizen: true }
      });
    });

    res.status(201).json(officer);
  } catch (error) {
    console.error('Error creating officer:', error);
    res.status(500).json({ error: 'Failed to create officer' });
  }
});

// PUT edit officer
router.put('/officers/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    const { mobile_number, password, full_name } = req.body;

    const officer = await prisma.userAccount.findUnique({
      where: { account_id: accountId },
      include: { citizen: true }
    });

    if (!officer || officer.role !== 'officer') {
      return res.status(404).json({ error: 'Officer not found' });
    }

    const updateData = {};
    if (mobile_number) updateData.mobile_number = mobile_number;
    if (password) updateData.hashed_password = await bcrypt.hash(password, 10);

    const updatedOfficer = await prisma.$transaction(async (tx) => {
      if (full_name) {
        await tx.citizen.update({
          where: { citizen_id: officer.citizen_id },
          data: { full_name }
        });
      }
      return await tx.userAccount.update({
        where: { account_id: accountId },
        data: updateData,
        include: { citizen: true }
      });
    });

    res.json(updatedOfficer);
  } catch (error) {
    console.error('Error updating officer:', error);
    res.status(500).json({ error: 'Failed to update officer' });
  }
});

// DELETE officer
router.delete('/officers/:accountId', async (req, res) => {
  try {
    const { accountId } = req.params;
    
    const officer = await prisma.userAccount.findUnique({
      where: { account_id: accountId },
      include: { citizen: true }
    });

    if (!officer || officer.role !== 'officer') {
      return res.status(404).json({ error: 'Officer not found' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.userAccount.delete({ where: { account_id: accountId } });
      await tx.citizen.delete({ where: { citizen_id: officer.citizen_id } });
      await tx.family.delete({ where: { family_id: officer.citizen.family_id } });
    });

    res.json({ message: 'Officer deleted successfully' });
  } catch (error) {
    console.error('Error deleting officer:', error);
    res.status(500).json({ error: 'Failed to delete officer' });
  }
});


// ============================================
// FAMILY BROWSER
// ============================================

router.get('/families', async (req, res) => {
  try {
    const families = await prisma.family.findMany({
      where: {
        status: { in: ['PENDING_VERIFICATION', 'ACTIVE', 'REJECTED'] }
      },
      include: {
        _count: {
          select: { citizens: true }
        }
      },
      orderBy: { created_at: 'desc' }
    });
    res.json(families);
  } catch (error) {
    console.error('Error fetching families:', error);
    res.status(500).json({ error: 'Failed to fetch families' });
  }
});

router.get('/families/:familyId', async (req, res) => {
  try {
    const { familyId } = req.params;
    const family = await prisma.family.findUnique({
      where: { family_id: familyId },
      include: {
        citizens: {
          include: {
            document_mappings: {
              include: { document: true }
            }
          }
        },
        document_mappings: {
          include: { document: true }
        }
      }
    });

    if (!family) {
      return res.status(404).json({ error: 'Family not found' });
    }

    res.json(family);
  } catch (error) {
    console.error('Error fetching family details:', error);
    res.status(500).json({ error: 'Failed to fetch family details' });
  }
});

// ============================================
// SCHEME MANAGEMENT
// ============================================

router.get('/schemes', async (req, res) => {
  try {
    const schemes = await prisma.scheme.findMany({
      orderBy: { scheme_name: 'asc' }
    });
    res.json(schemes);
  } catch (error) {
    console.error('Error fetching schemes:', error);
    res.status(500).json({ error: 'Failed to fetch schemes' });
  }
});

router.post('/schemes', async (req, res) => {
  try {
    const { scheme_name, department, description, income_threshold, evaluation_scope, redirect_link } = req.body;
    
    if (!scheme_name || !evaluation_scope) {
      return res.status(400).json({ error: 'Scheme name and evaluation scope are required.' });
    }

    const scheme = await prisma.scheme.create({
      data: {
        scheme_name,
        department,
        description,
        income_threshold: income_threshold ? parseFloat(income_threshold) : null,
        evaluation_scope,
        redirect_link: redirect_link || null
      }
    });

    res.status(201).json(scheme);
  } catch (error) {
    console.error('Error creating scheme:', error);
    res.status(500).json({ error: 'Failed to create scheme' });
  }
});

router.put('/schemes/:schemeId', async (req, res) => {
  try {
    const { schemeId } = req.params;
    const { scheme_name, department, description, income_threshold, evaluation_scope, redirect_link } = req.body;

    const scheme = await prisma.scheme.update({
      where: { scheme_id: schemeId },
      data: {
        ...(scheme_name && { scheme_name }),
        ...(department !== undefined && { department }),
        ...(description !== undefined && { description }),
        ...(income_threshold !== undefined && { income_threshold: income_threshold ? parseFloat(income_threshold) : null }),
        ...(evaluation_scope && { evaluation_scope }),
        ...(redirect_link !== undefined && { redirect_link })
      }
    });

    res.json(scheme);
  } catch (error) {
    console.error('Error updating scheme:', error);
    res.status(500).json({ error: 'Failed to update scheme' });
  }
});

router.delete('/schemes/:schemeId', async (req, res) => {
  try {
    const { schemeId } = req.params;
    await prisma.scheme.delete({
      where: { scheme_id: schemeId }
    });
    res.json({ message: 'Scheme deleted successfully' });
  } catch (error) {
    console.error('Error deleting scheme:', error);
    res.status(500).json({ error: 'Failed to delete scheme' });
  }
});

module.exports = router;
