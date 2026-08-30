import { useEffect, useState } from 'react';
import { getOffers, reviewOffer } from '../api/offerApi';

function OfferModeration() {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const load = async () => { try { setOffers(await getOffers()); } catch (error) { setMessage(error.message); } finally { setLoading(false); } };
  useEffect(() => { load(); }, []);
  const act = async (id, action) => {
    let reason = '';
    if (action === 'reject') { reason = window.prompt('Reason for rejection:')?.trim() || ''; if (!reason) return; }
    try { await reviewOffer(id, action, reason); setOffers(await getOffers()); } catch (error) { setMessage(error.message); }
  };
  if (loading) return <div style={{ padding: 24 }}>Loading offer requests...</div>;
  return <div style={{ maxWidth: 1100, margin: '40px auto', padding: '0 20px' }}><h2>Offer Moderation</h2><p style={{ color: '#4b5563' }}>Review promotional requests submitted by farmers.</p>{message && <p style={{ color: '#991b1b' }}>{message}</p>}{offers.length === 0 ? <div style={{ padding: 30, background: '#f9fafb', borderRadius: 12 }}>No offer requests.</div> : offers.map((offer) => <article key={offer._id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, marginBottom: 16 }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><div><h3 style={{ margin: 0 }}>{offer.title}</h3><p style={{ margin: '6px 0', color: '#4b5563' }}>{offer.productName} · Farmer: {offer.farmerName} ({offer.farmer?.email})</p></div><strong style={{ color: offer.status === 'PENDING' ? '#92400e' : offer.status === 'APPROVED' ? '#166534' : '#991b1b' }}>{offer.status}</strong></div><p>{offer.description}</p><p><strong>Promotion:</strong> {offer.discountPercent ? `${offer.discountPercent}% off` : `৳${offer.discountAmount} off`}{offer.minOrderAmount ? ` · Minimum order ৳${offer.minOrderAmount}` : ''}</p><p><strong>Dates:</strong> {new Date(offer.startDate).toLocaleString()} to {new Date(offer.endDate).toLocaleString()}</p>{offer.status === 'PENDING' && <div style={{ display: 'flex', gap: 10 }}><button onClick={() => act(offer._id, 'approve')} style={{ padding: '9px 16px', background: '#2e7d32', color: '#fff', border: 0, borderRadius: 8 }}>Approve</button><button onClick={() => act(offer._id, 'reject')} style={{ padding: '9px 16px', background: '#b91c1c', color: '#fff', border: 0, borderRadius: 8 }}>Reject</button></div>}{offer.rejectionReason && <p style={{ color: '#991b1b' }}>Rejection reason: {offer.rejectionReason}</p>}</article>)}</div>;
}
export default OfferModeration;
