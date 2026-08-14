import { useEffect, useState } from 'react';
import { createDeliveryZone, getMyDeliveryZones, updateDeliveryZone, deleteDeliveryZone } from '../api/deliveryZoneApi';
import { Link, Navigate } from 'react-router-dom';

export default function DeliveryZones() {
  const user = JSON.parse(localStorage.getItem('user'));
  const role = user?.role;

  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [form, setForm] = useState({ name: '', location: '', latitude: '', longitude: '', radiusKm: '' });
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (role === 'farmer') loadZones(); }, []);

  const loadZones = async () => {
    setLoading(true);
    try {
      const data = await getMyDeliveryZones();
      setZones(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || form.name.trim() === '') return setError('Name is required');
    setSaving(true);
    try {
      if (editingId) {
        await updateDeliveryZone(editingId, {
          name: form.name,
          location: form.location,
          latitude: form.latitude || null,
          longitude: form.longitude || null,
          radiusKm: form.radiusKm || null,
        });
      } else {
        await createDeliveryZone({
          name: form.name,
          location: form.location,
          latitude: form.latitude || null,
          longitude: form.longitude || null,
          radiusKm: form.radiusKm || null,
        });
      }
      setForm({ name: '', location: '', latitude: '', longitude: '', radiusKm: '' });
      setEditingId(null);
      await loadZones();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (z) => {
    setEditingId(z._id);
    setForm({ name: z.name || '', location: z.location || '', latitude: z.latitude || '', longitude: z.longitude || '', radiusKm: z.radiusKm || '' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this delivery zone?')) return;
    try {
      await deleteDeliveryZone(id);
      await loadZones();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!localStorage.getItem('token')) return <Navigate to="/" replace />;
  if (role !== 'farmer') return <div style={{ padding: 24 }}>Only farmers can manage delivery zones.</div>;

  return (
    <div style={{ maxWidth: 900, margin: '24px auto', padding: 20 }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Delivery Zones</h1>
      <p style={{ color: '#6b7280', marginBottom: 16 }}>Define the areas where you provide delivery. You can optionally set a center (lat/lng) and radius (km).</p>

      <form onSubmit={handleSubmit} style={{ marginBottom: 20, background: '#fff', padding: 16, borderRadius: 8, border: '1px solid #e5e7eb' }}>
        {error && <div style={{ marginBottom: 8, color: 'red' }}>{error}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <input name="name" placeholder="Zone name (e.g., Dhaka North)" value={form.name} onChange={handleChange} />
          <input name="location" placeholder="Location description / district" value={form.location} onChange={handleChange} />
          <input name="latitude" placeholder="Latitude (optional)" value={form.latitude} onChange={handleChange} />
          <input name="longitude" placeholder="Longitude (optional)" value={form.longitude} onChange={handleChange} />
          <input name="radiusKm" placeholder="Radius (km) (optional)" value={form.radiusKm} onChange={handleChange} />
        </div>
        <div style={{ marginTop: 12 }}>
          <button disabled={saving} style={{ padding: '8px 12px', borderRadius: 8, background: '#16a34a', color: '#fff', border: 'none' }}>{editingId ? 'Save Changes' : 'Add Zone'}</button>
          {editingId && <button type="button" onClick={() => { setEditingId(null); setForm({ name: '', location: '', latitude: '', longitude: '', radiusKm: '' }); }} style={{ marginLeft: 8 }}>Cancel</button>}
          <Link to="/" style={{ marginLeft: 12 }}>Back</Link>
        </div>
      </form>

      <div>
        {loading ? (
          <p>Loading zones...</p>
        ) : zones.length === 0 ? (
          <p>No delivery zones defined yet.</p>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {zones.map((z) => (
              <div key={z._id} style={{ background: '#fff', padding: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{z.name}</div>
                    <div style={{ color: '#6b7280', fontSize: 13 }}>{z.location || '—'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleEdit(z)} style={{ padding: '6px 10px' }}>Edit</button>
                    <button onClick={() => handleDelete(z._id)} style={{ padding: '6px 10px', color: '#b91c1c' }}>Delete</button>
                  </div>
                </div>
                <div style={{ marginTop: 8, color: '#374151', fontSize: 13 }}>
                  {z.latitude != null && z.longitude != null ? (
                    <div>Center: {z.latitude}, {z.longitude} • Radius: {z.radiusKm ?? '—'} km</div>
                  ) : (
                    <div>Boundaries: {z.location || 'Not provided'}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
