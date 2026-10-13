const { dbAll, dbGet } = require('../database/db');

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
let officeCache = {};

function haversine(lat1, lon1, lat2, lon2) {
  const toRad = deg => (deg * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function getOfficesByCategory(category) {
  const now = Date.now();
  if (officeCache[category] && officeCache[category].expires > now) {
    return officeCache[category].offices;
  }
  const offices = await dbAll(
    `SELECT o.id, o.name, o.latitude, o.longitude FROM offices o
     JOIN office_categories oc ON o.id = oc.office_id
     WHERE oc.category = ? AND o.is_verified = 1`,
    [category]
  );
  officeCache[category] = { offices, expires: now + CACHE_TTL };
  return offices;
}

async function getNearestOffice(category, lat, lon) {
  const offices = await getOfficesByCategory(category);
  if (!offices.length) return null;
  const withDist = offices.map(o => ({
    ...o,
    distance: haversine(lat, lon, o.latitude, o.longitude)
  }));
  withDist.sort((a, b) => a.distance - b.distance);
  return withDist[0];
}

async function getOfficeByName(name) {
  if (!name) return null;
  return await dbGet(`SELECT id, name, latitude, longitude FROM offices WHERE name = ?`, [name]);
}

module.exports = { haversine, getNearestOffice, getOfficeByName };
