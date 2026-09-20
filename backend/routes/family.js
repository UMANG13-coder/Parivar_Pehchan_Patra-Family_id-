const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

// All routes here are protected
router.use(authMiddleware);

// ============================================
// GET /api/family
// Get the current user's family details with all members
// ============================================
router.get('/', async (req, res) => {
  try {
    const family = await prisma.family.findUnique({
      where: { family_id: req.user.familyId },
      include: {
        citizens: true,
        document_mappings: {
          include: { document: true },
        },
      },
    });

    if (!family) {
      return res.status(404).json({ error: 'Family not found.' });
    }

    res.json(family);
  } catch (error) {
    console.error('Get family error:', error);
    res.status(500).json({ error: 'Failed to fetch family data.' });
  }
});

// ============================================
// GET /api/family/eligible-schemes
// Get welfare schemes the family is eligible for
// ============================================
router.get('/eligible-schemes', async (req, res) => {
  try {
    const family = await prisma.family.findUnique({
      where: { family_id: req.user.familyId }
    });

    if (!family || family.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Only ACTIVE (verified) families can view eligible schemes.' });
    }

    const allSchemes = await prisma.scheme.findMany();
    
    // Evaluate eligibility based on income threshold
    // If scheme has no threshold (null), everyone is eligible.
    // If scheme has threshold, family income must be <= threshold.
    const familyIncome = family.household_total_income ? parseFloat(family.household_total_income) : 0;
    
    const eligibleSchemes = allSchemes.filter(scheme => {
      if (!scheme.income_threshold) return true;
      const threshold = parseFloat(scheme.income_threshold);
      return familyIncome <= threshold;
    });

    res.json(eligibleSchemes);
  } catch (error) {
    console.error('Eligible schemes error:', error);
    res.status(500).json({ error: 'Failed to fetch eligible schemes.' });
  }
});

// ============================================
// PUT /api/family
// Update family details (address, district) — only in DRAFT status
// ============================================
router.put('/', async (req, res) => {
  try {
    const family = await prisma.family.findUnique({ where: { family_id: req.user.familyId } });

    if (!family) {
      return res.status(404).json({ error: 'Family not found.' });
    }

    if (family.status !== 'DRAFT') {
      return res.status(403).json({ error: 'Family details can only be edited in DRAFT state.' });
    }

    const { current_address, district, state, ration_card_no } = req.body;

    const updatedFamily = await prisma.family.update({
      where: { family_id: req.user.familyId },
      data: {
        ...(current_address && { current_address }),
        ...(district && { district }),
        ...(state && { state }),
        ...(ration_card_no && { ration_card_no }),
      },
    });

    res.json(updatedFamily);
  } catch (error) {
    console.error('Update family error:', error);
    res.status(500).json({ error: 'Failed to update family.' });
  }
});

// ============================================
// POST /api/family/members
// Add a family member — only in DRAFT status
// ============================================
router.post('/members', async (req, res) => {
  try {
    const family = await prisma.family.findUnique({ where: { family_id: req.user.familyId } });

    if (!family) {
      return res.status(404).json({ error: 'Family not found.' });
    }

    if (family.status !== 'DRAFT') {
      return res.status(403).json({ error: 'Members can only be added in DRAFT state.' });
    }

    const { full_name, aadhaar_id, date_of_birth, gender, occupation, annual_income, relationship, relationship_custom, caste } = req.body;

    if (!full_name || !aadhaar_id) {
      return res.status(400).json({ error: 'full_name and aadhaar_id are required.' });
    }

    // Check duplicate Aadhaar
    const existing = await prisma.citizen.findUnique({ where: { aadhaar_id } });
    if (existing) {
      return res.status(409).json({ error: 'This Aadhaar number is already registered.' });
    }

    // Find current head of family
    const head = await prisma.citizen.findFirst({
      where: { family_id: req.user.familyId, is_head_of_family: true }
    });

    const member = await prisma.citizen.create({
      data: {
        full_name,
        aadhaar_id,
        family_id: req.user.familyId,
        head_id: head ? head.citizen_id : null,
        date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
        gender: gender || null,
        occupation: occupation || null,
        annual_income: annual_income || null,
        relationship: relationship || null,
        relationship_custom: relationship_custom || null,
        caste: caste || null,
      },
    });

    res.status(201).json(member);
  } catch (error) {
    console.error('Add member error:', error);
    res.status(500).json({ error: 'Failed to add family member.' });
  }
});

