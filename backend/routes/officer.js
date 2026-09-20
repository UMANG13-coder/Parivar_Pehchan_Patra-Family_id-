const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

// All routes require auth + officer role
router.use(authMiddleware);
router.use(authorizeRoles('officer', 'admin'));

// ============================================
// HELPER: Generate unique 12-digit Family ID
// ============================================
async function generateUniqueFamilyId() {
  let id = '';
  let isUnique = false;
  while (!isUnique) {
    id = '';
    // First 4 digits: from 1-9 (no zeros)
    for (let i = 0; i < 4; i++) {
      id += Math.floor(Math.random() * 9) + 1;
    }
    
    // Remaining 8 digits: 0-9
    let remaining = '';
    while (true) {
      remaining = '';
      for (let i = 0; i < 8; i++) {
        remaining += Math.floor(Math.random() * 10);
      }
      // Ensure remaining 8 digits are not all zeros
      if (remaining !== '00000000') {
        break;
      }
    }
    
    id += remaining;

    const exists = await prisma.family.findUnique({ where: { family_id_number: id } });
    if (!exists) isUnique = true;
  }
  return id;
}

// ============================================
// GET /api/officer/applications
// Lists all applications pending verification
// ============================================
router.get('/applications', async (req, res) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) {
      where.status = status;
    } else {
      // Default: show PENDING_VERIFICATION
      where.status = 'PENDING_VERIFICATION';
    }

    const families = await prisma.family.findMany({
      where,
      include: {
        citizens: {
          orderBy: { is_head_of_family: 'desc' },
        },
      },
      orderBy: { updated_at: 'asc' },
    });

    res.json(families);
  } catch (error) {
    console.error('Fetch applications error:', error);
    res.status(500).json({ error: 'Failed to fetch applications.' });
  }
});

// ============================================
// GET /api/officer/applications/:familyId
// Full details of a single application
// ============================================
router.get('/applications/:familyId', async (req, res) => {
  try {
    const family = await prisma.family.findUnique({
      where: { family_id: req.params.familyId },
      include: {
        citizens: {
          orderBy: { is_head_of_family: 'desc' },
        },
        document_mappings: {
          include: {
            document: true,
            citizen: true,
          },
        },
      },
    });

    if (!family) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    res.json(family);
  } catch (error) {
    console.error('Fetch application error:', error);
    res.status(500).json({ error: 'Failed to fetch application details.' });
  }
});

// ============================================
// PUT /api/officer/documents/:mappingId/verify
// Officer verifies a single document
// ============================================
router.put('/documents/:mappingId/verify', async (req, res) => {
  try {
    const { action, reject_reason } = req.body; // action: 'approve' | 'reject'

    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'action must be "approve" or "reject".' });
    }

    const mapping = await prisma.documentMapping.findUnique({
      where: { mapping_id: req.params.mappingId },
    });

    if (!mapping) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    const updated = await prisma.documentMapping.update({
      where: { mapping_id: req.params.mappingId },
      data: {
        is_verified: action === 'approve',
        verified_by: req.user.accountId,
        verified_at: new Date(),
        reject_reason: action === 'reject' ? (reject_reason || 'Document rejected by officer.') : null,
      },
      include: { document: true, citizen: true },
    });

    res.json({ message: `Document ${action === 'approve' ? 'approved' : 'rejected'}.`, mapping: updated });
  } catch (error) {
    console.error('Document verify error:', error);
    res.status(500).json({ error: 'Failed to verify document.' });
  }
});

// ============================================
// POST /api/officer/applications/:familyId/approve
// Officer approves an entire application
// Generates official 12-digit Family ID
// ============================================
router.post('/applications/:familyId/approve', async (req, res) => {
  try {
    const family = await prisma.family.findUnique({
      where: { family_id: req.params.familyId },
      include: {
        document_mappings: { include: { document: true } },
        citizens: true,
      },
    });

    if (!family) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    if (family.status !== 'PENDING_VERIFICATION') {
      return res.status(400).json({ error: 'Only pending applications can be approved.' });
    }

    // Check all documents are verified
    const unverifiedDocs = family.document_mappings.filter(d => !d.is_verified);
    if (unverifiedDocs.length > 0) {
      return res.status(400).json({
        error: `${unverifiedDocs.length} document(s) are still not verified. Please verify all documents before approving.`,
      });
    }

    // Generate unique 12-digit Family ID
    const family_id_number = await generateUniqueFamilyId();

    const updatedFamily = await prisma.family.update({
      where: { family_id: req.params.familyId },
      data: {
        status: 'ACTIVE',
        family_id_number,
      },
    });

    res.json({
      message: 'Application approved! Family ID has been issued.',
      family_id_number: updatedFamily.family_id_number,
      status: updatedFamily.status,
    });
  } catch (error) {
    console.error('Approve application error:', error);
    res.status(500).json({ error: 'Failed to approve application.' });
  }
});

// ============================================
// POST /api/officer/applications/:familyId/reject
// Officer rejects an entire application
// ============================================
router.post('/applications/:familyId/reject', async (req, res) => {
  try {
    const { reason } = req.body;

    const family = await prisma.family.findUnique({
      where: { family_id: req.params.familyId },
    });

    if (!family) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    if (family.status !== 'PENDING_VERIFICATION') {
      return res.status(400).json({ error: 'Only pending applications can be rejected.' });
    }

    const updatedFamily = await prisma.family.update({
      where: { family_id: req.params.familyId },
      data: {
        status: 'REJECTED',
      },
    });

    res.json({
      message: 'Application rejected.',
      reason: reason || 'Rejected by verification officer.',
      status: updatedFamily.status,
    });
  } catch (error) {
    console.error('Reject application error:', error);
    res.status(500).json({ error: 'Failed to reject application.' });
  }
});

module.exports = router;
