const prisma = require('../config/db');

const withId = (obj) => (obj ? { ...obj, _id: obj.id } : obj);

// Helper: find farmerProfile by logged-in user id
const getFarmerProfileForUser = async (userId) => {
  return await prisma.farmerProfile.findUnique({ where: { userId } });
};

// Create delivery zone (farmer only)
const createDeliveryZone = async (req, res) => {
  try {
    if (req.user.role !== 'farmer') return res.status(403).json({ message: 'Only farmers can create delivery zones' });

    const farmerProfile = await getFarmerProfileForUser(req.user.id);
    if (!farmerProfile) return res.status(404).json({ message: 'Farmer profile not found' });

    const { name, location, latitude, longitude, radiusKm } = req.body;
    if (!name || name.trim().length === 0) return res.status(400).json({ message: 'Zone name is required' });

    const zone = await prisma.deliveryZone.create({
      data: {
        farmerId: farmerProfile.id,
        name: name.trim(),
        location: location ? location.trim() : null,
        latitude: latitude !== undefined ? Number(latitude) : null,
        longitude: longitude !== undefined ? Number(longitude) : null,
        radiusKm: radiusKm !== undefined ? Number(radiusKm) : null,
      },
    });

    res.status(201).json(withId(zone));
  } catch (error) {
    console.error('Create delivery zone error:', error);
    res.status(500).json({ message: 'Failed to create delivery zone' });
  }
};

// Get logged-in farmer's delivery zones
const getMyDeliveryZones = async (req, res) => {
  try {
    if (req.user.role !== 'farmer') return res.status(403).json({ message: 'Only farmers can view their delivery zones' });

    const farmerProfile = await getFarmerProfileForUser(req.user.id);
    if (!farmerProfile) return res.status(404).json({ message: 'Farmer profile not found' });

    const zones = await prisma.deliveryZone.findMany({ where: { farmerId: farmerProfile.id }, orderBy: { createdAt: 'desc' } });
    res.json(zones.map(withId));
  } catch (error) {
    console.error('Get my delivery zones error:', error);
    res.status(500).json({ message: 'Failed to load delivery zones' });
  }
};

// Update a delivery zone
const updateDeliveryZone = async (req, res) => {
  try {
    if (req.user.role !== 'farmer') return res.status(403).json({ message: 'Only farmers can update delivery zones' });

    const { id } = req.params;
    const { name, location, latitude, longitude, radiusKm } = req.body;

    const zone = await prisma.deliveryZone.findUnique({ where: { id } });
    if (!zone) return res.status(404).json({ message: 'Delivery zone not found' });

    const farmerProfile = await getFarmerProfileForUser(req.user.id);
    if (!farmerProfile) return res.status(404).json({ message: 'Farmer profile not found' });

    if (zone.farmerId !== farmerProfile.id) return res.status(403).json({ message: 'Not authorized to modify this delivery zone' });

    const data = {};
    if (name !== undefined) data.name = name.trim();
    if (location !== undefined) data.location = location ? location.trim() : null;
    if (latitude !== undefined) data.latitude = latitude !== null ? Number(latitude) : null;
    if (longitude !== undefined) data.longitude = longitude !== null ? Number(longitude) : null;
    if (radiusKm !== undefined) data.radiusKm = radiusKm !== null ? Number(radiusKm) : null;

    const updated = await prisma.deliveryZone.update({ where: { id }, data });
    res.json(withId(updated));
  } catch (error) {
    console.error('Update delivery zone error:', error);
    res.status(500).json({ message: 'Failed to update delivery zone' });
  }
};

// Delete a delivery zone
const deleteDeliveryZone = async (req, res) => {
  try {
    if (req.user.role !== 'farmer') return res.status(403).json({ message: 'Only farmers can delete delivery zones' });

    const { id } = req.params;
    const zone = await prisma.deliveryZone.findUnique({ where: { id } });
    if (!zone) return res.status(404).json({ message: 'Delivery zone not found' });

    const farmerProfile = await getFarmerProfileForUser(req.user.id);
    if (!farmerProfile) return res.status(404).json({ message: 'Farmer profile not found' });

    if (zone.farmerId !== farmerProfile.id) return res.status(403).json({ message: 'Not authorized to delete this delivery zone' });

    await prisma.deliveryZone.delete({ where: { id } });
    res.json({ message: 'Delivery zone deleted' });
  } catch (error) {
    console.error('Delete delivery zone error:', error);
    res.status(500).json({ message: 'Failed to delete delivery zone' });
  }
};

