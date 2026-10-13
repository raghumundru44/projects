const express = require('express');
const { dbRun, dbGet, dbAll } = require('../database/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { humanVerificationSchema } = require('../validations/schemas');

const router = express.Router();

// POST /api/verification/:complaintId/confirm
router.post('/:complaintId/confirm', authenticate, requireRole('citizen', 'admin'), async (req, res) => {
  const parse = humanVerificationSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Validation failed', details: parse.error.flatten().fieldErrors });
  }
  const { action, dispute_reason } = parse.data;

  try {
    const complaint = await dbGet('SELECT * FROM complaints WHERE complaint_id = ?', [req.params.complaintId]);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });

    if (req.user.role === 'citizen' && complaint.citizen_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    if (complaint.status !== 'AWAITING_VERIFICATION') {
      return res.status(400).json({ error: `Complaint must be AWAITING_VERIFICATION. Current: ${complaint.status}` });
    }

    const verification = await dbGet(
      'SELECT * FROM verification_records WHERE complaint_id = ? ORDER BY created_at DESC LIMIT 1',
      [complaint.id]
    );

    if (!verification) {
      return res.status(400).json({ error: 'No AI verification record found.' });
    }

    if (action === 'CONFIRMED') {
      await dbRun(`UPDATE complaints SET status = 'RESOLVED', updated_at = datetime('now') WHERE id = ?`, [complaint.id]);
      await dbRun(`
        INSERT INTO complaint_status_history (complaint_id, old_status, new_status, changed_by, note)
        VALUES (?, 'AWAITING_VERIFICATION', 'RESOLVED', ?, 'Resolution confirmed by human review')
      `, [complaint.id, req.user.id]);
      await dbRun(`
        UPDATE verification_records SET human_action = 'CONFIRMED', human_action_by = ?, human_action_at = datetime('now') WHERE id = ?
      `, [req.user.id, verification.id]);
      res.json({ message: 'Complaint marked as RESOLVED. Thank you for confirming.' });
    } else {
      await dbRun(`UPDATE complaints SET status = 'REOPENED', updated_at = datetime('now') WHERE id = ?`, [complaint.id]);
      await dbRun(`
        INSERT INTO complaint_status_history (complaint_id, old_status, new_status, changed_by, note)
        VALUES (?, 'AWAITING_VERIFICATION', 'REOPENED', ?, ?)
      `, [complaint.id, req.user.id, `Resolution disputed: ${dispute_reason}`]);
      await dbRun(`
        UPDATE verification_records SET human_action = 'DISPUTED', human_action_by = ?, human_action_at = datetime('now'), dispute_reason = ? WHERE id = ?
      `, [req.user.id, dispute_reason, verification.id]);
      res.json({ message: 'Complaint reopened. Your dispute has been recorded.' });
    }
  } catch (err) {
    console.error('Verification confirm error:', err);
    res.status(500).json({ error: 'Failed to process verification.' });
  }
});

// GET /api/verification/:complaintId
router.get('/:complaintId', authenticate, async (req, res) => {
  try {
    const complaint = await dbGet('SELECT * FROM complaints WHERE complaint_id = ?', [req.params.complaintId]);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });

    if (req.user.role === 'citizen' && complaint.citizen_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const verifications = await dbAll(`
      SELECT v.*, u.name as human_action_by_name,
        op.filename as original_photo_filename, cp.filename as completion_photo_filename
      FROM verification_records v
      LEFT JOIN users u ON v.human_action_by = u.id
      LEFT JOIN complaint_photos op ON v.original_photo_id = op.id
      LEFT JOIN complaint_photos cp ON v.completion_photo_id = cp.id
      WHERE v.complaint_id = ?
      ORDER BY v.created_at DESC
    `, [complaint.id]);

    res.json({ complaint_id: req.params.complaintId, verifications });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch verification records.' });
  }
});

module.exports = router;
