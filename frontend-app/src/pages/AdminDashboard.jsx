import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Users,
  Package,
  ShoppingCart,
  TrendingUp,
  Search,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RotateCcw,
  Eye,
  Activity,
} from "lucide-react";

import {
  getAdminStats,
  getAllUsers,
  updateUserStatus,
  getAllProductsAdmin,
  getPendingProducts,
  approveProduct,
  removeProduct,
  restoreProduct,
  getActionLogs,
} from "../api/adminApi";

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState({ data: [], totalPages: 1 });
  const [products, setProducts] = useState({ data: [], totalPages: 1 });
  const [logs, setLogs] = useState({ data: [], totalPages: 1 });
  const [loading, setLoading] = useState(false);

  const [userFilter, setUserFilter] = useState({ role: "", status: "", search: "" });
  const [productFilter, setProductFilter] = useState({ status: "pending", search: "" });
  const [userPage, setUserPage] = useState(1);
  const [productPage, setProductPage] = useState(1);
  const [logPage, setLogPage] = useState(1);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [removalReason, setRemovalReason] = useState("");
  const [showRemoveModal, setShowRemoveModal] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    if (activeTab === "users") loadUsers();
    if (activeTab === "products") loadProducts();
    if (activeTab === "logs") loadLogs();
  }, [activeTab, userPage, productPage, logPage]);

  const loadStats = async () => {
    try {
      const data = await getAdminStats();
      setStats(data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getAllUsers({ ...userFilter, page: userPage, limit: 10 });
      setUsers(data);
    } catch (err) {
      console.error("Failed to load users", err);
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    try {
      const endpoint = productFilter.status === "pending" ? getPendingProducts : getAllProductsAdmin;
      const data = await endpoint({ ...productFilter, page: productPage, limit: 10 });
      setProducts(data);
    } catch (err) {
      console.error("Failed to load products", err);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    setLoading(true);
    try {
      const data = await getActionLogs({ page: logPage, limit: 20 });
      setLogs(data);
    } catch (err) {
      console.error("Failed to load logs", err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (userId, newStatus) => {
    if (!confirm(`Are you sure you want to ${newStatus} this user?`)) return;
    try {
      await updateUserStatus(userId, {
        accountStatus: newStatus,
        reason: `Status changed to ${newStatus} by admin`,
      });
      loadUsers();
      loadStats();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update status");
    }
  };

  const handleApprove = async (productId) => {
    try {
      await approveProduct(productId);
      loadProducts();
      loadStats();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to approve");
    }
  };

  const handleRemove = async () => {
    if (!removalReason.trim()) return alert("Please provide a reason");
    try {
      await removeProduct(selectedProduct.id, removalReason);
      setShowRemoveModal(false);
      setRemovalReason("");
      setSelectedProduct(null);
      loadProducts();
      loadStats();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to remove");
    }
  };

  const handleRestore = async (productId) => {
    if (!confirm("Restore this product?")) return;
    try {
      await restoreProduct(productId);
      loadProducts();
      loadStats();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to restore");
    }
  };

  const statusBadge = (status) => {
    const map = {
      active: "bg-green-100 text-green-800",
      suspended: "bg-red-100 text-red-800",
      deactivated: "bg-gray-100 text-gray-800",
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      removed: "bg-red-100 text-red-800",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${map[status] || "bg-blue-100 text-blue-800"}`}>
        {status}
      </span>
    );
  };

  const tabs = [
    { id: "overview", label: "Overview", icon: TrendingUp },
    { id: "users", label: "User Management", icon: Users },
    { id: "products", label: "Product Moderation", icon: Package },
    { id: "logs", label: "Action Logs", icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-agri-800 flex items-center gap-2">
          <Shield className="w-8 h-8 text-agri-600" /> Admin Panel
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-stone-200 pb-2 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id ? "bg-agri-700 text-white" : "text-stone-600 hover:bg-stone-100"
            }`}
          >
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === "overview" && stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total Users", value: stats.totalUsers, icon: Users, color: "text-agri-700" },
            { label: "Farmers", value: stats.totalFarmers, icon: Package, color: "text-agri-700" },
            { label: "Pending Products", value: stats.pendingProducts, icon: AlertTriangle, color: "text-yellow-600" },
            { label: "Total Revenue", value: `৳${stats.totalRevenue.toLocaleString()}`, icon: TrendingUp, color: "text-green-600" },
          ].map((item, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-stone-500">{item.label}</p>
                    <p className={`text-3xl font-bold ${item.color}`}>{item.value}</p>
                  </div>
                  <item.icon className="w-8 h-8 text-stone-300" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* USERS */}
      {activeTab === "users" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Search users..."
              value={userFilter.search}
              onChange={(e) => setUserFilter({ ...userFilter, search: e.target.value })}
              className="w-64"
            />
            <select
              className="border rounded-md px-3 py-2 text-sm bg-white"
              value={userFilter.role}
              onChange={(e) => setUserFilter({ ...userFilter, role: e.target.value })}
            >
              <option value="">All Roles</option>
              <option value="buyer">Buyer</option>
              <option value="farmer">Farmer</option>
              <option value="delivery_man">Delivery Man</option>
            </select>
            <select
              className="border rounded-md px-3 py-2 text-sm bg-white"
              value={userFilter.status}
              onChange={(e) => setUserFilter({ ...userFilter, status: e.target.value })}
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="deactivated">Deactivated</option>
            </select>
            <Button onClick={() => { setUserPage(1); loadUsers(); }} variant="outline">
              <Search className="w-4 h-4 mr-2" /> Search
            </Button>
          </div>

          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-stone-50">
                <tr>
                  <th className="text-left p-3 font-semibold text-stone-600">Name</th>
                  <th className="text-left p-3 font-semibold text-stone-600">Email</th>
                  <th className="text-left p-3 font-semibold text-stone-600">Role</th>
                  <th className="text-left p-3 font-semibold text-stone-600">Status</th>
                  <th className="text-left p-3 font-semibold text-stone-600">Joined</th>
                  <th className="text-left p-3 font-semibold text-stone-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="p-8 text-center text-stone-500">Loading...</td></tr>
                ) : (
                  users.data?.map((user) => (
                    <tr key={user._id} className="border-t hover:bg-stone-50">
                      <td className="p-3 font-medium">{user.name}</td>
                      <td className="p-3 text-stone-500">{user.email}</td>
                      <td className="p-3 capitalize">{user.role.replace("_", " ")}</td>
                      <td className="p-3">{statusBadge(user.accountStatus)}</td>
                      <td className="p-3 text-stone-500">{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="p-3">
                        <div className="flex gap-2 flex-wrap">
                          {user.accountStatus !== "active" && (
                            <Button size="sm" variant="outline" onClick={() => handleStatusChange(user._id, "active")}>
                              <CheckCircle className="w-3 h-3 mr-1" /> Activate
                            </Button>
                          )}
                          {user.accountStatus !== "suspended" && user.role !== "admin" && (
                            <Button size="sm" variant="outline" className="text-red-600" onClick={() => handleStatusChange(user._id, "suspended")}>
                              <XCircle className="w-3 h-3 mr-1" /> Suspend
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {users.totalPages > 1 && (
              <div className="flex justify-center gap-2 p-3 border-t">
                <Button variant="outline" disabled={userPage <= 1} onClick={() => setUserPage(userPage - 1)}>Previous</Button>
                <span className="px-3 py-2 text-sm text-stone-600">Page {userPage} of {users.totalPages}</span>
                <Button variant="outline" disabled={userPage >= users.totalPages} onClick={() => setUserPage(userPage + 1)}>Next</Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PRODUCTS */}
      {activeTab === "products" && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Input
              placeholder="Search products..."
              value={productFilter.search}
              onChange={(e) => setProductFilter({ ...productFilter, search: e.target.value })}
              className="w-64"
            />
            <select
              className="border rounded-md px-3 py-2 text-sm bg-white"
              value={productFilter.status}
              onChange={(e) => setProductFilter({ ...productFilter, status: e.target.value })}
            >
              <option value="pending">Pending Approval</option>
              <option value="approved">Approved</option>
              <option value="removed">Removed</option>
            </select>
            <Button onClick={() => { setProductPage(1); loadProducts(); }} variant="outline">
              <Search className="w-4 h-4 mr-2" /> Search
            </Button>
          </div>

          <div className="bg-white rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-stone-50">
                <tr>
                  <th className="text-left p-3 font-semibold text-stone-600">Product</th>
                  <th className="text-left p-3 font-semibold text-stone-600">Farmer</th>
                  <th className="text-left p-3 font-semibold text-stone-600">Price</th>
                  <th className="text-left p-3 font-semibold text-stone-600">Status</th>
                  <th className="text-left p-3 font-semibold text-stone-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="5" className="p-8 text-center text-stone-500">Loading...</td></tr>
                ) : (
                  products.data?.map((product) => (
                    <tr key={product._id} className="border-t hover:bg-stone-50">
                      <td className="p-3">
                        <div className="font-medium">{product.name}</div>
                        <div className="text-xs text-stone-500">{product.legacyCategory}</div>
                      </td>
                      <td className="p-3 text-stone-600">{product.farmer?.name}</td>
                      <td className="p-3">৳{product.price}</td>
                      <td className="p-3">
                        {product.isRemoved ? statusBadge("removed") : product.isApproved ? statusBadge("approved") : statusBadge("pending")}
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2 flex-wrap">
                          {!product.isApproved && !product.isRemoved && (
                            <Button size="sm" onClick={() => handleApprove(product._id)}>
                              <CheckCircle className="w-3 h-3 mr-1" /> Approve
                            </Button>
                          )}
                          {!product.isRemoved && (
                            <Button size="sm" variant="outline" className="text-red-600" onClick={() => { setSelectedProduct(product); setShowRemoveModal(true); }}>
                              <XCircle className="w-3 h-3 mr-1" /> Remove
                            </Button>
                          )}
                          {product.isRemoved && (
                            <Button size="sm" variant="outline" onClick={() => handleRestore(product._id)}>
                              <RotateCcw className="w-3 h-3 mr-1" /> Restore
                            </Button>
                          )}
                          <Link to={`/products/${product._id}`}>
                            <Button size="sm" variant="ghost">
                              <Eye className="w-3 h-3 mr-1" /> View
                            </Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {products.totalPages > 1 && (
              <div className="flex justify-center gap-2 p-3 border-t">
                <Button variant="outline" disabled={productPage <= 1} onClick={() => setProductPage(productPage - 1)}>Previous</Button>
                <span className="px-3 py-2 text-sm text-stone-600">Page {productPage} of {products.totalPages}</span>
                <Button variant="outline" disabled={productPage >= products.totalPages} onClick={() => setProductPage(productPage + 1)}>Next</Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LOGS */}
      {activeTab === "logs" && (
        <div className="bg-white rounded-lg border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-stone-50">
              <tr>
                <th className="text-left p-3 font-semibold text-stone-600">Action</th>
                <th className="text-left p-3 font-semibold text-stone-600">Target</th>
                <th className="text-left p-3 font-semibold text-stone-600">Reason</th>
                <th className="text-left p-3 font-semibold text-stone-600">Admin</th>
                <th className="text-left p-3 font-semibold text-stone-600">Time</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="p-8 text-center text-stone-500">Loading...</td></tr>
              ) : (
                logs.data?.map((log) => (
                  <tr key={log._id} className="border-t hover:bg-stone-50">
                    <td className="p-3">
                      <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 capitalize">
                        {log.action.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="p-3 text-stone-600">{log.targetType}: {log.targetId.slice(0, 8)}...</td>
                    <td className="p-3 text-stone-600 max-w-xs truncate">{log.reason}</td>
                    <td className="p-3 font-medium">{log.admin?.name}</td>
                    <td className="p-3 text-stone-500">{new Date(log.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {logs.totalPages > 1 && (
            <div className="flex justify-center gap-2 p-3 border-t">
              <Button variant="outline" disabled={logPage <= 1} onClick={() => setLogPage(logPage - 1)}>Previous</Button>
              <span className="px-3 py-2 text-sm text-stone-600">Page {logPage} of {logs.totalPages}</span>
              <Button variant="outline" disabled={logPage >= logs.totalPages} onClick={() => setLogPage(logPage + 1)}>Next</Button>
            </div>
          )}
        </div>
      )}

      {/* Remove Product Modal */}
      {showRemoveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader>
              <CardTitle className="text-agri-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500" /> Remove Product
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-stone-600">
                You are about to remove <strong>{selectedProduct?.name}</strong>. This requires a reason.
              </p>
              <textarea
                className="w-full border rounded-md p-3 text-sm min-h-[100px] focus:ring-2 focus:ring-agri-500 focus:outline-none"
                placeholder="Enter removal reason (min 5 characters)..."
                value={removalReason}
                onChange={(e) => setRemovalReason(e.target.value)}
              />
              <div className="flex gap-3 justify-end">
                <Button variant="outline" onClick={() => { setShowRemoveModal(false); setRemovalReason(""); }}>
                  Cancel
                </Button>
                <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleRemove}>
                  Remove Product
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

export default AdminDashboard;