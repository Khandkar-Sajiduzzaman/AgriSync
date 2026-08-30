import { useEffect, useState } from 'react';
import { getMyProducts } from '../api/productApi';
import { getMyOffers, submitOffer } from '../api/offerApi';

const fieldStyle = { padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 8, width: '100%', boxSizing: 'border-box' };

function OfferRequestsPage() {
  const [products, setProducts] = useState([]);
  const [offers, setOffers] = useState([]);
  const [form, setForm] = useState({ productId: '', title: '', description: '', discountPercent: '', discountAmount: '', minOrderAmount: '', startDate: '', endDate: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const [myProducts, myOffers] = await Promise.all([getMyProducts(), getMyOffers()]);
      setProducts(myProducts || []); setOffers(myOffers || []);
      if (myProducts?.[0]) setForm((current) => ({ ...current, productId: myProducts[0]._id }));
    } catch (error) { setMessage(error.message); } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);
  const change = (event) => setForm({ ...form, [event.target.name]: event.target.value });
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setMessage('');
    try { await submitOffer({ ...form, discountPercent: form.discountPercent || null, discountAmount: form.discountAmount || null, minOrderAmount: form.minOrderAmount || null }); setMessage('Offer request submitted for admin review.'); setForm({ ...form, title: '', description: '', discountPercent: '', discountAmount: '', minOrderAmount: '', startDate: '', endDate: '' }); setOffers(await getMyOffers()); }
    catch (error) { setMessage(error.message); } finally { setSaving(false); }
  };
  if (loading) return <div style={{ padding: 24 }}>Loading offer requests...</div>;
  return <div style={{ maxWidth: 1100, margin: '40px auto', padding: '0 20px' }}>
    <h2>Promotional Offer Requests</h2><p style={{ color: '#4b5563' }}>Submit a promotion for one of your products. An admin must approve it before buyers can see it.</p>
    {message && <div style={{ padding: 12, margin: '16px 0', background: '#ecfdf5', color: '#065f46', borderRadius: 8 }}>{message}</div>}
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(350px, 1.2fr)', gap: 24 }}>
      <form onSubmit={submit} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, display: 'grid', gap: 14 }}>
        <h3 style={{ margin: 0 }}>New Request</h3>
        <label>Product<select name="productId" value={form.productId} onChange={change} style={fieldStyle} required>{products.map((product) => <option key={product._id} value={product._id}>{product.name}</option>)}</select></label>
        <label>Title<input name="title" value={form.title} onChange={change} style={fieldStyle} required /></label>
        <label>Description<textarea name="description" value={form.description} onChange={change} rows="3" style={fieldStyle} required /></label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><label>Discount %<input name="discountPercent" type="number" min="1" max="100" value={form.discountPercent} onChange={change} style={fieldStyle} /></label><label>Fixed discount<input name="discountAmount" type="number" min="0.01" step="0.01" value={form.discountAmount} onChange={change} style={fieldStyle} /></label></div>
        <label>Minimum order amount<input name="minOrderAmount" type="number" min="0" step="0.01" value={form.minOrderAmount} onChange={change} style={fieldStyle} /></label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}><label>Starts<input name="startDate" type="datetime-local" value={form.startDate} onChange={change} style={fieldStyle} required /></label><label>Ends<input name="endDate" type="datetime-local" value={form.endDate} onChange={change} style={fieldStyle} required /></label></div>
        <button type="submit" disabled={saving || products.length === 0} style={{ padding: 12, background: '#2e7d32', color: '#fff', border: 0, borderRadius: 8, fontWeight: 600 }}>{saving ? 'Submitting...' : 'Submit Offer Request'}</button>
      </form>
      <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}><h3 style={{ marginTop: 0 }}>My Requests</h3>{offers.length === 0 ? <p style={{ color: '#6b7280' }}>No offer requests yet.</p> : offers.map((offer) => <div key={offer._id} style={{ borderTop: '1px solid #e5e7eb', padding: '14px 0' }}><strong>{offer.title}</strong><div>{offer.productName} · {offer.discountPercent ? `${offer.discountPercent}% off` : `৳${offer.discountAmount} off`}</div><small>{new Date(offer.startDate).toLocaleString()} to {new Date(offer.endDate).toLocaleString()}</small><div style={{ marginTop: 6, fontWeight: 700, color: offer.status === 'APPROVED' ? '#166534' : offer.status === 'REJECTED' ? '#991b1b' : '#92400e' }}>{offer.status}</div>{offer.rejectionReason && <small style={{ color: '#991b1b' }}>Reason: {offer.rejectionReason}</small>}</div>)}</section>
    </div>
  </div>;
}
export default OfferRequestsPage;
