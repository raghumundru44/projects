const express = require('express');
const path = require('path');
const { dbRun, dbGet, dbAll } = require('../database/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { statusUpdateSchema } = require('../validations/schemas');
const { runVerification } = require('../services/geminiVerification');

const router = express.Router();

function calcDelayStatus(dueDate) {
  if (!dueDate) return 'NO_DEADLINE';
  const now = new Date();
  const due = new Date(dueDate);
  const diffDays = (due - now) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return 'OVERDUE';
  if (diffDays <= 2) return 'APPROACHING';
  return 'ON_TRACK';
}

// GET /api/officer/complaints
router.get('/complaints', authenticate, requireRole('officer'), async (req, res) => {
  try {
    const complaints = await dbAll(`
      SELECT c.*, cu.name as citizen_name, cu.email as citizen_email,
        (SELECT filename FROM complaint_photos WHERE complaint_id = c.id AND photo_type = 'original' ORDER BY id LIMIT 1) as original_photo
      FROM complaints c
      LEFT JOIN users cu ON c.citizen_id = cu.id
      WHERE c.assigned_officer_id = ?
      ORDER BY c.submitted_at DESC
    `, [req.user.id]);

    const result = complaints.map(c => ({ ...c, delay_status: calcDelayStatus(c.due_date) }));
    res.json({ complaints: result });
  } catch (err) {
    console.error('Officer complaints error:', err);
    res.status(500).json({ error: 'Failed to fetch complaints.' });
  }
});

// PATCH /api/officer/complaints/:complaintId/status
router.patch('/complaints/:complaintId/status', authenticate, requireRole('officer', 'admin'), async (req, res) => {
  const parse = statusUpdateSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Validation failed', details: parse.error.flatten().fieldErrors });
  }
  const { status, note } = parse.data;

  try {
    const complaint = await dbGet('SELECT * FROM complaints WHERE complaint_id = ?', [req.params.complaintId]);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });

    if (req.user.role === 'officer' && complaint.assigned_officer_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not assigned to this complaint.' });
    }

    if (status === 'RESOLVED' && req.user.role === 'officer') {
      return res.status(400).json({ error: 'Officers cannot directly resolve complaints. Upload a completion photo to trigger verification.' });
    }

    const oldStatus = complaint.status;
    await dbRun(`UPDATE complaints SET status = ?, updated_at = datetime('now') WHERE id = ?`, [status, complaint.id]);
    await dbRun(`
      INSERT INTO complaint_status_history (complaint_id, old_status, new_status, changed_by, note)
      VALUES (?, ?, ?, ?, ?)
    `, [complaint.id, oldStatus, status, req.user.id, note || null]);

    res.json({ message: 'Status updated successfully.' });
  } catch (err) {
    console.error('Status update error:', err);
    res.status(500).json({ error: 'Failed to update status.' });
  }
});

// POST /api/officer/complaints/:complaintId/completion-photo
router.post('/complaints/:complaintId/completion-photo', authenticate, requireRole('officer'), upload.single('completion_photo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Completion photograph is required.' });
  }

  try {
    const complaint = await dbGet('SELECT * FROM complaints WHERE complaint_id = ?', [req.params.complaintId]);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });

    if (complaint.assigned_officer_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not assigned to this complaint.' });
    }

    const allowedStatuses = ['ASSIGNED', 'IN_PROGRESS'];
    if (!allowedStatuses.includes(complaint.status)) {
      return res.status(400).json({ error: `Cannot submit completion photo when status is "${complaint.status}". Set status to IN_PROGRESS first.` });
    }

    const originalPhoto = await dbGet(
      'SELECT * FROM complaint_photos WHERE complaint_id = ? AND photo_type = ? ORDER BY id LIMIT 1',
      [complaint.id, 'original']
    );

    if (!originalPhoto) {
      return res.status(400).json({ error: 'Original complaint photo not found.' });
    }

    // Save completion photo
    const photoResult = await dbRun(`
      INSERT INTO complaint_photos (complaint_id, photo_type, filename, original_name, mimetype, size, uploaded_by)
      VALUES (?, 'completion', ?, ?, ?, ?, ?)
    `, [complaint.id, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, req.user.id]);

    const completionPhotoId = photoResult.lastID;

    // Run AI verification
    const originalPath = path.join(__dirname, '..', 'uploads', originalPhoto.filename);
    const completionPath = path.join(__dirname, '..', 'uploads', req.file.filename);

    let aiResult;
    try {
      aiResult = await runVerification(originalPath, completionPath, complaint.category);
    } catch (err) {
      console.error('AI verification failed:', err.message);
      aiResult = {
        verdict: 'NEEDS_REVIEW',
        explanation: 'AI assessment failed. Manual review is required.',
        evidence: null,
        limitations: err.message
      };
    }

    // Save verification record
    const verifyResult = await dbRun(`
      INSERT INTO verification_records (complaint_id, original_photo_id, completion_photo_id, ai_verdict, ai_explanation, ai_evidence, ai_limitations, ai_assessed_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `, [complaint.id, originalPhoto.id, completionPhotoId, aiResult.verdict, aiResult.explanation, aiResult.evidence || null, aiResult.limitations || null]);

    // Update status to AWAITING_VERIFICATION
    const oldStatus = complaint.status;
    await dbRun(`UPDATE complaints SET status = 'AWAITING_VERIFICATION', updated_at = datetime('now') WHERE id = ?`, [complaint.id]);
    await dbRun(`
      INSERT INTO complaint_status_history (complaint_id, old_status, new_status, changed_by, note)
      VALUES (?, ?, 'AWAITING_VERIFICATION', ?, ?)
    `, [complaint.id, oldStatus, req.user.id, `Completion photo uploaded. AI verdict: ${aiResult.verdict}`]);

    res.json({
      message: 'Completion photo uploaded and AI assessment completed.',
      ai_verdict: aiResult.verdict,
      ai_explanation: aiResult.explanation,
      ai_evidence: aiResult.evidence,
      ai_limitations: aiResult.limitations,
      verification_id: verifyResult.lastID
    });
  } catch (err) {
    console.error('Completion photo error:', err);
    res.status(500).json({ error: 'Failed to process completion photo.' });
  }
});

module.exports = router;
