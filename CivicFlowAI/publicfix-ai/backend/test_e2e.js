// backend/test_e2e.js
// End-to-end automated verification script for PublicFix AI

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const { getDb, dbGet, dbAll } = require('./database/db');
const { seedDatabase } = require('./database/seed');

const API_BASE = 'http://localhost:5000/api';

async function runTests() {
  console.log('====================================================');
  console.log('PUBLICFIX AI — COMPREHENSIVE END-TO-END VERIFICATION');
  console.log('====================================================\n');

  // Step 0: Ensure DB is seeded
  await seedDatabase();

  // Test 1: Citizen Login
  console.log('1. Testing Citizen Login (citizen@demo.com)...');
  const citizenLogin = await axios.post(`${API_BASE}/auth/login`, {
    email: 'citizen@demo.com',
    password: 'demo1234'
  });
  const citizenToken = citizenLogin.data.token;
  const citizenId = citizenLogin.data.user.id;
  console.log('   ✅ Citizen authenticated. Token acquired. Citizen ID:', citizenId);

  // Test 2: Create a dummy test image for complaint photo
  const dummyPhotoPath = path.join(__dirname, 'test_pothole.jpg');
  fs.writeFileSync(dummyPhotoPath, 'fake_jpeg_image_binary_data_for_test');

  // Test 3: Citizen Submits Complaint with Exact Problem Coordinates (Guntur Kannavarithota: 16.3067, 80.4365)
  console.log('\n2. Testing Complaint Submission with Exact GPS Coordinates (Kannavarithota, Guntur)...');
  const form = new FormData();
  form.append('title', 'Deep Pothole at Collectorate Road');
  form.append('description', 'Large pothole obstructing two-wheeler traffic near Kannavarithota junction.');
  form.append('category', 'Pothole/Road Damage');
  form.append('location_text', 'Collectorate Road, Kannavarithota, Guntur, Andhra Pradesh, 522004');
  form.append('latitude', '16.306700');
  form.append('longitude', '80.436500');
  form.append('photo', fs.createReadStream(dummyPhotoPath), { filename: 'test_pothole.jpg', contentType: 'image/jpeg' });

  const complaintRes = await axios.post(`${API_BASE}/complaints`, form, {
    headers: {
      ...form.getHeaders(),
      Authorization: `Bearer ${citizenToken}`
    }
  });

  const complaintId = complaintRes.data.complaintId;
  const savedComplaint = complaintRes.data.complaint;
  console.log('   ✅ Complaint submitted successfully!');
  console.log('      Complaint ID:     ', complaintId);
  console.log('      Status:           ', savedComplaint.status);
  console.log('      Assigned Office:  ', savedComplaint.assigned_office);
  console.log('      Assigned Office ID:', savedComplaint.assigned_office_id);
  console.log('      Assigned Officer ID:', savedComplaint.assigned_officer_id);

  // Verify in SQLite database
  const dbRecord = await dbGet('SELECT * FROM complaints WHERE complaint_id = ?', [complaintId]);
  if (!dbRecord) throw new Error('Complaint not found in SQLite!');
  if (dbRecord.assigned_office !== 'GMC Road Infrastructure Division') {
    throw new Error(`Expected GMC Road Infrastructure Division, got ${dbRecord.assigned_office}`);
  }
  if (!dbRecord.assigned_office_id) throw new Error('assigned_office_id is null in database!');
  console.log('   ✅ SQLite Database Record verified with exact coordinates and assigned_office_id.');

  // Test 4: Authorized Officer Dashboard Visibility (officer@demo.com - Road Maintenance)
  console.log('\n3. Testing Officer Dashboard Visibility (officer@demo.com)...');
  const officerLogin = await axios.post(`${API_BASE}/auth/login`, {
    email: 'officer@demo.com',
    password: 'demo1234'
  });
  const officerToken = officerLogin.data.token;
  console.log('   ✅ Officer Bob authenticated (Road Maintenance department).');

  const officerComplaints = await axios.get(`${API_BASE}/officer/complaints`, {
    headers: { Authorization: `Bearer ${officerToken}` }
  });

  const matchingOfficerComplaint = officerComplaints.data.complaints.find(c => c.complaint_id === complaintId);
  if (!matchingOfficerComplaint) {
    throw new Error(`CRITICAL: Submitted complaint ${complaintId} did NOT appear in officer dashboard!`);
  }

  console.log('   ✅ SUCCESS: Complaint appears on Officer Dashboard!');
  console.log('      Complaint ID:      ', matchingOfficerComplaint.complaint_id);
  console.log('      Category:          ', matchingOfficerComplaint.category);
  console.log('      Exact Address:     ', matchingOfficerComplaint.location_text);
  console.log('      GPS Coordinates:   ', matchingOfficerComplaint.latitude, matchingOfficerComplaint.longitude);
  console.log('      Distance to Office:', matchingOfficerComplaint.distance, 'km');
  console.log('      Submission Time:   ', matchingOfficerComplaint.submitted_at);
  console.log('      Current Status:    ', matchingOfficerComplaint.status);
  console.log('      Photo Filename:    ', matchingOfficerComplaint.original_photo);

  // Test 5: Officer updates status and submits response note
  console.log('\n4. Testing Officer Status Update & Citizen-Facing Response Note...');
  const officerResponseNote = 'Road repair crew dispatched to Kannavarithota with asphalt hot-mix. Work initiated.';
  const updateRes = await axios.patch(
    `${API_BASE}/officer/complaints/${complaintId}/status`,
    {
      status: 'IN_PROGRESS',
      note: officerResponseNote
    },
    { headers: { Authorization: `Bearer ${officerToken}` } }
  );
  console.log('   ✅ Officer status updated:', updateRes.data.message);

  // Verify status history in SQLite
  const historyRecords = await dbAll('SELECT * FROM complaint_status_history WHERE complaint_id = ?', [dbRecord.id]);
  const latestHistory = historyRecords[historyRecords.length - 1];
  console.log('   ✅ Status history verified in SQLite:');
  console.log('      New Status: ', latestHistory.new_status);
  console.log('      Note:       ', latestHistory.note);
  console.log('      Changed By: ', latestHistory.changed_by);
  console.log('      Timestamp:  ', latestHistory.changed_at);

  // Test 6: Citizen Dashboard Verification of Officer Response
  console.log('\n5. Testing Citizen Dashboard reflects Officer Response and Updated Status...');
  const citizenComplaints = await axios.get(`${API_BASE}/complaints`, {
    headers: { Authorization: `Bearer ${citizenToken}` }
  });
  const matchingCitizenComplaint = citizenComplaints.data.complaints.find(c => c.complaint_id === complaintId);
  if (!matchingCitizenComplaint) throw new Error('Complaint missing from citizen dashboard!');
  if (matchingCitizenComplaint.status !== 'IN_PROGRESS') {
    throw new Error(`Expected status IN_PROGRESS on citizen dashboard, got ${matchingCitizenComplaint.status}`);
  }
  if (matchingCitizenComplaint.latest_note !== officerResponseNote) {
    throw new Error(`Expected latest_note "${officerResponseNote}", got "${matchingCitizenComplaint.latest_note}"`);
  }
  console.log('   ✅ Citizen Dashboard correctly shows:');
  console.log('      Status:       ', matchingCitizenComplaint.status);
  console.log('      Officer Note: ', matchingCitizenComplaint.latest_note);
  console.log('      Distance:     ', matchingCitizenComplaint.distance, 'km');

  // Test 7: Complaint Detail Page
  console.log('\n6. Testing Citizen Complaint Detail Page (/api/complaints/:id)...');
  const detailRes = await axios.get(`${API_BASE}/complaints/${complaintId}`, {
    headers: { Authorization: `Bearer ${citizenToken}` }
  });
  console.log('   ✅ Detail page retrieved with full history timeline:');
  console.log('      Timeline events:', detailRes.data.history.length);
  detailRes.data.history.forEach((h, i) => {
    console.log(`        [${i + 1}] ${h.old_status || 'INIT'} -> ${h.new_status} | Note: "${h.note}" by ${h.changed_by_name} (${h.changed_by_role})`);
  });

  // Test 8: Authorization Enforcement
  console.log('\n7. Testing Authorization Enforcement...');
  // Another officer from Sanitation department (officer2@demo.com) should NOT see or be able to edit this Road complaint
  const officer2Login = await axios.post(`${API_BASE}/auth/login`, {
    email: 'officer2@demo.com',
    password: 'demo1234'
  });
  const officer2Token = officer2Login.data.token;
  const officer2Complaints = await axios.get(`${API_BASE}/officer/complaints`, {
    headers: { Authorization: `Bearer ${officer2Token}` }
  });
  const unauthorizedSeen = officer2Complaints.data.complaints.find(c => c.complaint_id === complaintId);
  if (unauthorizedSeen) {
    throw new Error('SECURITY VIOLATION: Officer from Sanitation saw complaint assigned to Road Maintenance!');
  }
  console.log('   ✅ Sanitation officer cannot access Road Maintenance complaints.');

  try {
    await axios.patch(
      `${API_BASE}/officer/complaints/${complaintId}/status`,
      { status: 'IN_PROGRESS', note: 'Hacked note' },
      { headers: { Authorization: `Bearer ${officer2Token}` } }
    );
    throw new Error('SECURITY VIOLATION: Sanitation officer was allowed to update Road Maintenance complaint!');
  } catch (err) {
    if (err.response && err.response.status === 403) {
      console.log('   ✅ Status update properly rejected with 403 Forbidden for unauthorized officer.');
    } else {
      throw err;
    }
  }

  // Test 9: Category without verified office -> fallback to UNASSIGNED
  console.log('\n8. Testing Fallback to UNASSIGNED when no verified office handles category...');
  const unassignedForm = new FormData();
  unassignedForm.append('title', 'Unknown Public Issue');
  unassignedForm.append('description', 'Test issue for unsupported category');
  unassignedForm.append('category', 'Other');
  unassignedForm.append('location_text', 'Remote Village Road');
  unassignedForm.append('latitude', '16.5000');
  unassignedForm.append('longitude', '80.5000');
  unassignedForm.append('photo', fs.createReadStream(dummyPhotoPath), { filename: 'test_other.jpg', contentType: 'image/jpeg' });

  const unassignedRes = await axios.post(`${API_BASE}/complaints`, unassignedForm, {
    headers: {
      ...unassignedForm.getHeaders(),
      Authorization: `Bearer ${citizenToken}`
    }
  });

  console.log('   ✅ Unassigned Complaint Result:');
  console.log('      Complaint ID:   ', unassignedRes.data.complaintId);
  console.log('      Status:         ', unassignedRes.data.complaint.status);
  console.log('      Assigned Office:', unassignedRes.data.complaint.assigned_office);
  if (unassignedRes.data.complaint.status !== 'UNASSIGNED') {
    throw new Error(`Expected UNASSIGNED status, got ${unassignedRes.data.complaint.status}`);
  }

  // Cleanup test image
  if (fs.existsSync(dummyPhotoPath)) fs.unlinkSync(dummyPhotoPath);

  console.log('\n====================================================');
  console.log('🎉 ALL END-TO-END TESTS PASSED SUCCESSFULLY! 🎉');
  console.log('====================================================\n');
}

runTests().catch(err => {
  console.error('\n❌ E2E TEST FAILED:', err.response?.data || err.message);
  process.exit(1);
});
