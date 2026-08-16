import { useEffect, useState } from 'react';
import {
  getInventoryOverview,
  getInventoryRequests,
  getInventoryProducts,
  getInventoryHistory,
  approveInventoryRequest,
  rejectInventoryRequest,
  adjustInventoryStock,
} from '../api/inventoryApi';

function InventoryManagement() {
  const [overview, setOverview] = useState({});
  const [requests, setRequests] = useState([]);
  const [products, setProducts] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [adjustProduct, setAdjustProduct] = useState(null);
  const [adjustForm, setAdjustForm] = useState({ newStock: '', reason: '' });
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [overviewData, requestData, productData, historyData] = await Promise.all([
        getInventoryOverview(),
        getInventoryRequests(),
        getInventoryProducts(),
        getInventoryHistory(),
      ]);

      setOverview(overviewData || {});
      setRequests(requestData || []);
      setProducts(productData || []);
      setHistory(historyData || []);
    } catch (err) {
      setMessage(err.message || 'Unable to load inventory data');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    try {
      await approveInventoryRequest(requestId);
      setMessage('Request approved successfully.');
      setMessageType('success');
      await loadData();
    } catch (err) {
      setMessage(err.message || 'Failed to approve request');
      setMessageType('error');
    }
  };

  const handleReject = async (requestId) => {
    const reason = window.prompt('Enter rejection reason');
    if (!reason || !reason.trim()) {
      return;
    }

    try {
      await rejectInventoryRequest(requestId, reason.trim());
      setMessage('Request rejected successfully.');
      setMessageType('success');
      await loadData();
    } catch (err) {
      setMessage(err.message || 'Failed to reject request');
      setMessageType('error');
    }
  };

  const handleAdjustOpen = (product) => {
    setAdjustProduct(product);
    setAdjustForm({
      newStock: String(product.stock ?? 0),
      reason: '',
    });
    setMessage('');
  };

  const handleAdjustChange = (event) => {
    const { name, value } = event.target;
    setAdjustForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAdjustSubmit = async (event) => {
    event.preventDefault();
    if (!adjustProduct) return;

    const parsedStock = Number.parseInt(adjustForm.newStock, 10);
    const cleanReason = adjustForm.reason.trim();

    if (!Number.isInteger(parsedStock) || parsedStock < 0) {
      setMessage('New stock must be a valid non-negative number.');
      setMessageType('error');
      return;
    }

    if (!cleanReason) {
      setMessage('A reason is required for stock adjustments.');
      setMessageType('error');
      return;
    }

    setAdjustSubmitting(true);
    try {
      await adjustInventoryStock(adjustProduct._id, { newStock: parsedStock, reason: cleanReason });
      setMessage('Stock adjusted successfully.');
      setMessageType('success');
      setAdjustProduct(null);
      setAdjustForm({ newStock: '', reason: '' });
      await loadData();
    } catch (err) {
      setMessage(err.message || 'Failed to adjust stock');
      setMessageType('error');
    } finally {
      setAdjustSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 24 }}>Loading inventory management...</div>;
  }

  return (
    <div style={{ maxWidth: 1400, margin: '40px auto', padding: '0 20px', display: 'grid', gap: 24 }}>
      <div>
        <h2>Inventory Management</h2>
        <p style={{ color: '#4b5563' }}>Track requests, monitor stock, and make direct adjustments when necessary.</p>
      </div>

      {message && (
        <div style={{
          padding: '12px 16px',
          borderRadius: 8,
          background: messageType === 'error' ? '#fef2f2' : '#ecfdf5',
          color: messageType === 'error' ? '#991b1b' : '#065f46',
          border: `1px solid ${messageType === 'error' ? '#fecaca' : '#a7f3d0'}`,
        }}>
          {message}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <StatCard label="Total Products" value={overview.totalProducts ?? 0} />
        <StatCard label="In Stock" value={overview.inStockProducts ?? 0} />
        <StatCard label="Low Stock" value={overview.lowStockProducts ?? 0} />
        <StatCard label="Out of Stock" value={overview.outOfStockProducts ?? 0} />
        <StatCard label="Pending Requests" value={overview.pendingRequests ?? 0} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 24 }}>
        <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: '0 0 16px 0' }}>Inventory Requests</h3>
          {requests.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No inventory requests found.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '10px 8px' }}>Farmer</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px' }}>Product</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px' }}>Current</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px' }}>Requested</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px' }}>Reason</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px' }}>Status</th>
                    <th style={{ textAlign: 'left', padding: '10px 8px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request._id} style={{ borderTop: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '10px 8px' }}>{request.farmerName}</td>
                      <td style={{ padding: '10px 8px' }}>{request.productName}</td>
                      <td style={{ padding: '10px 8px' }}>{request.currentStock}</td>
                      <td style={{ padding: '10px 8px' }}>{request.requestedStock}</td>
                      <td style={{ padding: '10px 8px', maxWidth: 180 }}>{request.reason}</td>
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
                          <div style={{ marginTop: 6, color: '#991b1b', fontSize: 12 }}>Reason: {request.rejectionReason}</div>
                        )}
                      </td>
                      <td style={{ padding: '10px 8px' }}>
                        {request.status === 'PENDING' ? (
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button onClick={() => handleApprove(request._id)} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>Approve</button>
                            <button onClick={() => handleReject(request._id)} style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer' }}>Reject</button>
                          </div>
                        ) : (
                          <span style={{ color: '#6b7280' }}>Processed</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
          <h3 style={{ margin: '0 0 16px 0' }}>Inventory List</h3>
          {products.length === 0 ? (
            <p style={{ color: '#6b7280' }}>No products currently in inventory.</p>
          ) : (
            <div style={{ display: 'grid', gap: 12 }}>
              {products.map((product) => (
                <div key={product._id} style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <div>
                      <strong>{product.name}</strong>
                      <div style={{ color: '#4b5563', fontSize: 13 }}>{product.farmerName}</div>
                    </div>
                    <span style={{
                      background: product.stockStatus === 'OUT OF STOCK' ? '#fee2e2' : product.stockStatus === 'LOW STOCK' ? '#fef3c7' : '#dcfce7',
                      color: product.stockStatus === 'OUT OF STOCK' ? '#991b1b' : product.stockStatus === 'LOW STOCK' ? '#92400e' : '#166534',
                      borderRadius: 999,
                      padding: '4px 8px',
                      fontSize: 12,
                    }}>{product.stockStatus}</span>
                  </div>
                  <div style={{ marginTop: 8, color: '#4b5563' }}>Stock: {product.stock} {product.unit || 'kg'}</div>
                  <button onClick={() => handleAdjustOpen(product)} style={{ marginTop: 12, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 12px', cursor: 'pointer' }}>Adjust Stock</button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
        <h3 style={{ marginTop: 0 }}>Inventory History</h3>
        {history.length === 0 ? (
          <p style={{ color: '#6b7280' }}>No stock changes logged yet.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '10px 8px' }}>Product</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px' }}>Farmer</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px' }}>Old</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px' }}>New</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px' }}>Change</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px' }}>Reason</th>
                  <th style={{ textAlign: 'left', padding: '10px 8px' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {history.map((log) => (
                  <tr key={log._id} style={{ borderTop: '1px solid #e5e7eb' }}>
                    <td style={{ padding: '10px 8px' }}>{log.productName}</td>
                    <td style={{ padding: '10px 8px' }}>{log.farmerName}</td>
                    <td style={{ padding: '10px 8px' }}>{log.oldStock}</td>
                    <td style={{ padding: '10px 8px' }}>{log.newStock}</td>
                    <td style={{ padding: '10px 8px' }}>{log.change > 0 ? '+' : ''}{log.change}</td>
                    <td style={{ padding: '10px 8px', maxWidth: 220 }}>{log.reason}</td>
                    <td style={{ padding: '10px 8px' }}>{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {adjustProduct && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 1000 }}>
          <div style={{ background: '#fff', width: '100%', maxWidth: 500, borderRadius: 12, padding: 24, border: '1px solid #e5e7eb' }}>
            <h3 style={{ marginTop: 0 }}>Adjust Stock</h3>
            <form onSubmit={handleAdjustSubmit} style={{ display: 'grid', gap: 16 }}>
              <div>
                <strong>Product:</strong> {adjustProduct.name}
              </div>
              <div>
                <strong>Current Stock:</strong> {adjustProduct.stock} {adjustProduct.unit || 'kg'}
              </div>

              <label style={{ display: 'grid', gap: 6 }}>
                <span>New Stock</span>
                <input
                  type="number"
                  name="newStock"
                  min="0"
                  value={adjustForm.newStock}
                  onChange={handleAdjustChange}
                  style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db' }}
                  required
                />
              </label>

              <label style={{ display: 'grid', gap: 6 }}>
                <span>Reason</span>
                <textarea
                  name="reason"
                  value={adjustForm.reason}
                  onChange={handleAdjustChange}
                  rows={4}
                  placeholder="Manual correction"
                  style={{ padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', resize: 'vertical' }}
                  required
                />
              </label>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button type="button" onClick={() => setAdjustProduct(null)} style={{ background: '#e5e7eb', color: '#111827', border: 'none', borderRadius: 8, padding: '10px 14px', cursor: 'pointer' }}>
                  Cancel
                </button>
                <button type="submit" disabled={adjustSubmitting} style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 14px', cursor: 'pointer' }}>
                  {adjustSubmitting ? 'Saving...' : 'Save Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 20 }}>
      <div style={{ color: '#6b7280', fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 8 }}>{value}</div>
    </div>
  );
}

export default InventoryManagement;
