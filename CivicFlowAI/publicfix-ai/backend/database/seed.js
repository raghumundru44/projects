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
    // Guntur Municipal Corporation (GMC) Verified Offices
    { name: 'GMC Road Infrastructure Division', department: 'Road Maintenance', latitude: 16.3067, longitude: 80.4365, address: 'GMC Main Building, Kannavarithota, Guntur, AP 522004', is_verified: 1 },
    { name: 'GMC Public Health & Sanitation Department', department: 'Sanitation', latitude: 16.3021, longitude: 80.4412, address: 'Municipal Complex, Old Club Road, Kothapeta, Guntur, AP 522001', is_verified: 1 },
    { name: 'GMC Water Works & Sewerage Department', department: 'Water and Sewerage', latitude: 16.3115, longitude: 80.4328, address: 'Water Works Compound, Sangadigunta, Guntur, AP 522003', is_verified: 1 },
    { name: 'GMC Electrical & Streetlighting Wing', department: 'Electrical Maintenance', latitude: 16.2950, longitude: 80.4285, address: 'GMC Operations Centre, Gujjanagundla, Guntur, AP 522006', is_verified: 1 },
    // Bangalore Municipal Offices
    { name: 'BBMP Road Infrastructure Division', department: 'Road Maintenance', latitude: 12.9716, longitude: 77.5946, address: 'Hudson Circle, Corporation Building, Bangalore 560002', is_verified: 1 },
    { name: 'BBMP Solid Waste Management (Sanitation)', department: 'Sanitation', latitude: 12.9722, longitude: 77.5950, address: 'Corporation Circle, Bangalore 560002', is_verified: 1 },
    { name: 'BWSSB Water Supply & Sewerage Board', department: 'Water and Sewerage', latitude: 12.9730, longitude: 77.5960, address: 'Cauvery Bhavan, KG Road, Bangalore 560009', is_verified: 1 },
    { name: 'BESCOM & BBMP Electrical Division', department: 'Electrical Maintenance', latitude: 12.9695, longitude: 77.5890, address: 'NR Square, Bangalore 560002', is_verified: 1 },
    // Existing aliases for backward compatibility
    { name: 'Road Maintenance Office', department: 'Road Maintenance', latitude: 12.9716, longitude: 77.5946, address: '123 Road St, Bangalore', is_verified: 1 },
    { name: 'Sanitation Department', department: 'Sanitation', latitude: 12.9722, longitude: 77.5950, address: '456 Clean Ave, Bangalore', is_verified: 1 },
    { name: 'Water and Sewerage Board', department: 'Water and Sewerage', latitude: 12.9730, longitude: 77.5960, address: '789 Water Rd, Bangalore', is_verified: 1 }
  ];
  for (const office of offices) {
    const exists = await dbGet('SELECT id FROM offices WHERE name = ?', [office.name]);
    if (!exists) {
      await dbRun(
        'INSERT INTO offices (name, department, latitude, longitude, is_verified, address) VALUES (?, ?, ?, ?, ?, ?)',
        [office.name, office.department, office.latitude, office.longitude, office.is_verified, office.address]
      );
    } else {
      // Update coordinates/address if needed
      await dbRun(
        'UPDATE offices SET department = ?, latitude = ?, longitude = ?, is_verified = ?, address = ? WHERE id = ?',
        [office.department, office.latitude, office.longitude, office.is_verified, office.address, exists.id]
      );
    }
  }
  console.log('✅ Verified municipal offices seeded.');

  // ---- Office ↔ Category mapping ----
  const officeCategoryMap = [
    { officeName: 'GMC Road Infrastructure Division', categories: ['Pothole/Road Damage'] },
    { officeName: 'GMC Public Health & Sanitation Department', categories: ['Garbage'] },
    { officeName: 'GMC Water Works & Sewerage Department', categories: ['Water Leakage', 'Drainage'] },
    { officeName: 'GMC Electrical & Streetlighting Wing', categories: ['Streetlight'] },
    { officeName: 'BBMP Road Infrastructure Division', categories: ['Pothole/Road Damage'] },
    { officeName: 'BBMP Solid Waste Management (Sanitation)', categories: ['Garbage'] },
    { officeName: 'BWSSB Water Supply & Sewerage Board', categories: ['Water Leakage', 'Drainage'] },
    { officeName: 'BESCOM & BBMP Electrical Division', categories: ['Streetlight'] },
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
    { name: 'Dave Sanitation', email: 'officer2@demo.com', password: 'demo1234', role: 'officer', department: 'Sanitation' },
    { name: 'Wendy Water', email: 'water.officer@demo.com', password: 'demo1234', role: 'officer', department: 'Water and Sewerage' },
    { name: 'Eli Electric', email: 'electric.officer@demo.com', password: 'demo1234', role: 'officer', department: 'Electrical Maintenance' },
    { name: 'Carol Admin', email: 'admin@demo.com', password: 'demo1234', role: 'admin', department: 'Administration' }
  ];
  for (const user of users) {
    const exists = await dbGet('SELECT id FROM users WHERE email = ?', [user.email]);
    if (!exists) {
      const hash = bcrypt.hashSync(user.password, 10);
      await dbRun(
        'INSERT INTO users (name, email, password_hash, role, department) VALUES (?, ?, ?, ?, ?)',
        [user.name, user.email, hash, user.role, user.department]
      );
    } else {
      // Ensure department is updated
      if (user.department) {
        await dbRun('UPDATE users SET department = ? WHERE id = ?', [user.department, exists.id]);
      }
    }
  }
  console.log('✅ Demo users seeded.');

  // ---- Routing Rules ----
  const rules = [
    { category: 'Pothole/Road Damage', office_name: 'GMC Road Infrastructure Division', department: 'Road Maintenance', priority: 1, demo_target_days: 7 },
    { category: 'Garbage', office_name: 'GMC Public Health & Sanitation Department', department: 'Sanitation', priority: 1, demo_target_days: 3 },
    { category: 'Water Leakage', office_name: 'GMC Water Works & Sewerage Department', department: 'Water and Sewerage', priority: 1, demo_target_days: 5 },
    { category: 'Drainage', office_name: 'GMC Water Works & Sewerage Department', department: 'Water and Sewerage', priority: 1, demo_target_days: 5 },
    { category: 'Streetlight', office_name: 'GMC Electrical & Streetlighting Wing', department: 'Electrical Maintenance', priority: 1, demo_target_days: 4 },
    { category: 'Other', office_name: 'General Municipal Administration', department: 'Administration', priority: 1, demo_target_days: 10 }
  ];
  for (const rule of rules) {
    const exists = await dbGet('SELECT id FROM office_routing_rules WHERE category = ?', [rule.category]);
    if (!exists) {
      await dbRun(
        'INSERT INTO office_routing_rules (category, office_name, department, priority, demo_target_days, notes) VALUES (?, ?, ?, ?, ?, ?)',
        [rule.category, rule.office_name, rule.department, rule.priority, rule.demo_target_days, 'Verified municipal routing rule']
      );
    }
  }
  console.log('✅ Demo routing rules seeded.');

  // ---- Show demo credentials ----
  console.log('\n🎯 Demo Accounts:');
  console.log('  Citizen:           citizen@demo.com          / demo1234');
  console.log('  Officer (Roads):   officer@demo.com          / demo1234 (Road Maintenance)');
  console.log('  Officer (Sanit):   officer2@demo.com         / demo1234 (Sanitation)');
  console.log('  Officer (Water):   water.officer@demo.com    / demo1234 (Water and Sewerage)');
  console.log('  Officer (Elect):   electric.officer@demo.com / demo1234 (Electrical Maintenance)');
  console.log('  Admin:             admin@demo.com            / demo1234');
}

module.exports = { seedDatabase };

