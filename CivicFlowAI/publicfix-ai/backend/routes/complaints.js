const express = require('express');
const crypto = require('crypto');
const { dbRun, dbGet, dbAll } = require('../database/db');
const { authenticate, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { complaintSchema, statusUpdateSchema } = require('../validations/schemas');

const { getOfficeByName, haversine } = require('../helpers/officeLookup');
const router = express.Router();

function generateComplaintId() {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth()+1).padStart(2,'0')}${String(date.getDate()).padStart(2,'0')}`;
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `PF-${ymd}-${rand}`;
}

function calcDelayStatus(dueDate) {
  if (!dueDate) return 'NO_DEADLINE';
  const now = new Date();
  const due = new Date(dueDate);
  const diffDays = (due - now) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return 'OVERDUE';
  if (diffDays <= 2) return 'APPROACHING';
  return 'ON_TRACK';
}

// POST /api/complaints — Submit complaint
router.post('/', authenticate, requireRole('citizen'), upload.single('photo'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'A photograph is required.' });
  }
  const parse = complaintSchema.safeParse(req.body);
  if (!parse.success) {
    return res.status(400).json({ error: 'Validation failed', details: parse.error.flatten().fieldErrors });
  }

  const { title, description, category, location_text, latitude, longitude } = parse.data;

  try {
    // Determine demo routing rule (if any)
    const rule = await dbGet(
      'SELECT * FROM office_routing_rules WHERE category = ? AND is_active = 1 ORDER BY priority DESC LIMIT 1',
      [category]
    );

    // Helper: Haversine distance (km)
    const haversine = (lat1, lon1, lat2, lon2) => {
      const toRad = deg => (deg * Math.PI) / 180;
      const R = 6371;
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
      return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    // Find nearest verified office handling this category
    let nearestOffice = null;
if (latitude && longitude) {
  const offices = await dbAll(
    `SELECT o.id, o.name, o.department, o.latitude, o.longitude FROM offices o
     JOIN office_categories oc ON o.id = oc.office_id
     WHERE oc.category = ? AND o.is_verified = 1`,
    [category]
  );
  if (offices.length) {
    const withDist = offices.map(o => ({
      ...o,
      distance: haversine(latitude, longitude, o.latitude, o.longitude)
    }));
    withDist.sort((a, b) => a.distance - b.distance);
    nearestOffice = withDist[0];
  }
}

// Determine final office and officer assignments
let finalOfficeName = null;
let finalOfficeId = null;
let finalOfficerId = null;
if (nearestOffice) {
  finalOfficeName = nearestOffice.name;
  finalOfficeId = nearestOffice.id;
  // Find an officer in the same department
  const officer = await dbGet(
    `SELECT id FROM users WHERE role = 'officer' AND department = ? LIMIT 1`,
    [nearestOffice.department]
  );
  if (officer) {
    finalOfficerId = officer.id;
  }
}
// Fallback to demo routing rule if no office matched
if (!finalOfficeName && rule) {
  finalOfficeName = rule.office_name;
}
const dueDate = rule
  ? new Date(Date.now() + rule.demo_target_days * 86400000).toISOString()
  : null;

const complaintId = generateComplaintId();

const complaintResult = await dbRun(`
  INSERT INTO complaints (
    complaint_id, title, description, category, location_text, latitude, longitude,
    status, citizen_id, assigned_office, assigned_office_id, assigned_officer_id,
    routing_rule_id, due_date
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, 'SUBMITTED', ?, ?, ?, ?, ?, ?)
`, [
  complaintId,
  title,
  description,
  category,
  location_text,
  latitude || null,
  longitude || null,
  req.user.id,
  finalOfficeName,
  finalOfficeId,
  finalOfficerId,
  rule ? rule.id : null,
  dueDate
]);

    const dbComplaintId = complaintResult.lastID;

    // Save photo
    await dbRun(`
      INSERT INTO complaint_photos (complaint_id, photo_type, filename, original_name, mimetype, size, uploaded_by)
      VALUES (?, 'original', ?, ?, ?, ?, ?)
    `, [dbComplaintId, req.file.filename, req.file.originalname, req.file.mimetype, req.file.size, req.user.id]);

    // Initial status history
    await dbRun(`
      INSERT INTO complaint_status_history (complaint_id, old_status, new_status, changed_by, note)
      VALUES (?, NULL, 'SUBMITTED', ?, 'Complaint submitted by citizen')
    `, [dbComplaintId, req.user.id]);

    // If an office was assigned, update status and add history entry
    if (finalOfficeName) {
      await dbRun(`UPDATE complaints SET status = 'ASSIGNED', updated_at = datetime('now') WHERE id = ?`, [dbComplaintId]);
      await dbRun(`
        INSERT INTO complaint_status_history (complaint_id, old_status, new_status, changed_by, note)
        VALUES (?, 'SUBMITTED', 'ASSIGNED', ?, ?)
      `, [dbComplaintId, req.user.id, `Auto-assigned to ${finalOfficeName}`]);
    }

    const complaint = await dbGet('SELECT * FROM complaints WHERE id = ?', [dbComplaintId]);
    res.status(201).json({
      message: 'Complaint submitted successfully.',
      complaintId: complaint.complaint_id,
      complaint
    });
  } catch (err) {
    console.error('Submit complaint error:', err);
    res.status(500).json({ error: 'Failed to submit complaint.' });
  }
});

// GET /api/complaints — List complaints
router.get('/', authenticate, async (req, res) => {
  try {
    let complaints;
    if (req.user.role === 'citizen') {
      complaints = await dbAll(`
        SELECT c.*, u.name as officer_name,
          (SELECT filename FROM complaint_photos WHERE complaint_id = c.id AND photo_type = 'original' ORDER BY id LIMIT 1) as original_photo
        FROM complaints c
        LEFT JOIN users u ON c.assigned_officer_id = u.id
        WHERE c.citizen_id = ?
        ORDER BY c.submitted_at DESC
      `, [req.user.id]);
    } else if (req.user.role === 'officer') {
      complaints = await dbAll(`
        SELECT c.*, u.name as citizen_name,
          (SELECT filename FROM complaint_photos WHERE complaint_id = c.id AND photo_type = 'original' ORDER BY id LIMIT 1) as original_photo,
          u.email as citizen_email
        FROM complaints c
        LEFT JOIN users u ON c.citizen_id = u.id
        WHERE c.assigned_officer_id = ?
        ORDER BY c.submitted_at DESC
      `, [req.user.id]);
    } else {
      complaints = await dbAll(`
        SELECT c.*, cu.name as citizen_name, ou.name as officer_name,
          (SELECT filename FROM complaint_photos WHERE complaint_id = c.id AND photo_type = 'original' ORDER BY id LIMIT 1) as original_photo
        FROM complaints c
        LEFT JOIN users cu ON c.citizen_id = cu.id
        LEFT JOIN users ou ON c.assigned_officer_id = ou.id
        ORDER BY c.submitted_at DESC
      `);
    }

    // Enrich complaints with delay status and (if possible) distance to assigned office
complaints = await Promise.all(
  complaints.map(async c => {
    const base = { ...c, delay_status: calcDelayStatus(c.due_date) };
    if (c.assigned_office && c.latitude != null && c.longitude != null) {
      const office = await getOfficeByName(c.assigned_office);
      if (office) {
        const dist = haversine(c.latitude, c.longitude, office.latitude, office.longitude);
        base.distance = Math.round(dist * 100) / 100; // km, two decimals
      }
    }
    return base;
  })
);
    res.json({ complaints });
  } catch (err) {
    console.error('List complaints error:', err);
    res.status(500).json({ error: 'Failed to fetch complaints.' });
  }
});

// GET /api/complaints/:complaintId — Complaint details
router.get('/:complaintId', authenticate, async (req, res) => {
  try {
    const complaint = await dbGet(`
      SELECT c.*, cu.name as citizen_name, cu.email as citizen_email, ou.name as officer_name
      FROM complaints c
      LEFT JOIN users cu ON c.citizen_id = cu.id
      LEFT JOIN users ou ON c.assigned_officer_id = ou.id
      WHERE c.complaint_id = ?
    `, [req.params.complaintId]);

    if (!complaint) return res.status(404).json({ error: 'Complaint not found.' });

    if (req.user.role === 'citizen' && complaint.citizen_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const photos = await dbAll('SELECT * FROM complaint_photos WHERE complaint_id = ? ORDER BY uploaded_at ASC', [complaint.id]);
    const history = await dbAll(`
      SELECT h.*, u.name as changed_by_name, u.role as changed_by_role
      FROM complaint_status_history h
      LEFT JOIN users u ON h.changed_by = u.id
      WHERE h.complaint_id = ?
      ORDER BY h.changed_at ASC
    `, [complaint.id]);
    const verification = await dbGet(`
      SELECT v.*, u.name as human_action_by_name
      FROM verification_records v
      LEFT JOIN users u ON v.human_action_by = u.id
      WHERE v.complaint_id = ?
      ORDER BY v.created_at DESC LIMIT 1
    `, [complaint.id]);

    // Compute distance to assigned office (if any)
    let distance = null;
    if (complaint.assigned_office && complaint.latitude != null && complaint.longitude != null) {
      const office = await getOfficeByName(complaint.assigned_office);
      if (office) {
        distance = Math.round(haversine(complaint.latitude, complaint.longitude, office.latitude, office.longitude) * 100) / 100;
      }
    }

    res.json({
      complaint: { ...complaint, delay_status: calcDelayStatus(complaint.due_date), distance },
      photos,
      history,
      verification: verification || null
    });
  } catch (err) {
    console.error('Get complaint error:', err);
    res.status(500).json({ error: 'Failed to fetch complaint.' });
  }
});

module.exports = router;