// ============================================
// DELETE /api/family/members/:citizenId
// Remove a family member — only in DRAFT status
// ============================================
router.delete('/members/:citizenId', async (req, res) => {
  try {
    const family = await prisma.family.findUnique({ where: { family_id: req.user.familyId } });

    if (family.status !== 'DRAFT') {
      return res.status(403).json({ error: 'Members can only be removed in DRAFT state.' });
    }

    const citizen = await prisma.citizen.findUnique({ where: { citizen_id: req.params.citizenId } });
    if (!citizen || citizen.family_id !== req.user.familyId) {
      return res.status(404).json({ error: 'Member not found in your family.' });
    }

    if (citizen.is_head_of_family) {
      return res.status(403).json({ error: 'Cannot remove the Head of Family.' });
    }

    await prisma.citizen.delete({ where: { citizen_id: req.params.citizenId } });
    res.json({ message: 'Member removed successfully.' });
  } catch (error) {
    console.error('Delete member error:', error);
    res.status(500).json({ error: 'Failed to remove member.' });
  }
});

// ============================================
// PUT /api/family/members/:citizenId
// Edit a family member — only in DRAFT status
// ============================================
router.put('/members/:citizenId', async (req, res) => {
  try {
    const family = await prisma.family.findUnique({ where: { family_id: req.user.familyId } });

    if (family.status !== 'DRAFT') {
      return res.status(403).json({ error: 'Members can only be edited in DRAFT state.' });
    }

    const { full_name, aadhaar_id, date_of_birth, gender, occupation, annual_income, relationship, relationship_custom, caste } = req.body;

    const citizen = await prisma.citizen.findUnique({ where: { citizen_id: req.params.citizenId } });
    if (!citizen || citizen.family_id !== req.user.familyId) {
      return res.status(404).json({ error: 'Member not found in your family.' });
    }

    const member = await prisma.citizen.update({
      where: { citizen_id: req.params.citizenId },
      data: {
        ...(full_name && { full_name }),
        ...(aadhaar_id && { aadhaar_id }),
        ...(date_of_birth && { date_of_birth: new Date(date_of_birth) }),
        ...(gender && { gender }),
        ...(occupation && { occupation }),
        ...(annual_income && { annual_income }),
        ...(relationship !== undefined && { relationship }),
        ...(relationship_custom !== undefined && { relationship_custom }),
        ...(caste !== undefined && { caste }),
      },
    });

    res.json(member);
  } catch (error) {
    console.error('Edit member error:', error);
    res.status(500).json({ error: 'Failed to edit member.' });
  }
});

// ============================================
// PUT /api/family/members/:citizenId/verify
// Verify a member's Aadhaar (mock OTP)
// ============================================
router.put('/members/:citizenId/verify', async (req, res) => {
  try {
    const family = await prisma.family.findUnique({ where: { family_id: req.user.familyId } });

    if (family.status !== 'DRAFT') {
      return res.status(403).json({ error: 'Members can only be verified in DRAFT state.' });
    }

    const citizen = await prisma.citizen.findUnique({ where: { citizen_id: req.params.citizenId } });
    if (!citizen || citizen.family_id !== req.user.familyId) {
      return res.status(404).json({ error: 'Member not found in your family.' });
    }

    const member = await prisma.citizen.update({
      where: { citizen_id: req.params.citizenId },
      data: { is_aadhaar_verified: true },
    });

    res.json({ message: 'Aadhaar verified successfully', member });
  } catch (error) {
    console.error('Verify member error:', error);
    res.status(500).json({ error: 'Failed to verify member.' });
  }
});

// ============================================
// PUT /api/family/members/:citizenId/make-head
// Make a member the Head of the Family
// ============================================
router.put('/members/:citizenId/make-head', async (req, res) => {
  try {
    const family = await prisma.family.findUnique({ where: { family_id: req.user.familyId } });

    if (family.status !== 'DRAFT') {
      return res.status(403).json({ error: 'Head of family can only be changed in DRAFT state.' });
    }

    const citizen = await prisma.citizen.findUnique({ where: { citizen_id: req.params.citizenId } });
    if (!citizen || citizen.family_id !== req.user.familyId) {
      return res.status(404).json({ error: 'Member not found in your family.' });
    }

    if (citizen.is_head_of_family) {
      return res.status(400).json({ error: 'Member is already the head of family.' });
    }

    // Transaction to update all members safely
    await prisma.$transaction(async (tx) => {
      // 1. Unset old head
      await tx.citizen.updateMany({
        where: { family_id: req.user.familyId, is_head_of_family: true },
        data: { is_head_of_family: false },
      });

      // 2. Set new head
      await tx.citizen.update({
        where: { citizen_id: req.params.citizenId },
        data: { is_head_of_family: true, relationship: null, relationship_custom: null },
      });

      // 3. Update all members in family to point to new head_id
      await tx.citizen.updateMany({
        where: { family_id: req.user.familyId },
        data: { head_id: req.params.citizenId },
      });
    });

    res.json({ message: 'Head of family updated successfully.' });
  } catch (error) {
    console.error('Make head error:', error);
    res.status(500).json({ error: 'Failed to update head of family.' });
  }
});

