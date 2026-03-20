import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import PageHero from "../components/PageHero";
import api from "../services/api";
import "../styles.admin.css";

const CATEGORY_OPTIONS = [
  { value: "kaum_pria", label: "Kaum Pria" },
  { value: "kaum_wanita", label: "Kaum Wanita" },
  { value: "kaum_muda", label: "Kaum Muda" },
  { value: "sekolah_minggu", label: "Sekolah Minggu" },
];

const initialForm = {
  fullName: "",
  birthDate: "",
  category: "kaum_pria",
  phone: "",
  address: "",
};

function CongregationDataPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });

  const isAdmin = user?.role === "admin";
  const isJemaat = user?.role === "jemaat";
  const canAccess = isAdmin || isJemaat;

  const fetchMembers = async (overrides = {}) => {
    if (!isAdmin) return;

    const params = {
      search: overrides.search ?? search,
      category: overrides.category ?? categoryFilter,
    };

    setIsLoading(true);
    try {
      const { data } = await api.get("/congregation-members", { params });
      setMembers(Array.isArray(data) ? data : []);
    } catch (error) {
      setMembers([]);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Gagal memuat data jemaat.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchMembers();
    }
  }, [isAdmin]);

  const resetForm = () => {
    setEditingId(null);
    setForm(initialForm);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage({ type: "", text: "" });

    try {
      if (isAdmin && editingId) {
        await api.put(`/congregation-members/${editingId}`, form);
        setMessage({ type: "success", text: "Data jemaat berhasil diperbarui." });
      } else {
        await api.post("/congregation-members", form);
        setMessage({ type: "success", text: "Data jemaat berhasil dikirim." });
      }

      resetForm();
      if (isAdmin) {
        fetchMembers();
      }
    } catch (error) {
      const firstValidationError = error.response?.data?.errors?.[0]?.msg;
      setMessage({
        type: "error",
        text: firstValidationError || error.response?.data?.message || "Gagal menyimpan data jemaat.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (member) => {
    if (!isAdmin) return;
    setEditingId(member.id);
    setForm({
      fullName: member.fullName || "",
      birthDate: member.birthDate || "",
      category: member.category || "kaum_pria",
      phone: member.phone || "",
      address: member.address || "",
    });
  };

  const handleDelete = async (member) => {
    if (!isAdmin) return;

    const confirmed = window.confirm(`Hapus data jemaat "${member.fullName}"?`);
    if (!confirmed) return;

    setMessage({ type: "", text: "" });
    try {
      await api.delete(`/congregation-members/${member.id}`);
      if (editingId === member.id) {
        resetForm();
      }
      setMessage({ type: "success", text: "Data jemaat berhasil dihapus." });
      fetchMembers();
    } catch (error) {
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Gagal menghapus data jemaat.",
      });
    }
  };

  const stats = useMemo(() => {
    return {
      total: members.length,
      kaum_pria: members.filter((item) => item.category === "kaum_pria").length,
      kaum_wanita: members.filter((item) => item.category === "kaum_wanita").length,
      kaum_muda: members.filter((item) => item.category === "kaum_muda").length,
      sekolah_minggu: members.filter((item) => item.category === "sekolah_minggu").length,
    };
  }, [members]);

  const categoryLabel = (value) =>
    CATEGORY_OPTIONS.find((item) => item.value === value)?.label || "-";

  const formatBirthDate = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const exportMembersToExcel = async () => {
    if (!members.length) return;
    const XLSX = await import("xlsx");

    const headers = [
      "No",
      "Nama Lengkap",
      "Tanggal Lahir",
      "Kategori",
      "Telephone",
      "Alamat",
      "Diinput Oleh",
    ];

    const rows = members.map((member, index) => [
      index + 1,
      member.fullName || "-",
      formatBirthDate(member.birthDate),
      categoryLabel(member.category),
      member.phone || "-",
      member.address || "-",
      member.submitter?.name
        ? `${member.submitter.name} (${member.submitter.email})`
        : "-",
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    worksheet["!cols"] = [
      { wch: 6 },
      { wch: 28 },
      { wch: 16 },
      { wch: 18 },
      { wch: 18 },
      { wch: 40 },
      { wch: 34 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Jemaat");
    XLSX.writeFile(
      workbook,
      `data-jemaat-${new Date().toISOString().slice(0, 10)}.xlsx`,
      { compression: true },
    );
  };

  if (!canAccess) {
    return (
      <section className="glass-card p-8 text-center">
        <h1 className="text-2xl font-bold text-rose-500">Akses Ditolak</h1>
        <p className="mt-2 text-sm text-brand-600 dark:text-brand-400">
          Halaman pendataan jemaat hanya untuk admin dan jemaat.
        </p>
      </section>
    );
  }

  return (
    <div className="page-stack admin-shell space-y-5 sm:space-y-6">
      <PageHero 
        title="Pendataan Jemaat" 
        subtitle={isAdmin ? "Admin dapat melihat total dan seluruh data jemaat." : "Silakan isi data diri dan keluarga. Data hanya dilihat admin."} 
      />

      {isAdmin && (
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {[
            { label: "Total", value: stats.total },
            { label: "Kaum Pria", value: stats.kaum_pria },
            { label: "Kaum Wanita", value: stats.kaum_wanita },
            { label: "Kaum Muda", value: stats.kaum_muda },
            { label: "Sekolah Minggu", value: stats.sekolah_minggu },
          ].map((stat, i) => (
            <div key={i} className="glass-card relative overflow-hidden p-6 group hover:-translate-y-1 hover:shadow-md transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-emerald-100/50 to-teal-100/20 rounded-full blur-2xl -translate-y-1/2 translate-x-1/4 group-hover:scale-150 transition-transform duration-500 dark:from-emerald-900/30 dark:to-teal-900/10 pointer-events-none" />
              <p className="relative z-10 text-[10px] uppercase text-emerald-600 dark:text-emerald-400 font-bold tracking-[0.2em] mb-1">{stat.label}</p>
              <p className="relative z-10 text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500 drop-shadow-sm">{stat.value}</p>
            </div>
          ))}
        </section>
      )}

      <section className="glass-card p-6">
        <h2 className="text-xl font-bold text-brand-900 dark:text-white">
          {isAdmin && editingId ? "Edit Data Jemaat" : "Input Data Jemaat"}
        </h2>

        <form onSubmit={handleSubmit} className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-brand-700 dark:text-brand-300">Nama Lengkap *</label>
            <input
              required
              value={form.fullName}
              onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
              className="input-modern"
              placeholder="Nama lengkap"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-brand-700 dark:text-brand-300">Tanggal Lahir *</label>
            <input
              required
              type="date"
              value={form.birthDate}
              onChange={(e) => setForm((prev) => ({ ...prev, birthDate: e.target.value }))}
              className="input-modern ios-date-fix min-w-0"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-brand-700 dark:text-brand-300">Kategori *</label>
            <select
              value={form.category}
              onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
              className="input-modern"
            >
              {CATEGORY_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-brand-700 dark:text-brand-300">Nomor Telephone (kalau ada)</label>
            <input
              value={form.phone}
              onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
              className="input-modern"
              placeholder="08xxxxxxxxxx"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium text-brand-700 dark:text-brand-300">Alamat *</label>
            <textarea
              required
              rows="3"
              value={form.address}
              onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              className="input-modern resize-none"
              placeholder="Alamat"
            />
          </div>

          <div className="md:col-span-2 flex flex-wrap gap-3">
            <button type="submit" disabled={isSaving} className="btn-primary !px-6 !py-2.5 disabled:opacity-60">
              {isSaving ? "Menyimpan..." : isAdmin && editingId ? "Update Data" : "Kirim Data"}
            </button>
            {isAdmin && editingId && (
              <button type="button" onClick={resetForm} className="btn-outline !px-6 !py-2.5">
                Batal Edit
              </button>
            )}
          </div>
        </form>

        {message.text && (
          <div
            className={`mt-4 rounded-xl p-3 text-sm ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                : "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
            }`}
          >
            {message.text}
          </div>
        )}
      </section>

      {isAdmin && (
        <>
          <section className="glass-card relative overflow-hidden p-6 shadow-sm">
            <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-teal-100/30 rounded-full blur-3xl dark:bg-teal-900/10 pointer-events-none" />
            <div className="relative z-10 flex flex-wrap items-end gap-3">
              <div className="min-w-[220px] flex-1 space-y-2">
                <label className="text-sm font-medium text-brand-700 dark:text-brand-300">Cari Nama/Telepon/Alamat</label>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-modern"
                  placeholder="Cari data"
                />
              </div>

              <div className="min-w-[220px] space-y-2">
                <label className="text-sm font-medium text-brand-700 dark:text-brand-300">Filter Kategori</label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="input-modern"
                >
                  <option value="">Semua Kategori</option>
                  {CATEGORY_OPTIONS.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <button type="button" onClick={() => fetchMembers()} className="btn-primary !px-6 !py-2.5">
                Terapkan
              </button>
              <button
                type="button"
                onClick={exportMembersToExcel}
                disabled={isLoading || members.length === 0}
                className="btn-outline !px-6 !py-2.5 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Export Excel
              </button>
            </div>
          </section>

          <section className="glass-card overflow-hidden p-0 shadow-md">
            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-sm">
                <thead className="bg-brand-50/80 dark:bg-brand-900/60">
                  <tr className="text-left text-brand-700 dark:text-brand-300">
                    <th className="px-4 py-3 font-semibold">No</th>
                    <th className="px-4 py-3 font-semibold">Nama Lengkap</th>
                    <th className="px-4 py-3 font-semibold">Tanggal Lahir</th>
                    <th className="px-4 py-3 font-semibold">Kategori</th>
                    <th className="px-4 py-3 font-semibold">Telephone</th>
                    <th className="px-4 py-3 font-semibold">Alamat</th>
                    <th className="px-4 py-3 font-semibold">Diinput Oleh</th>
                    <th className="px-4 py-3 font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading && (
                    <tr>
                      <td colSpan="8" className="px-4 py-10">
                        <div className="flex justify-center">
                          <div className="h-10 w-10 rounded-full border-[3px] border-brand-200 border-t-primary animate-spin" />
                        </div>
                      </td>
                    </tr>
                  )}

                  {!isLoading && members.length === 0 && (
                    <tr>
                      <td
                        colSpan="8"
                        className="px-4 py-8 text-center text-brand-600 dark:text-brand-400"
                      >
                        Belum ada data jemaat.
                      </td>
                    </tr>
                  )}

                  {!isLoading &&
                    members.map((member, index) => (
                      <tr
                        key={member.id}
                        className="border-t border-brand-200/70 dark:border-brand-800/70 text-brand-700 dark:text-brand-300"
                      >
                        <td className="px-4 py-3">{index + 1}</td>
                        <td className="px-4 py-3 font-medium text-brand-900 dark:text-white">
                          {member.fullName}
                        </td>
                        <td className="px-4 py-3">{formatBirthDate(member.birthDate)}</td>
                        <td className="px-4 py-3">{categoryLabel(member.category)}</td>
                        <td className="px-4 py-3">{member.phone || "-"}</td>
                        <td className="px-4 py-3 max-w-[260px] truncate" title={member.address || "-"}>
                          {member.address || "-"}
                        </td>
                        <td className="px-4 py-3">
                          {member.submitter?.name
                            ? `${member.submitter.name} (${member.submitter.email})`
                            : "-"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleEdit(member)}
                              className="rounded-full bg-amber-600 px-3 py-1 text-xs text-white transition hover:bg-amber-700"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(member)}
                              className="rounded-full bg-rose-600 px-3 py-1 text-xs text-white transition hover:bg-rose-700"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

export default CongregationDataPage;
