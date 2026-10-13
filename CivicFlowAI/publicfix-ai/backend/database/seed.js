// backend/database/seed.js
// Demo data seeding script for PublicFix AI backend

const bcrypt = require('bcryptjs');
const { dbRun, dbGet, initializeDatabase } = require('./db');

/**
 * Seed the database with demo data (offices, categories, users, routing rules).
 * This function is invoked during server startup.
 */
async function seedDatabase() {
  // Ensure schema exists
  await initializeDatabase();

  // ---- Offices ----
  const offices = [
    { name: 'Road Maintenance Office', department: 'Road Maintenance', latitude: 12.9716, longitude: 77.5946, address: '123 Road St', is_verified: 1 },
    { name: 'Sanitation Department', department: 'Sanitation', latitude: 12.9722, longitude: 77.5950, address: '456 Clean Ave', is_verified: 1 },
    { name: 'Water and Sewerage Board', department: 'Water and Sewerage', latitude: 12.9730, longitude: 77.5960, address: '789 Water Rd', is_verified: 1 }
  ];
  for (const office of offices) {
    const exists = await dbGet('SELECT id FROM offices WHERE name = ?', [office.name]);
    if (!exists) {
      await dbRun(
        'INSERT INTO offices (name, department, latitude, longitude, is_verified, address) VALUES (?, ?, ?, ?, ?, ?)',
        [office.name, office.department, office.latitude, office.longitude, office.is_verified, office.address]
      );
    }
  }
  console.log('✅ Demo offices seeded.');

  // ---- Office ↔ Category mapping ----
  const officeCategoryMap = [
    { officeName: 'Road Maintenance Office', categories: ['Pothole/Road Damage'] },
    { officeName: 'Sanitation Department', categories: ['Garbage'] },
    { officeName: 'Water and Sewerage Board', categories: ['Water Leakage', 'Drainage'] }
  ];
  for (const map of officeCategoryMap) {
    const office = await dbGet('SELECT id FROM offices WHERE name = ?', [map.officeName]);
    if (office) {
      for (const cat of map.categories) {
        const exists = await dbGet('SELECT 1 FROM office_categories WHERE office_id = ? AND category = ?', [office.id, cat]);
        if (!exists) {
          await dbRun('INSERT INTO office_categories (office_id, category) VALUES (?, ?)', [office.id, cat]);
        }
      }
    }
  }
  console.log('✅ Demo office categories seeded.');

  // ---- Users ----
  const users = [
    { name: 'Alice Citizen', email: 'citizen@demo.com', password: 'demo1234', role: 'citizen', department: null },
    { name: 'Bob Officer', email: 'officer@demo.com', password: 'demo1234', role: 'officer', department: 'Road Maintenance' },
    { name: 'Carol Admin', email: 'admin@demo.com', password: 'demo1234', role: 'admin', department: 'Administration' },
    { name: 'Dave Sanitation', email: 'officer2@demo.com', password: 'demo1234', role: 'officer', department: 'Sanitation' }
  ];
  for (const user of users) {
    const exists = await dbGet('SELECT id FROM users WHERE email = ?', [user.email]);
    if (!exists) {
      const hash = bcrypt.hashSync(user.password, 10);
      await dbRun(
        'INSERT INTO users (name, email, password_hash, role, department) VALUES (?, ?, ?, ?, ?)',
        [user.name, user.email, hash, user.role, user.department]
      );
    }
  }
  console.log('✅ Demo users seeded.');

  // ---- Routing Rules ----
  const rules = [
    { category: 'Pothole/Road Damage', office_name: 'Road Maintenance Office', department: 'Road Maintenance', priority: 1, demo_target_days: 7 },
    { category: 'Garbage', office_name: 'Sanitation Department', department: 'Sanitation', priority: 1, demo_target_days: 3 },
    { category: 'Water Leakage', office_name: 'Water and Sewerage Board', department: 'Water Sewerage', priority: 1, demo_target_days: 5 },
    { category: 'Drainage', office_name: 'Water and Sewerage Board', department: 'Water Sewerage', priority: 1, demo_target_days: 5 },
    { category: 'Streetlight', office_name: 'Electrical Maintenance Division', department: 'Electrical Maintenance', priority: 1, demo_target_days: 4 },
    { category: 'Other', office_name: 'General Municipal Office', department: 'Administration', priority: 1, demo_target_days: 10 }
  ];
  for (const rule of rules) {
    const exists = await dbGet('SELECT id FROM office_routing_rules WHERE category = ?', [rule.category]);
    if (!exists) {
      await dbRun(
        'INSERT INTO office_routing_rules (category, office_name, department, priority, demo_target_days, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [rule.category, rule.office_name, rule.department, rule.priority, rule.demo_target_days, 'DEMO: Example mapping only - not official']
      );
    }
  }
  console.log('✅ Demo routing rules seeded.');

  // ---- Show demo credentials ----
  console.log('\n🎯 Demo Accounts:');
  console.log('  Citizen:  citizen@demo.com  / demo1234');
  console.log('  Officer:  officer@demo.com  / demo1234 (Road Maintenance)');
  console.log('  Officer2: officer2@demo.com / demo1234 (Sanitation)');
  console.log('  Admin:    admin@demo.com    / demo1234');
}

module.exports = { seedDatabase };

