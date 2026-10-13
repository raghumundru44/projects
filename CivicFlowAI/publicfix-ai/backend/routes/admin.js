const express = require('express');
const { dbRun, dbGet, dbAll } = require('../database/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { routingRuleSchema } = require('../validations/schemas');

const router = express.Router();

// GET /api/admin/routing-rules
router.get('/routing-rules', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const rules = await dbAll('SELECT * FROM office_routing_rules ORDER BY category, priority DESC');
    res.json({ rules });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch routing rules.' });
  }
});

// POST /api/admin/routing-rules
router.post('/routing-rules', authenticate, requireRole('admin'), async (req, res) => {
  const parse = routingRuleSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Validation failed', details: parse.error.flatten().fieldErrors });
  }
  const { category, area_pattern, office_name, department, priority, demo_target_days, notes } = parse.data;
  try {
    const result = await dbRun(
      'INSERT INTO office_routing_rules (category, area_pattern, office_name, department, priority, demo_target_days, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [category, area_pattern || null, office_name, department, priority, demo_target_days, notes || null]
    );
    res.status(201).json({ message: 'Routing rule created.', id: result.lastID });
  } catch (err) {
    console.error('Create rule error:', err);
    res.status(500).json({ error: 'Failed to create routing rule.' });
  }
});

// PATCH /api/admin/routing-rules/:id
router.patch('/routing-rules/:id', authenticate, requireRole('admin'), async (req, res) => {
  const parse = routingRuleSchema.partial().safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Validation failed', details: parse.error.flatten().fieldErrors });
  }
  try {
    const rule = await dbGet('SELECT * FROM office_routing_rules WHERE id = ?', [req.params.id]);
    if (!rule) return res.status(404).json({ error: 'Routing rule not found.' });

    const updated = { ...rule, ...parse.data };
    await dbRun(
      `UPDATE office_routing_rules SET category=?, area_pattern=?, office_name=?, department=?, priority=?, demo_target_days=?, notes=?, updated_at=datetime('now') WHERE id=?`,
      [updated.category, updated.area_pattern, updated.office_name, updated.department, updated.priority, updated.demo_target_days, updated.notes, rule.id]
    );
    res.json({ message: 'Routing rule updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update routing rule.' });
  }
});

// DELETE /api/admin/routing-rules/:id
router.delete('/routing-rules/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const result = await dbRun('DELETE FROM office_routing_rules WHERE id = ?', [req.params.id]);
    if (result.changes === 0) return res.status(404).json({ error: 'Routing rule not found.' });
    res.json({ message: 'Routing rule deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete routing rule.' });
  }
});

// GET /api/admin/complaints
router.get('/complaints', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const complaints = await dbAll(`
      SELECT c.*, cu.name as citizen_name, ou.name as officer_name
      FROM complaints c
      LEFT JOIN users cu ON c.citizen_id = cu.id
      LEFT JOIN users ou ON c.assigned_officer_id = ou.id
      ORDER BY c.submitted_at DESC
    `);
    res.json({ complaints });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch complaints.' });
  }
});

// GET /api/admin/officers
router.get('/officers', authenticate, requireRole('admin'), async (req, res) => {
  try {
    const officers = await dbAll('SELECT id, name, email, department FROM users WHERE role = ?', ['officer']);
    res.json({ officers });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch officers.' });
  }
});

// PATCH /api/admin/complaints/:complaintId/assign
router.patch('/complaints/:complaintId/assign', authenticate, requireRole('admin'), async (req, res) => {
  const { officer_id } = req.body;
  if (!officer_id) return res.status(400).json({ error: 'officer_id required.' });
  try {
    const complaint = await dbGet('SELECT * FROM complaints WHERE complaint_id = ?', [req.params.complaintId]);
    if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });

    const officer = await dbGet('SELECT * FROM users WHERE id = ? AND role = ?', [officer_id, 'officer']);
    if (!officer) return res.status(404).json({ error: 'Officer not found.' });

    await dbRun(`UPDATE complaints SET assigned_officer_id = ?, status = 'ASSIGNED', updated_at = datetime('now') WHERE id = ?`, [officer_id, complaint.id]);
    await dbRun(`
      INSERT INTO complaint_status_history (complaint_id, old_status, new_status, changed_by, note)
      VALUES (?, ?, 'ASSIGNED', ?, ?)
    `, [complaint.id, complaint.status, req.user.id, `Assigned to ${officer.name} by admin`]);

    res.json({ message: 'Officer assigned.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign officer.' });
  }
});

module.exports = router;
