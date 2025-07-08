"use client";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { saveAs } from "file-saver";

type Complaint = {
  id: string;
  name: string;
  company: string;
  phone: string;
  complaint: string;
  queueNumber: string;
  category?: string;
  deviceType?: string;
  noInternet?: string;
  status: string;
  createdAt: string;
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [finishedPage, setFinishedPage] = useState(1); 
  const itemsPerPage = 5;

  useEffect(() => {
    if (status === "authenticated") {
      fetchComplaints();
    }
  }, [status]);

  useEffect(() => {
    const activeCount = complaints.filter((c) => c.status !== "Selesai").length;
    if (activeCount <= itemsPerPage) {
      setCurrentPage(1);
    }
  }, [complaints]);

  const fetchComplaints = async () => {
    const res = await fetch("/api/complaints");
    const data = await res.json();
    setComplaints(data);
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch("/api/complaints", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    fetchComplaints();
  };

  const printTicket = (c: Complaint) => {
    const popup = window.open("", "_blank", "width=400,height=600");
    popup?.document.write(`
      <html>
        <head>
          <title>Struk Antrian</title>
          <style>
            body { font-family: Arial; padding: 20px; }
            h2 { text-align: center; }
            .item { margin-bottom: 10px; }
          </style>
        </head>
        <body>
          <h2>Struk Antrian</h2>
          <div class="item"><strong>No:</strong> ${c.queueNumber}</div>
          <div class="item"><strong>Nama:</strong> ${c.name}</div>
          <div class="item"><strong>Perusahaan:</strong> ${c.company}</div>
          <div class="item"><strong>Telepon:</strong> ${c.phone}</div>
          <div class="item"><strong>Keluhan:</strong> ${c.complaint}</div>
          <hr />
          <div style="text-align:center;margin-top:20px;">${new Date(c.createdAt).toLocaleString("id-ID")}</div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    popup?.document.close();
  };

  const exportToCSV = () => {
    const header = [
      "No Antrian",
      "Nama",
      "Perusahaan",
      "Telepon",
      "Keluhan",
      "Kategori",
      "Device",
      "No Internet",
      "Status",
      "Waktu",
    ];
    const rows = complaints.map((c) => [
      c.queueNumber,
      c.name,
      c.company,
      c.phone,
      c.complaint,
      c.category || "-",
      c.deviceType || "-",
      c.noInternet || "-",
      c.status,
      new Date(c.createdAt).toLocaleString("id-ID"),
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [header, ...rows].map((e) => e.join(",")).join("\n");

    const blob = new Blob([decodeURIComponent(encodeURI(csvContent))], {
      type: "text/csv;charset=utf-8;",
    });
    saveAs(blob, "antrian_pengaduan.csv");
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Memuat data...</p>
        </div>
      </div>
    );
  }

  if (status !== "authenticated") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m4-6V7a2 2 0 00-2-2H8a2 2 0 00-2 2v2m8 0V7a2 2 0 00-2-2H8a2 2 0 00-2 2v2" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Unauthorized</h3>
          <p className="text-gray-500">Silakan login terlebih dahulu</p>
        </div>
      </div>
    );
  }

  const activeComplaints = complaints.filter((c) => c.status !== "Selesai");
  const finished = complaints.filter((c) => c.status === "Selesai");

  const paginatedOngoing = activeComplaints.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const ongoing = paginatedOngoing;

  const finishedTotal = finished.length;
  const finishedTotalPages = Math.ceil(finishedTotal / itemsPerPage);
  const paginatedFinished = finished.slice(
    (finishedPage - 1) * itemsPerPage,
    finishedPage * itemsPerPage
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">T</span>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard Antrian</h1>
                <p className="text-sm text-gray-600">PT Telkom Indonesia</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {session?.user?.name || "Administrator"}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date().toLocaleDateString("id-ID", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Antrian</p>
                <p className="text-2xl font-bold text-gray-900">{complaints.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Menunggu</p>
                <p className="text-2xl font-bold text-gray-900">
                  {complaints.filter(c => c.status === "Menunggu").length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Diproses</p>
                <p className="text-2xl font-bold text-gray-900">
                  {complaints.filter(c => c.status === "Diproses").length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Selesai</p>
                <p className="text-2xl font-bold text-gray-900">{finished.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Export Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Kelola Data Antrian</h2>
                <p className="text-sm text-gray-600">Export dan kelola data antrian pelanggan</p>
              </div>
              <button
                onClick={exportToCSV}
                className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Export ke CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Active Queue */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Antrian Aktif</h2>
                <p className="text-sm text-gray-600">Kelola antrian yang sedang berjalan</p>
              </div>
              <div className="text-sm text-gray-500">
                Menampilkan {ongoing.length} dari {complaints.filter(c => c.status !== "Selesai").length} antrian
              </div>
            </div>
          </div>

          <div className="p-6">
            {ongoing.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Tidak ada antrian aktif</h3>
                <p className="text-gray-500">Antrian yang sedang berjalan akan muncul di sini</p>
              </div>
            ) : (
              <div className="space-y-6">
                {ongoing.map((c) => (
                  <div key={c.id} className="bg-gray-50 rounded-lg p-6 hover:bg-gray-100 transition-colors">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                          {c.queueNumber}
                        </span>
                        <h3 className="text-xl font-semibold text-gray-900">{c.name}</h3>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          c.status === "Menunggu" ? "bg-yellow-100 text-yellow-800" : 
                          c.status === "Diproses" ? "bg-blue-100 text-blue-800" : 
                          "bg-green-100 text-green-800"
                        }`}>
                          {c.status}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(c.createdAt).toLocaleDateString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-500 min-w-[80px]">Perusahaan:</span>
                          <span className="text-sm text-gray-900">{c.company}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-500 min-w-[80px]">Telepon:</span>
                          <span className="text-sm text-gray-900">{c.phone}</span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-500 min-w-[80px]">Kategori:</span>
                          <span className="text-sm text-gray-900">{c.category || "-"}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-500 min-w-[80px]">Device:</span>
                          <span className="text-sm text-gray-900">{c.deviceType || "-"}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium text-gray-500 min-w-[80px]">No Internet:</span>
                          <span className="text-sm text-gray-900">{c.noInternet || "-"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-4 border-l-4 border-red-500 mb-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Detail Keluhan:</h4>
                      <p className="text-sm text-gray-700 leading-relaxed">{c.complaint}</p>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        {c.status === "Menunggu" && (
                          <button
                            onClick={() => updateStatus(c.id, "Diproses")}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                            </svg>
                            <span>Panggil</span>
                          </button>
                        )}
                        {c.status === "Diproses" && (
                          <button
                            onClick={() => updateStatus(c.id, "Selesai")}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>Selesai</span>
                          </button>
                        )}
                      </div>
                      <button
                        onClick={() => printTicket(c)}
                        className="inline-flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm font-medium hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        <span>Cetak Struk</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {complaints.filter(c => c.status !== "Selesai").length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-700">
                  Halaman {currentPage} dari {Math.ceil(complaints.filter(c => c.status !== "Selesai").length / itemsPerPage)}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Prev</span>
                  </button>
                  
                  <div className="flex items-center space-x-2">
                    <span className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg">
                      {currentPage}
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      setCurrentPage((p) =>
                        p * itemsPerPage < complaints.length ? p + 1 : p
                      )
                    }
                    disabled={currentPage * itemsPerPage >= complaints.length}
                    className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span>Next</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Completed Queue */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Daftar Selesai</h2>
                <p className="text-sm text-gray-600">Riwayat antrian yang telah selesai</p>
              </div>
              <div className="text-sm text-gray-500">
                {finished.length} antrian selesai
              </div>
            </div>
          </div>

          <div className="p-6">
            {finishedTotal === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Belum ada antrian selesai</h3>
                <p className="text-gray-500">Antrian yang telah selesai akan muncul di sini</p>
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedFinished.map((c) => (
                  <div key={c.id} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-3">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          {c.queueNumber}
                        </span>
                        <div>
                          <h3 className="font-semibold text-gray-900">{c.name}</h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>{c.category || "-"}</span>
                            <span>{c.deviceType || "-"}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-gray-500">
                          {new Date(c.createdAt).toLocaleDateString("id-ID", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Selesai
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Pagination for finished */}
          {finishedTotal > 0 && finishedTotalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-700">
                  Halaman {finishedPage} dari {finishedTotalPages}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setFinishedPage((p) => Math.max(1, p - 1))}
                    disabled={finishedPage === 1}
                    className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span>Prev</span>
                  </button>
                  <div className="flex items-center space-x-2">
                    <span className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg">
                      {finishedPage}
                    </span>
                  </div>
                  <button
                    onClick={() =>
                      setFinishedPage((p) =>
                        p * itemsPerPage < finishedTotal ? p + 1 : p
                      )
                    }
                    disabled={finishedPage * itemsPerPage >= finishedTotal}
                    className="inline-flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <span>Next</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}