// Haversine distance (km)
const haversineKm = (lat1, lon1, lat2, lon2) => {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371; // Earth radius km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Check whether a farmer delivers to a given location
// Query params: farmerUserId (optional), lat,lng OR location (string) optional
// If no query params provided, return public list of all zones (with farmer info)
const checkDeliveryCoverage = async (req, res) => {
  try {
    const { farmerUserId, lat, lng, location } = req.query;

    // No params: return public list of zones with farmer info
    if (!farmerUserId && !lat && !lng && !location) {
      const zones = await prisma.deliveryZone.findMany({
        include: { farmer: { include: { user: true } } },
        orderBy: { createdAt: 'desc' },
      });

      const shaped = zones.map((z) => ({
        ...withId(z),
        farmer: z.farmer
          ? {
              _id: z.farmer.userId,
              name: z.farmer.user?.name || null,
              profileImage: z.farmer.user?.profileImage || null,
              phone: z.farmer.user?.phone || null,
              farmName: z.farmer.farmName || null,
              farmLocation: z.farmer.farmLocation || null,
            }
          : null,
      }));

      return res.json({ delivers: shaped.length > 0, zones: shaped });
    }

    // If a farmerUserId is provided, check only that farmer's zones
    if (!farmerUserId) return res.status(400).json({ message: 'farmerUserId is required when checking a specific farmer' });

    const farmerProfile = await prisma.farmerProfile.findUnique({ where: { userId: farmerUserId } });
    if (!farmerProfile) return res.status(404).json({ message: 'Farmer not found' });

    const zones = await prisma.deliveryZone.findMany({ where: { farmerId: farmerProfile.id } });

    if (lat && lng) {
      const latNum = Number(lat);
      const lngNum = Number(lng);
      for (const z of zones) {
        if (z.latitude != null && z.longitude != null && z.radiusKm != null) {
          const d = haversineKm(latNum, lngNum, z.latitude, z.longitude);
          if (d <= z.radiusKm) return res.json({ delivers: true, matchedZone: withId(z) });
        }
      }
      return res.json({ delivers: false, matchedZone: null });
    }

    if (location) {
      const q = location.toLowerCase();
      for (const z of zones) {
        if (z.location && z.location.toLowerCase().includes(q)) return res.json({ delivers: true, matchedZone: withId(z) });
        if (z.name && z.name.toLowerCase().includes(q)) return res.json({ delivers: true, matchedZone: withId(z) });
      }
      return res.json({ delivers: false, matchedZone: null });
    }

    // If no lat/location provided but farmerUserId given, return their zones
    return res.json({ delivers: zones.length > 0, zones: zones.map(withId) });
  } catch (error) {
    console.error('Check delivery coverage error:', error);
    res.status(500).json({ message: 'Failed to check delivery coverage' });
  }
};

// Get farmers who deliver to the same zone or overlapping areas
const getFarmersInZone = async (req, res) => {
  try {
    const { id } = req.params;
    const zone = await prisma.deliveryZone.findUnique({ where: { id } });
    if (!zone) return res.status(404).json({ message: 'Zone not found' });

    // Load all zones with farmer profile and user
    const allZones = await prisma.deliveryZone.findMany({ include: { farmer: { include: { user: true } } } });

    const matched = [];
    const qName = zone.name ? zone.name.toLowerCase() : null;
    const qLoc = zone.location ? zone.location.toLowerCase() : null;

    for (const z of allZones) {
      let isMatch = false;
      if (qName && z.name && z.name.toLowerCase().includes(qName)) isMatch = true;
      if (!isMatch && qLoc && z.location && z.location.toLowerCase().includes(qLoc)) isMatch = true;

      // Check spatial overlap if both have centers
      if (!isMatch && zone.latitude != null && zone.longitude != null && zone.radiusKm != null && z.latitude != null && z.longitude != null && z.radiusKm != null) {
        const d = haversineKm(zone.latitude, zone.longitude, z.latitude, z.longitude);
        if (d <= (zone.radiusKm + z.radiusKm)) isMatch = true; // overlap
      }

      if (isMatch) {
        // Avoid duplicates by farmerProfile id
        if (!matched.find((m) => m.farmerId === z.farmerId)) {
          matched.push({
            farmerId: z.farmerId,
            farmerProfile: z.farmer, // contains farmer profile fields and user
          });
        }
      }
    }

    // Map to cleaner farmer objects
    const farmers = matched.map((m) => {
      const fp = m.farmerProfile;
      return {
        _id: fp.user?.id || fp.userId,
        name: fp.user?.name || null,
        profileImage: fp.user?.profileImage || null,
        phone: fp.user?.phone || null,
        farmName: fp.farmName || null,
        farmLocation: fp.farmLocation || null,
        averageRating: fp.averageRating || 0,
      };
    });

    res.json({ zone: withId(zone), farmers });
  } catch (error) {
    console.error('Get farmers in zone error:', error);
    res.status(500).json({ message: 'Failed to load farmers for zone' });
  }
};

module.exports = {
  createDeliveryZone,
  getMyDeliveryZones,
  updateDeliveryZone,
  deleteDeliveryZone,
  checkDeliveryCoverage,
  getFarmersInZone,
};
