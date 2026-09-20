const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');
const { authMiddleware } = require('../middleware/authMiddleware');

const router = express.Router();
const prisma = new PrismaClient();

// All routes are protected
router.use(authMiddleware);

// ============================================
// Multer setup: store files in /uploads/<familyId>/
// ============================================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads', req.user.familyId);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, JPG, JPEG, PNG files are allowed.'));
    }
  },
});

// ============================================
// POST /api/documents/upload
// Upload a document for a specific citizen or for the family
// Body: document_type, citizen_id (optional, null = family-level doc)
// ============================================
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' });
    }

    const { document_type, citizen_id, custom_name } = req.body;

    if (!document_type) {
      return res.status(400).json({ error: 'document_type is required.' });
    }

    // Verify the family is in DRAFT status
    const family = await prisma.family.findUnique({ where: { family_id: req.user.familyId } });
    if (family.status !== 'DRAFT') {
      return res.status(403).json({ error: 'Documents can only be uploaded in DRAFT state.' });
    }

    // If citizen_id is provided, verify they belong to this family
    if (citizen_id) {
      const citizen = await prisma.citizen.findUnique({ where: { citizen_id } });
      if (!citizen || citizen.family_id !== req.user.familyId) {
        return res.status(404).json({ error: 'Member not found in your family.' });
      }
    }

    // Build the relative URL for retrieval
    const document_url = `/uploads/${req.user.familyId}/${req.file.filename}`;

    // Create the document and mapping in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const document = await tx.document.create({
        data: {
          document_url,
          document_type,
          file_name: custom_name || req.file.originalname,
        },
      });

      const mapping = await tx.documentMapping.create({
        data: {
          document_id: document.document_id,
          citizen_id: citizen_id || null,
          family_id: req.user.familyId,
        },
      });

      return { document, mapping };
    });

    res.status(201).json({
      message: 'Document uploaded successfully.',
      document: result.document,
      mapping: result.mapping,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload document.' });
  }
});

// ============================================
// GET /api/documents
// Get all documents for the user's family (family-level + per-member)
// ============================================
router.get('/', async (req, res) => {
  try {
    const mappings = await prisma.documentMapping.findMany({
      where: { family_id: req.user.familyId },
      include: {
        document: true,
        citizen: { select: { citizen_id: true, full_name: true, is_head_of_family: true } },
      },
      orderBy: { document: { uploaded_at: 'desc' } },
    });

    res.json(mappings);
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents.' });
  }
});

// ============================================
// DELETE /api/documents/:mappingId
// Delete a specific document and its file
// ============================================
router.delete('/:mappingId', async (req, res) => {
  try {
    const family = await prisma.family.findUnique({ where: { family_id: req.user.familyId } });
    if (family.status !== 'DRAFT') {
      return res.status(403).json({ error: 'Documents can only be removed in DRAFT state.' });
    }

    const mapping = await prisma.documentMapping.findUnique({
      where: { mapping_id: req.params.mappingId },
      include: { document: true },
    });

    if (!mapping || mapping.family_id !== req.user.familyId) {
      return res.status(404).json({ error: 'Document not found.' });
    }

    // Delete the physical file
    const filePath = path.join(__dirname, '..', mapping.document.document_url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete mapping and document from DB
    await prisma.$transaction(async (tx) => {
      await tx.documentMapping.delete({ where: { mapping_id: req.params.mappingId } });
      // Only delete the document if no other mappings reference it
      const otherMappings = await tx.documentMapping.count({
        where: { document_id: mapping.document_id },
      });
      if (otherMappings === 0) {
        await tx.document.delete({ where: { document_id: mapping.document_id } });
      }
    });

    res.json({ message: 'Document deleted.' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document.' });
  }
});

module.exports = router;
