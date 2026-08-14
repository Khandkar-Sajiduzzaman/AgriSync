import { useEffect, useState } from 'react';
import { getPublicZones, getFarmersInZone } from '../api/deliveryZoneApi';
import { Link } from 'react-router-dom';

export default function DeliveryZonesPublic() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedZone, setSelectedZone] = useState(null);
  const [farmers, setFarmers] = useState([]);
  const [loadingFarmers, setLoadingFarmers] = useState(false);

  useEffect(() => {
    loadZones();
  }, []);

  const loadZones = async () => {
    setLoading(true);
    try {
      const z = await getPublicZones();
      setZones(z);
    } catch (err) {
      console.error('Failed to load zones', err);
    } finally {
      setLoading(false);
    }
  };

  const openZone = async (zone) => {
    setSelectedZone(zone);
    setLoadingFarmers(true);
    try {
      const res = await getFarmersInZone(zone._id);
      setFarmers(res.farmers || []);
    } catch (err) {
      console.error('Failed to load farmers for zone', err);
      setFarmers([]);
    } finally {
      setLoadingFarmers(false);
    }
  };

  const estimateFee = (z) => {
    if (z.radiusKm) return Math.max(20, Math.round(z.radiusKm * 10));
    return 40;
  };

  const estimateTime = (z) => {
    if (z.radiusKm) {
      const min = Math.max(15, Math.round(z.radiusKm * 2));
      const max = Math.max(30, Math.round(z.radiusKm * 4));
      return `${min}-${max} mins`;
    }
    return '30-60 mins';
  };

  return (
    <div style={{ maxWidth: 1000, margin: '24px auto', padding: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Delivery Zones</h1>
        <Link to="/">Back</Link>
      </div>

      {loading ? (
        <p>Loading zones...</p>
      ) : zones.length === 0 ? (
        <p>No delivery zones available.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
          {zones.map((z) => (
            <div key={z._id} style={{ background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #e5e7eb', cursor: 'pointer' }} onClick={() => openZone(z)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{z.name}</div>
                  <div style={{ color: '#6b7280', fontSize: 13 }}>{z.location || '—'}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700 }}>৳{estimateFee(z)}</div>
                  <div style={{ color: '#6b7280', fontSize: 12 }}>{estimateTime(z)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedZone && (
        <div style={{ marginTop: 20 }}>
          <h2>Farmers delivering to {selectedZone.name}</h2>
          {loadingFarmers ? (
            <p>Loading farmers...</p>
          ) : farmers.length === 0 ? (
            <p>No farmers found for this zone.</p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {farmers.map((f) => (
                <div key={f._id} style={{ background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 700 }}>{f.name || 'Farmer'}</div>
                      <div style={{ color: '#6b7280', fontSize: 13 }}>{f.farmName || f.farmLocation || ''}</div>
                    </div>
                    <div>
                      <div style={{ fontWeight: 700 }}>Contact</div>
                      <div style={{ color: '#6b7280', fontSize: 13 }}>{f.phone || '—'}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
