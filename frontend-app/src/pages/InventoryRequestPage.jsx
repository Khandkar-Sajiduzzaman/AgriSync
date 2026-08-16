import { useEffect, useState } from 'react';
import { getMyProducts } from '../api/productApi';
import { getMyInventoryRequests, submitInventoryRequest } from '../api/inventoryApi';

function InventoryRequestPage() {
  const [products, setProducts] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ productId: '', requestedStock: '', reason: '' });
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [myProducts, myRequests] = await Promise.all([getMyProducts(), getMyInventoryRequests()]);
      setProducts(myProducts || []);
      setRequests(myRequests || []);
      if (myProducts?.[0]) {
        setForm((prev) => ({ ...prev, productId: myProducts[0]._id }));
      }
    } catch (err) {
      setMessage(err.message || 'Unable to load inventory request data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      await submitInventoryRequest({
        productId: form.productId,
        requestedStock: Number(form.requestedStock),
        reason: form.reason,
      });
      setMessage('Inventory change request submitted successfully.');
      setForm({ productId: form.productId, requestedStock: '', reason: '' });
      const myRequests = await getMyInventoryRequests();
      setRequests(myRequests || []);
    } catch (err) {
      setMessage(err.message || 'Failed to submit inventory request');
    } finally {
      setSaving(false);
    }
  };

  const selectedProduct = products.find((product) => product._id === form.productId);

  if (loading) {
    return <div style={{ padding: 24 }}>Loading inventory requests...</div>;
  }

  return (
    <div style={{ maxWidth: 1200, margin: '40px auto', padding: '0 20px', display: 'grid', gap: 24 }}>
      <div>
        <h2>Inventory Change Requests</h2>
        <p style={{ color: '#4b5563' }}>Request a stock adjustment for a product. Updates are reviewed by admin before stock changes.</p>
      </div>

      {message && (
        <div style={{ padding: '12px 16px', borderRadius: 8, background: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0' }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 24 }}>
        <form onSubmit={handleSubmit} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20, display: 'grid', gap: 16 }}>
          <h3 style={{ margin: 0 }}>Submit Request</h3>

          <label style={{ display: 'grid', gap: 6 }}>
            <span>Product</span>
            <select name="productId" value={form.productId} onChange={handleChange} style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db' }}>
              {products.map((product) => (
                <option key={product._id} value={product._id}>{product.name}</option>
              ))}
            </select>
          </label>

          {selectedProduct && (
            <div style={{ background: '#f8fafc', borderRadius: 8, padding: 12 }}>
              <p><strong>Current Stock:</strong> {selectedProduct.stock} {selectedProduct.unit || 'kg'}</p>
            </div>
          )}

          <label style={{ display: 'grid', gap: 6 }}>
            <span>Requested Stock</span>
            <input
              type="number"
              name="requestedStock"
              min="0"
              value={form.requestedStock}
              onChange={handleChange}
              placeholder="75"
              style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db' }}
              required
            />
          </label>

          <label style={{ display: 'grid', gap: 6 }}>
            <span>Reason</span>
            <textarea
              name="reason"
              value={form.reason}
              onChange={handleChange}
              placeholder="New harvest received"
              rows={4}
              style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', resize: 'vertical' }}
              required
            />
          </label>

          <button type="submit" disabled={saving || products.length === 0} style={{ padding: '12px 18px', background: '#2e7d32', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Submitting...' : 'Submit Request'}
          </button>
        </form>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
          <h3 style={{ marginTop: 0 }}>Request History</h3>
          {requests.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No inventory requests yet.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '10px 8px' }}>Product</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px' }}>Current</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px' }}>Requested</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px' }}>Reason</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request._id} style={{ borderTop: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '10px 8px' }}>{request.productName}</td>
                      <td style={{ padding: '10px 8px' }}>{request.currentStock}</td>
                      <td style={{ padding: '10px 8px' }}>{request.requestedStock}</td>
                      <td style={{ padding: '10px 8px' }}>{request.reason}</td>
                      <td style={{ padding: '10px 8px' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '4px 8px',
                          borderRadius: 999,
                          fontSize: 12,
                          background: request.status === 'PENDING' ? '#fef3c7' : request.status === 'APPROVED' ? '#dcfce7' : '#fee2e2',
                          color: request.status === 'PENDING' ? '#92400e' : request.status === 'APPROVED' ? '#166534' : '#991b1b',
                        }}>
                          {request.status}
                        </span>
                        {request.status === 'REJECTED' && request.rejectionReason && (
                          <div style={{ marginTop: 6, color: '#991b1b', fontSize: 12 }}>
                            Rejected: {request.rejectionReason}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default InventoryRequestPage;
