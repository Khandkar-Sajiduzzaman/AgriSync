import { useState, useEffect, useRef } from "react";
import html2pdf from "html2pdf.js";
import { generateSalesReport, getSalesReports } from "../api/reportApi";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function SalesReportPage() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [error, setError] = useState("");
  const reportRef = useRef();

  const [form, setForm] = useState({
    title: "",
    period: "2026-Q3",
    startDate: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });

  const loadReports = async () => {
    try {
      setLoading(true);
      const res = await getSalesReports();
      setReports(res.data || []);
      if (res.data?.length > 0 && !selectedReport) {
        setSelectedReport(res.data[0]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    try {
      setGenerating(true);
      setError("");
      const created = await generateSalesReport(form);
      setReports([created, ...reports]);
      setSelectedReport(created);
      setForm({ ...form, title: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!reportRef.current || !selectedReport) return;
    const opt = {
      margin: 10,
      filename: `${selectedReport.title.replace(/\s+/g, "_")}_${selectedReport.period}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };
    html2pdf().set(opt).from(reportRef.current).save();
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-stone-800">
        Sales Report Generation
      </h1>

      {error && (
        <div className="p-3 bg-red-100 text-red-700 rounded-md text-sm">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Generate New Report</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleGenerate}
            className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
          >
            <div className="space-y-1">
              <Label htmlFor="title">Report Title</Label>
              <Input
                id="title"
                required
                placeholder="e.g. Monthly Sales Review"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="period">Period Label</Label>
              <Input
                id="period"
                required
                placeholder="e.g. 2026-08"
                value={form.period}
                onChange={(e) => setForm({ ...form, period: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                required
                value={form.startDate}
                onChange={(e) =>
                  setForm({ ...form, startDate: e.target.value })
                }
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                required
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
            <div className="md:col-span-4 flex justify-end">
              <Button
                type="submit"
                disabled={generating}
                className="bg-agri-700 hover:bg-agri-800 text-white"
              >
                {generating ? "Generating..." : "Generate Report from Orders"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 space-y-3">
          <h2 className="text-lg font-semibold text-stone-700">
            Generated Reports
          </h2>
          {loading ? (
            <p className="text-sm text-stone-500">Loading reports...</p>
          ) : reports.length === 0 ? (
            <p className="text-sm text-stone-500">No reports generated yet.</p>
          ) : (
            reports.map((report) => (
              <div
                key={report.id || report._id}
                onClick={() => setSelectedReport(report)}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedReport?.id === report.id ||
                  selectedReport?._id === report._id
                    ? "border-agri-600 bg-agri-50"
                    : "border-stone-200 bg-white hover:bg-stone-50"
                }`}
              >
                <h3 className="font-semibold text-stone-800">{report.title}</h3>
                <p className="text-xs text-stone-500">
                  Period: {report.period}
                </p>
                <div className="flex justify-between items-center mt-2 text-xs text-stone-600 font-medium">
                  <span>{report.totalOrders} Orders</span>
                  <span className="text-agri-700 font-bold">
                    ৳{report.totalRevenue}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="md:col-span-2">
          {selectedReport ? (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button
                  onClick={handleDownloadPDF}
                  className="bg-stone-800 hover:bg-stone-900 text-white flex items-center gap-2"
                >
                  Download PDF Report
                </Button>
              </div>

              {/* Printable container */}
              <div
                ref={reportRef}
                className="bg-white p-6 border rounded-xl shadow-sm space-y-6"
              >
                <div className="border-b pb-4 flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-stone-900">
                      {selectedReport.title}
                    </h2>
                    <p className="text-sm text-stone-500">
                      Period: {selectedReport.period}
                    </p>
                  </div>
                  <div className="text-right text-xs text-stone-500">
                    <p>AgriSync Marketplace</p>
                    <p>
                      Generated:{" "}
                      {new Date(selectedReport.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="p-4 bg-stone-50 rounded-lg border">
                    <p className="text-xs text-stone-500 uppercase tracking-wide">
                      Total Orders
                    </p>
                    <p className="text-2xl font-bold text-stone-800 mt-1">
                      {selectedReport.totalOrders}
                    </p>
                  </div>
                  <div className="p-4 bg-stone-50 rounded-lg border">
                    <p className="text-xs text-stone-500 uppercase tracking-wide">
                      Units Sold
                    </p>
                    <p className="text-2xl font-bold text-stone-800 mt-1">
                      {selectedReport.totalSales}
                    </p>
                  </div>
                  <div className="p-4 bg-stone-50 rounded-lg border">
                    <p className="text-xs text-stone-500 uppercase tracking-wide">
                      Total Revenue
                    </p>
                    <p className="text-2xl font-bold text-agri-700 mt-1">
                      ৳{selectedReport.totalRevenue}
                    </p>
                  </div>
                </div>

                {selectedReport.data?.categoryBreakdown && (
                  <div>
                    <h4 className="text-sm font-semibold text-stone-700 mb-2">
                      Category Breakdown
                    </h4>
                    <div className="border rounded-md divide-y text-sm">
                      {Object.entries(
                        selectedReport.data.categoryBreakdown,
                      ).map(([cat, stats]) => (
                        <div key={cat} className="flex justify-between p-2.5">
                          <span className="font-medium text-stone-800">
                            {cat}
                          </span>
                          <div className="space-x-4">
                            <span className="text-stone-500">
                              {stats.units} units
                            </span>
                            <span className="font-semibold text-stone-800">
                              ৳{stats.revenue}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedReport.data?.topProducts &&
                  selectedReport.data.topProducts.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-stone-700 mb-2">
                        Top Selling Products
                      </h4>
                      <div className="border rounded-md divide-y text-sm">
                        {selectedReport.data.topProducts.map((p, idx) => (
                          <div key={idx} className="flex justify-between p-2.5">
                            <span className="text-stone-800">{p.name}</span>
                            <div className="space-x-4">
                              <span className="text-stone-500">
                                {p.units} units
                              </span>
                              <span className="font-semibold text-agri-700">
                                ৳{p.revenue}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center border-2 border-dashed rounded-lg text-stone-400">
              Select a report on the left to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