// ============================================
// POST /api/family/submit
// Submit the family application: DRAFT -> PENDING_VERIFICATION
// ============================================
router.post('/submit', async (req, res) => {
  try {
    const family = await prisma.family.findUnique({
      where: { family_id: req.user.familyId },
      include: { citizens: true },
    });

    if (!family) {
      return res.status(404).json({ error: 'Family not found.' });
    }

    if (family.status !== 'DRAFT') {
      return res.status(403).json({ error: `Application cannot be submitted. Current status: ${family.status}` });
    }

    // Basic validation before submission
    if (!family.current_address || !family.district) {
      return res.status(400).json({ error: 'Please fill in the family address and district before submitting.' });
    }

    // Verify all members have Aadhaar verified
    const unverifiedMembers = family.citizens.filter(c => !c.is_aadhaar_verified);
    if (unverifiedMembers.length > 0) {
      return res.status(400).json({ 
        error: 'All family members must have their Aadhaar verified before submission.' 
      });
    }

    // Calculate household total income from all members
    const totalIncome = family.citizens.reduce((sum, c) => {
      return sum + (parseFloat(c.annual_income) || 0);
    }, 0);

    const updatedFamily = await prisma.family.update({
      where: { family_id: req.user.familyId },
      data: {
        status: 'PENDING_VERIFICATION',
        household_total_income: totalIncome,
      },
    });

    res.json({
      message: 'Application submitted successfully! Use your Tracking Number to check status.',
      tracking_number: updatedFamily.tracking_number,
      status: updatedFamily.status,
    });
  } catch (error) {
    console.error('Submit error:', error);
    res.status(500).json({ error: 'Failed to submit application.' });
  }
});

// ============================================
// POST /api/family/unsubmit
// Revert application: PENDING_VERIFICATION -> DRAFT
// ============================================
router.post('/unsubmit', async (req, res) => {
  try {
    const family = await prisma.family.findUnique({ where: { family_id: req.user.familyId } });

    if (!family) {
      return res.status(404).json({ error: 'Family not found.' });
    }

    if (family.status !== 'PENDING_VERIFICATION') {
      return res.status(400).json({ error: 'Only pending applications can be unsubmitted.' });
    }

    const updatedFamily = await prisma.family.update({
      where: { family_id: req.user.familyId },
      data: { status: 'DRAFT' },
    });

    res.json({ message: 'Application unsubmitted. You can now edit your details.', status: updatedFamily.status });
  } catch (error) {
    console.error('Unsubmit error:', error);
    res.status(500).json({ error: 'Failed to unsubmit application.' });
  }
});

// ============================================
// POST /api/family/simulate-approval (FOR TESTING)
// Simulates officer approving the application
// Generates 12-digit family ID and sets status to ACTIVE
// ============================================
router.post('/simulate-approval', async (req, res) => {
  try {
    const family = await prisma.family.findUnique({ where: { family_id: req.user.familyId } });

    if (!family) {
      return res.status(404).json({ error: 'Family not found.' });
    }

    if (family.status !== 'PENDING_VERIFICATION') {
      return res.status(400).json({ error: 'Only pending applications can be approved.' });
    }

    // Generate unique 12-digit ID
    let family_id_number = '';
    let isUnique = false;
    while (!isUnique) {
      family_id_number = '';
      for (let i = 0; i < 12; i++) {
        family_id_number += Math.floor(Math.random() * 10);
      }
      const exists = await prisma.family.findUnique({ where: { family_id_number } });
      if (!exists) isUnique = true;
    }

    const updatedFamily = await prisma.family.update({
      where: { family_id: req.user.familyId },
      data: { 
        status: 'ACTIVE',
        family_id_number
      },
    });

    res.json({ 
      message: 'Application approved successfully!', 
      family_id_number: updatedFamily.family_id_number,
      status: updatedFamily.status 
    });
  } catch (error) {
    console.error('Approval error:', error);
    res.status(500).json({ error: 'Failed to approve application.' });
  }
});

module.exports = router;
