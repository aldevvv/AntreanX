"use client";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { saveAs } from "file-saver";
import Link from "next/link";

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
  notes?: string;
};

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [finishedPage, setFinishedPage] = useState(1);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [tempNotes, setTempNotes] = useState<{ [key: string]: string }>({});
  const itemsPerPage = 5;
  const [showDropdown, setShowDropdown] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingComplaint, setEditingComplaint] = useState<Complaint | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Complaint>>({});
  const [dateFilter, setDateFilter] = useState<'all' | '1day' | '7days' | '30days'>('all');
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [showFinishedDateFilter, setShowFinishedDateFilter] = useState(false);
  const [showAdminDropdown, setShowAdminDropdown] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [isResetQueueModalOpen, setResetQueueModalOpen] = useState(false);

  const getFilterLabel = () => {
    switch (dateFilter) {
      case '1day':
        return 'Hari Ini';
      case '7days':
        return '7 Hari Terakhir';
      case '30days':
        return '30 Hari Terakhir';
      default:
        return 'Semua Waktu';
    }
  };

  const getFilteredComplaints = () => {
    const finishedComplaints = complaints.filter(c => c.status === "Selesai");
    
    if (dateFilter === 'all') {
      return finishedComplaints;
    }
    
    const now = new Date();
    const filterDate = new Date();
    
    switch (dateFilter) {
      case '1day':
        filterDate.setDate(now.getDate() - 1);
        break;
      case '7days':
        filterDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        filterDate.setDate(now.getDate() - 30);
        break;
      default:
        return finishedComplaints;
    }
    
    return finishedComplaints.filter(c => new Date(c.createdAt) >= filterDate);
  };

  useEffect(() => {
    if (status === "authenticated") {
      fetchComplaints();
      
      // Auto refresh every 30 seconds
      const interval = setInterval(() => {
        fetchComplaints();
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [status]);

  useEffect(() => {
    const activeCount = complaints.filter((c) => c.status !== "Selesai").length;
    if (activeCount <= itemsPerPage) {
      setCurrentPage(1);
    }
  }, [complaints]);

  const fetchComplaints = async () => {
    try {
      const res = await fetch("/api/complaints");
      if (!res.ok) {
        // If the response wasn't ok, throw an error
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      setComplaints(data);
    } catch (error) {
      console.error("Error fetching complaints:", error);
      // You might want to set some error state here
      setComplaints([]);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    await fetch("/api/complaints", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    fetchComplaints();
  };

const updateNotes = async (id: string, notes: string) => {
  await fetch("/api/complaints", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id, notes }),
  });
  // fetchComplaints akan update complaints state, tapi selectedComplaint harus diupdate manual agar sinkron
  await fetchComplaints();
  setSelectedComplaint((prev) => {
    if (prev && prev.id === id) {
      // Cari data terbaru dari complaints state
      const updated = complaints.find((c) => c.id === id);
      if (updated) return updated;
      return { ...prev, notes };
    }
    return prev;
  });
};

const handleNotesChange = (id: string, value: string) => {
  setTempNotes(prev => ({ ...prev, [id]: value }));
};

const saveNotes = async (id: string) => {
  const notes = tempNotes[id] || "";
  await updateNotes(id, notes);
  setTempNotes((prev) => {
    const newNotes = { ...prev };
    delete newNotes[id];
    return newNotes;
  });
};

const deleteComplaint = async (id: string) => {
  if (confirm("Apakah Anda yakin ingin menghapus antrian ini?")) {
    await fetch("/api/complaints", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    fetchComplaints();
  }
};

  const handleResetQueue = () => {
    setResetQueueModalOpen(true);
    setShowAdminDropdown(false);
  };

  const confirmResetQueue = async () => {
    try {
      const response = await fetch("/api/admin/reset-queue", {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Antrian berhasil direset.");
        fetchComplaints();
      } else {
        const error = await response.json();
        toast.error(`Gagal mereset antrian: ${error.message}`);
      }
    } catch (error) {
      console.error("Error resetting queue:", error);
      toast.error("Terjadi kesalahan saat mereset antrian.");
    } finally {
      setResetQueueModalOpen(false);
    }
  };

  const handleResetDatabase = () => {
    setIsResetModalOpen(true);
  };

  const confirmResetDatabase = async () => {
    try {
      const response = await fetch('/api/admin/reset-database', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: resetPassword }),
      });

      if (response.ok) {
        toast.success('Database berhasil direset.');
        fetchComplaints();
        setIsResetModalOpen(false);
        setResetPassword('');
      } else {
        const errorData = await response.json();
        toast.error(`Gagal mereset database: ${errorData.message}`);
      }
    } catch (error) {
      console.error('Error while resetting database:', error);
      toast.error('Terjadi kesalahan saat mencoba mereset database.');
    }
  };

const openEditModal = (complaint: Complaint) => {
  setEditingComplaint(complaint);
  setEditFormData({ ...complaint, notes: complaint.notes || "" });
  setShowEditModal(true);
  setShowDropdown(null);
};

const updateComplaint = async () => {
  if (!editingComplaint) return;
  
  await fetch("/api/complaints", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      id: editingComplaint.id, 
      ...editFormData 
    }),
  });
  
  setShowEditModal(false);
  setEditingComplaint(null);
  setEditFormData({});
  fetchComplaints();
};

const toggleDropdown = (id: string) => {
  setShowDropdown(prev => (prev === id ? null : id));
};

const showComplaintDetail = (complaint: Complaint) => {
  // Ambil data terbaru dari state agar notes selalu update
  const latest = complaints.find((x) => x.id === complaint.id);
  if (latest) {
    setSelectedComplaint(latest);
  } else {
    setSelectedComplaint(complaint);
  }
  setShowDetailModal(true);
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
    "Catatan Admin"
  ];
  
  // Gunakan data complaints langsung, bukan getFilteredComplaints()
  let dataToExport = complaints;
  
  // Filter berdasarkan dateFilter jika bukan 'all'
  if (dateFilter !== 'all') {
    const now = new Date();
    const filterDate = new Date();
    
    switch (dateFilter) {
      case '1day':
        filterDate.setDate(now.getDate() - 1);
        break;
      case '7days':
        filterDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        filterDate.setDate(now.getDate() - 30);
        break;
    }
    
    dataToExport = complaints.filter(c => 
      c.status === "Selesai" && new Date(c.createdAt) >= filterDate
    );
  } else {
    dataToExport = complaints.filter(c => c.status === "Selesai");
  }
  
  const rows = dataToExport.map((c) => [
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
    c.notes || "-"
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
  const finished = getFilteredComplaints()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

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
    <div className="min-h-screen bg-gray-50" onClick={() => { setShowDropdown(null); setShowDateFilter(false); setShowFinishedDateFilter(false); }}>
      <div className="relative" onClick={(e) => e.stopPropagation()}></div>
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
              <div className="relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAdminDropdown(!showAdminDropdown);
                  }}
                  className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"
                >
                  <svg
                    className="w-5 h-5 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {showAdminDropdown && (
                  <div
                    className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg border border-gray-200 z-20"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="py-1">
                      <div className="px-4 py-2">
                        <p className="text-sm font-semibold text-gray-800">
                          {session?.user?.name || "Administrator"}
                        </p>
                        <p className="text-xs text-gray-500">
                          Online
                        </p>
                      </div>
                      <div className="border-t border-gray-100"></div>
                      <Link
                        href="/settings"
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        <span>Pengaturan</span>
                      </Link>
                      <button
                        onClick={handleResetQueue}
                        className="flex items-center space-x-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h5M4 18v-5h5m11-4h-5V4m5 14h-5v-5"></path></svg>
                        <span>Reset Nomor Antrian</span>
                      </button>
                      <button
                        onClick={handleResetDatabase}
                        className="flex items-center space-x-2 w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        <span>Reset Database</span>
                      </button>
                      <div className="border-t border-gray-100"></div>
                      <button
                        onClick={() => signOut({ callbackUrl: "https://antreanx.a1dev.id" })}
                        className="flex items-center space-x-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
      <div className="flex items-center space-x-3">
        <div className="text-sm text-gray-600">
          Filter: <span className="font-medium">{getFilterLabel()}</span>
        </div>
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDateFilter(!showDateFilter);
            }}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span>Pilih Periode</span>
          </button>
          
          {showDateFilter && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10" onClick={(e) => e.stopPropagation()}>
              <div className="py-1">
                <button
                  onClick={() => {
                    setDateFilter('all');
                    setShowDateFilter(false);
                  }}
                  className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                    dateFilter === 'all' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Semua Waktu
                </button>
                <button
                  onClick={() => {
                    setDateFilter('1day');
                    setShowDateFilter(false);
                  }}
                  className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                    dateFilter === '1day' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Hari Ini
                </button>
                <button
                  onClick={() => {
                    setDateFilter('7days');
                    setShowDateFilter(false);
                  }}
                  className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                    dateFilter === '7days' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  7 Hari Terakhir
                </button>
                <button
                  onClick={() => {
                    setDateFilter('30days');
                    setShowDateFilter(false);
                  }}
                  className={`block w-full text-left px-4 py-2 text-sm transition-colors ${
                    dateFilter === '30days' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  30 Hari Terakhir
                </button>
              </div>
            </div>
          )}
        </div>
        <button
          onClick={exportToCSV}
          className="bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Export ke CSV ({getFilteredComplaints().length} data)</span>
        </button>
      </div>
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

                    <div className="bg-white rounded-lg p-4 border-l-4 border-blue-500 mt-4">
  <h4 className="text-sm font-medium text-gray-900 mb-2">Catatan Admin:</h4>
  <textarea
    className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    placeholder="Tulis catatan untuk pelanggan ini..."
    rows={3}
    value={tempNotes[c.id] ?? c.notes ?? ""}
    onChange={(e) => handleNotesChange(c.id, e.target.value)}
    onBlur={() => saveNotes(c.id)}
  />
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
              <div className="flex items-center space-x-4">
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFinishedDateFilter(!showFinishedDateFilter);
                    }}
                    className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <span>Filter: {getFilterLabel()}</span>
                    <svg className="-mr-1 ml-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {showFinishedDateFilter && (
                    <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                      <div className="py-1">
                        <button onClick={() => { setDateFilter('all'); setShowFinishedDateFilter(false); }} className={`block w-full text-left px-4 py-2 text-sm transition-colors ${dateFilter === 'all' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                          Semua Waktu
                        </button>
                        <button onClick={() => { setDateFilter('1day'); setShowFinishedDateFilter(false); }} className={`block w-full text-left px-4 py-2 text-sm transition-colors ${dateFilter === '1day' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                          Hari Ini
                        </button>
                        <button onClick={() => { setDateFilter('7days'); setShowFinishedDateFilter(false); }} className={`block w-full text-left px-4 py-2 text-sm transition-colors ${dateFilter === '7days' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                          7 Hari Terakhir
                        </button>
                        <button onClick={() => { setDateFilter('30days'); setShowFinishedDateFilter(false); }} className={`block w-full text-left px-4 py-2 text-sm transition-colors ${dateFilter === '30days' ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'}`}>
                          30 Hari Terakhir
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="text-sm text-gray-500">
                  {finished.length} antrian selesai
                </div>
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
                  <div key={c.id} onClick={e => e.stopPropagation()} className="bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
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
  <div className="flex items-center space-x-3">
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
<div className="relative">
  <button
    onClick={() => toggleDropdown(c.id)}
    className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
    title="Opsi"
  >
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/>
    </svg>
  </button>
  
  {showDropdown === c.id && (
    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
      <div className="py-1">
        <button
          onClick={() => {
            showComplaintDetail(c);
            setShowDropdown(null);
          }}
          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Lihat Detail</span>
          </div>
        </button>
        <button
          onClick={() => openEditModal(c)}
          className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span>Edit</span>
          </div>
        </button>
        <button
          onClick={() => deleteComplaint(c.id)}
          className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
        >
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span>Hapus</span>
          </div>
        </button>
      </div>
    </div>
  )}
</div>
    
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
       {/* MODAL DETAIL */}
      {showDetailModal && selectedComplaint && (
        (() => {
          // Ambil data complaint terbaru dari state agar notes selalu update
          const latest = complaints.find((x) => x.id === selectedComplaint.id) || selectedComplaint;
          return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b">
                  <h2 className="text-xl font-semibold text-gray-900">Detail Pelanggan</h2>
                  <button
                    onClick={() => setShowDetailModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label="Tutup Modal"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Nama</h3>
                      <p className="text-gray-900">{latest.name}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Nomor Antrian</h3>
                      <p className="text-gray-900">{latest.queueNumber}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Perusahaan</h3>
                      <p className="text-gray-900">{latest.company}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Telepon</h3>
                      <p className="text-gray-900">{latest.phone}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Kategori</h3>
                      <p className="text-gray-900">{latest.category || "-"}</p>
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-500">Device</h3>
                      <p className="text-gray-900">{latest.deviceType || "-"}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Detail Keluhan</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-900">{latest.complaint}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Catatan</h3>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-gray-900">{latest.notes?.trim() ? latest.notes : "Tidak ada catatan"}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()
      )}
      {/* MODAL EDIT */}
{showEditModal && editingComplaint && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg max-w-2xl w-full mx-4">
      <div className="flex justify-between items-center p-6 border-b">
        <h2 className="text-xl font-semibold text-gray-900">Edit Data Pelanggan</h2>
        <button
          onClick={() => {
            setShowEditModal(false);
            setEditingComplaint(null);
            setEditFormData({});
          }}
          className="text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Tutup Modal"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nama</label>
            <input
              type="text"
              value={editFormData.name || ""}
              onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Perusahaan</label>
            <input
              type="text"
              value={editFormData.company || ""}
              onChange={(e) => setEditFormData({...editFormData, company: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Telepon</label>
            <input
              type="text"
              value={editFormData.phone || ""}
              onChange={(e) => setEditFormData({...editFormData, phone: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Kategori</label>
            <input
              type="text"
              value={editFormData.category || ""}
              onChange={(e) => setEditFormData({...editFormData, category: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Device Type</label>
            <input
              type="text"
              value={editFormData.deviceType || ""}
              onChange={(e) => setEditFormData({...editFormData, deviceType: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">No Internet</label>
            <input
              type="text"
              value={editFormData.noInternet || ""}
              onChange={(e) => setEditFormData({...editFormData, noInternet: e.target.value})}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Keluhan</label>
          <textarea
            value={editFormData.complaint || ""}
            onChange={(e) => setEditFormData({...editFormData, complaint: e.target.value})}
            rows={4}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Catatan</label>
          <textarea
            value={editFormData.notes || ""}
            onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})}
            rows={4}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>
      
      <div className="flex justify-end space-x-3 p-6 border-t">
        <button
          onClick={() => setShowEditModal(false)}
          className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Batal
        </button>
        <button
          onClick={updateComplaint}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Simpan
        </button>
      </div>
    </div>
  </div>
)}

    {isResetModalOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-md w-full mx-4">
          <div className="flex justify-between items-center p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Konfirmasi Reset Database</h2>
            <button
              onClick={() => {
                setIsResetModalOpen(false);
                setResetPassword('');
              }}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Tutup Modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600">
              Tindakan ini akan menghapus semua data. Untuk melanjutkan, masukkan password Anda.
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                placeholder="Masukkan password Anda"
              />
            </div>
          </div>
          <div className="flex justify-end space-x-3 p-6 border-t">
            <button
              onClick={() => {
                setIsResetModalOpen(false);
                setResetPassword('');
              }}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={confirmResetDatabase}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Hapus
            </button>
          </div>
        </div>
      </div>
    )}

    {isResetQueueModalOpen && (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg max-w-md w-full mx-4">
          <div className="flex justify-between items-center p-6 border-b">
            <h2 className="text-xl font-semibold text-gray-900">
              Konfirmasi Reset Antrian
            </h2>
            <button
              onClick={() => setResetQueueModalOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Tutup Modal"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600">
              Apakah Anda yakin ingin mereset nomor antrian yang sedang
              berjalan?
            </p>
          </div>
          <div className="flex justify-end space-x-3 p-6 border-t">
            <button
              onClick={() => setResetQueueModalOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={confirmResetQueue}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Ya, Reset
            </button>
          </div>
        </div>
      </div>
    )}
    </div>
  );
}
