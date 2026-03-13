import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import PageHero from "../components/PageHero";
import heroImage from "../img/hero-gallery.jpeg";
import { buildCacheKey, getCacheSnapshot, swrGet } from "../utils/swrCache";

function GalleryPage() {
  const { user } = useAuth();
  const [albums, setAlbums] = useState([]);
  const [albumMeta, setAlbumMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [albumPage, setAlbumPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedAlbumTitle, setSelectedAlbumTitle] = useState(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState(null);
  const [albumPhotos, setAlbumPhotos] = useState([]);
  const [albumPhotosMeta, setAlbumPhotosMeta] = useState({ page: 1, totalPages: 1, total: 0 });
  const [isLoadingAlbumPhotos, setIsLoadingAlbumPhotos] = useState(false);

  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadTargetType, setUploadTargetType] = useState("existing");
  const [uploadExistingTitle, setUploadExistingTitle] = useState("");
  const [uploadFiles, setUploadFiles] = useState([]);
  const [uploadInputKey, setUploadInputKey] = useState(0);
  const [uploadMessage, setUploadMessage] = useState({ type: "", text: "" });
  const [isUploading, setIsUploading] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editImage, setEditImage] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [actionMessage, setActionMessage] = useState({ type: "", text: "" });

  const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:5000";
  const canUpload = ["admin", "multimedia"].includes(user?.role);
  const isAdmin = user?.role === "admin";
  const ALBUM_PAGE_SIZE = 12;
  const PHOTO_PAGE_SIZE = 24;

  const fetchAlbums = async ({ page = 1, append = false } = {}) => {
    const params = {
      page,
      limit: ALBUM_PAGE_SIZE,
      search: debouncedSearch || undefined
    };
    const cacheKey = buildCacheKey("/galleries", { params });
    const cached = append ? null : getCacheSnapshot(cacheKey);
    if (cached?.data?.data && !append) {
      setAlbums(cached.data.data);
      setAlbumMeta(cached.data.meta || { page, totalPages: 1, total: cached.data.data.length });
      setAlbumPage(page);
    }
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(!cached);
    }
    try {
      const { data } = await swrGet("/galleries", { params }, {
        ttlMs: 60 * 1000,
        onUpdate: append
          ? undefined
          : (payload) => {
            const nextAlbums = Array.isArray(payload?.data) ? payload.data : [];
            setAlbums(nextAlbums);
            setAlbumMeta(payload?.meta || { page, totalPages: 1, total: nextAlbums.length });
            setAlbumPage(page);
          }
      });
      const nextAlbums = Array.isArray(data?.data) ? data.data : [];
      setAlbums((prev) => {
        if (!append) return nextAlbums;
        const merged = [...prev, ...nextAlbums];
        const unique = new Map();
        merged.forEach((album) => {
          unique.set(album.title, album);
        });
        return Array.from(unique.values());
      });
      setAlbumMeta(data?.meta || { page, totalPages: 1, total: nextAlbums.length });
      setAlbumPage(page);
    } catch {
      if (!append) {
        setAlbums([]);
        setAlbumMeta({ page: 1, totalPages: 1, total: 0 });
      }
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
    }, 350);
    return () => clearTimeout(handle);
  }, [searchQuery]);

  useEffect(() => {
    fetchAlbums({ page: 1, append: false });
  }, [debouncedSearch]);

  useEffect(() => {
    if (albums.length === 0) {
      setUploadTargetType("new");
      setUploadExistingTitle("");
      return;
    }
    if (uploadTargetType === "existing" && !uploadExistingTitle) {
      setUploadExistingTitle(albums[0].title);
    }
  }, [albums, uploadTargetType, uploadExistingTitle]);

  const activeAlbum = useMemo(
    () => {
      const summary = albums.find((album) => album.title === selectedAlbumTitle) || null;
      if (!summary) return null;
      return { ...summary, photos: albumPhotos };
    },
    [albums, selectedAlbumTitle, albumPhotos],
  );

  const activePhoto = useMemo(() => {
    if (!activeAlbum) return null;
    return activeAlbum.photos.find((photo) => photo.id === selectedPhotoId) || activeAlbum.photos[0] || null;
  }, [activeAlbum, selectedPhotoId]);

  useEffect(() => {
    if (!selectedAlbumTitle) return;
    if (!activeAlbum) { setSelectedAlbumTitle(null); setSelectedPhotoId(null); return; }
    if (!activeAlbum.photos.some((photo) => photo.id === selectedPhotoId)) {
      setSelectedPhotoId(activeAlbum.photos[0]?.id || null);
    }
  }, [selectedAlbumTitle, activeAlbum, selectedPhotoId]);

  const formatDate = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" });
  };

  const totalPhotosShown = useMemo(
    () => albums.reduce((sum, album) => sum + (Number(album.total) || 0), 0),
    [albums],
  );

  const fetchAlbumPhotos = async ({ title, page = 1, append = false }) => {
    if (!title) return;
    const params = { page, limit: PHOTO_PAGE_SIZE };
    const url = `/galleries/album/${encodeURIComponent(title)}`;
    const cacheKey = buildCacheKey(url, { params });
    const cached = append ? null : getCacheSnapshot(cacheKey);
    if (cached?.data?.data && !append) {
      setAlbumPhotos(cached.data.data);
      setAlbumPhotosMeta(cached.data.meta || { page, totalPages: 1, total: cached.data.data.length });
    }
    setIsLoadingAlbumPhotos(!cached);
    try {
      const { data } = await swrGet(url, { params }, {
        ttlMs: 60 * 1000,
        onUpdate: append
          ? undefined
          : (payload) => {
            const nextPhotos = Array.isArray(payload?.data) ? payload.data : [];
            setAlbumPhotos(nextPhotos);
            setAlbumPhotosMeta(payload?.meta || { page, totalPages: 1, total: nextPhotos.length });
          }
      });
      const nextPhotos = Array.isArray(data?.data) ? data.data : [];
      setAlbumPhotos((prev) => (append ? [...prev, ...nextPhotos] : nextPhotos));
      setAlbumPhotosMeta(data?.meta || { page, totalPages: 1, total: nextPhotos.length });
    } catch {
      if (!append) {
        setAlbumPhotos([]);
        setAlbumPhotosMeta({ page: 1, totalPages: 1, total: 0 });
      }
    } finally {
      setIsLoadingAlbumPhotos(false);
    }
  };

  const openAlbum = (album) => {
    setSelectedAlbumTitle(album.title);
    setSelectedPhotoId(null);
    setIsEditing(false);
    setEditImage(null);
    setActionMessage({ type: "", text: "" });
    fetchAlbumPhotos({ title: album.title, page: 1, append: false });
  };
  const closeAlbum = () => {
    setSelectedAlbumTitle(null);
    setSelectedPhotoId(null);
    setIsEditing(false);
    setEditImage(null);
    setActionMessage({ type: "", text: "" });
    setAlbumPhotos([]);
    setAlbumPhotosMeta({ page: 1, totalPages: 1, total: 0 });
  };

  const uploadGallery = async (event) => {
    event.preventDefault();
    setUploadMessage({ type: "", text: "" });
    const effectiveTitle = uploadTargetType === "existing" ? String(uploadExistingTitle || "").trim() : uploadTitle.trim();
    if (!effectiveTitle || !uploadFiles.length) {
      setUploadMessage({ type: "error", text: "Pilih/buat album dan tambahkan minimal 1 foto." });
      return;
    }
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("title", effectiveTitle);
      uploadFiles.forEach((file) => formData.append("images", file));
      await api.post("/galleries", formData, { headers: { "Content-Type": "multipart/form-data" } });
      setUploadTitle("");
      setUploadExistingTitle("");
      setUploadFiles([]);
      setUploadInputKey((v) => v + 1);
      setUploadMessage({ type: "success", text: `${uploadFiles.length} foto berhasil diupload ke album "${effectiveTitle}".` });
      fetchAlbums({ page: 1, append: false });
      if (selectedAlbumTitle && selectedAlbumTitle === effectiveTitle) {
        fetchAlbumPhotos({ title: effectiveTitle, page: 1, append: false });
      }
    } catch (error) {
      setUploadMessage({ type: "error", text: error.response?.data?.message || "Gagal upload foto galeri." });
    } finally {
      setIsUploading(false);
    }
  };

  const startEditPhoto = () => { if (!activePhoto) return; setEditTitle(activePhoto.title || ""); setEditImage(null); setIsEditing(true); setActionMessage({ type: "", text: "" }); };

  const savePhotoEdit = async (event) => {
    event.preventDefault();
    if (!activePhoto) return;
    const title = editTitle.trim();
    if (!title) { setActionMessage({ type: "error", text: "Judul foto tidak boleh kosong." }); return; }
    setIsSavingEdit(true);
    setActionMessage({ type: "", text: "" });
    try {
      const formData = new FormData();
      formData.append("title", title);
      if (editImage) formData.append("image", editImage);
      const res = await api.put(`/galleries/${activePhoto.id}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      const updated = res.data;
      fetchAlbums({ page: 1, append: false });
      fetchAlbumPhotos({ title: updated.title, page: 1, append: false });
      setSelectedAlbumTitle(updated.title);
      setSelectedPhotoId(updated.id);
      setIsEditing(false);
      setEditImage(null);
      setActionMessage({ type: "success", text: "Foto berhasil diperbarui." });
    } catch (error) {
      setActionMessage({ type: "error", text: error.response?.data?.message || "Gagal memperbarui foto." });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const deletePhoto = async () => {
    if (!activePhoto) return;
    const confirmed = window.confirm("Yakin ingin menghapus foto ini dari galeri?");
    if (!confirmed) return;
    const currentAlbumPhotos = activeAlbum?.photos || [];
    const currentIndex = currentAlbumPhotos.findIndex((photo) => photo.id === activePhoto.id);
    const nextPhoto = currentAlbumPhotos[currentIndex + 1] || currentAlbumPhotos[currentIndex - 1] || null;
    setIsDeleting(true);
    setActionMessage({ type: "", text: "" });
    try {
      await api.delete(`/galleries/${activePhoto.id}`);
      fetchAlbums({ page: 1, append: false });
      if (selectedAlbumTitle) {
        fetchAlbumPhotos({ title: selectedAlbumTitle, page: 1, append: false });
      }
      setSelectedPhotoId(nextPhoto ? nextPhoto.id : null);
      setActionMessage({ type: "success", text: "Foto berhasil dihapus." });
    } catch (error) {
      setActionMessage({ type: "error", text: error.response?.data?.message || "Gagal menghapus foto." });
    } finally {
      setIsDeleting(false);
    }
  };

  const MessageBanner = ({ msg }) => msg?.text ? (
    <div className={`rounded-xl p-3 text-sm ${
      msg.type === "success"
        ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
        : "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300 border border-rose-200 dark:border-rose-800"
    }`}>{msg.text}</div>
  ) : null;

  return (
    <div className="page-stack space-y-6 sm:space-y-8">
      <PageHero
        image={heroImage}
        title="Galeri"
        titleAccent="Kegiatan"
        subtitle="Dokumentasi momen berharga dari kegiatan dan acara gereja kami"
      />

      {/* Stats */}
      <section className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Album", value: albumMeta.total },
          { label: "Foto Ditampilkan", value: totalPhotosShown },
          { label: "Album Ditampilkan", value: albums.length },
        ].map((stat, i) => (
          <div key={i} className="glass-card p-5">
            <p className="text-xs uppercase text-brand-500 dark:text-brand-400 font-medium tracking-wider">{stat.label}</p>
            <p className="mt-1 text-3xl font-bold gradient-text">{stat.value}</p>
          </div>
        ))}
      </section>

      {/* Upload Section */}
      {canUpload && (
        <section className="glass-card p-6 space-y-4">
          <h2 className="text-xl font-bold text-brand-900 dark:text-white">Upload Album Galeri</h2>
          <form onSubmit={uploadGallery} className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {["existing", "new"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setUploadTargetType(type)}
                  disabled={type === "existing" && albums.length === 0}
                  className={`rounded-xl px-5 py-2 text-sm font-medium transition-all ${
                    uploadTargetType === type
                      ? "bg-primary text-white shadow-sm"
                      : "border border-brand-200 text-brand-700 dark:border-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-800/50"
                  } disabled:cursor-not-allowed disabled:opacity-40`}
                >
                  {type === "existing" ? "Tambah ke Album Existing" : "Buat Album Baru"}
                </button>
              ))}
            </div>
            {albums.length === 0 && (
              <p className="text-sm text-brand-600 dark:text-brand-400">Belum ada album existing. Silakan buat album baru terlebih dahulu.</p>
            )}
            {uploadTargetType === "existing" ? (
              <select
                value={uploadExistingTitle}
                onChange={(e) => setUploadExistingTitle(e.target.value)}
                className="input-modern"
                required
              >
                <option value="">Pilih album</option>
                {albums.map((album) => (
                  <option key={album.title} value={album.title}>{album.title} ({album.total} foto)</option>
                ))}
              </select>
            ) : (
              <input type="text" placeholder="Judul album baru" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} className="input-modern" required />
            )}
            <input key={uploadInputKey} type="file" accept="image/*" multiple onChange={(e) => setUploadFiles(Array.from(e.target.files || []))} className="input-modern !p-2" required />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-brand-600 dark:text-brand-400">
                {uploadFiles.length > 0 ? `${uploadFiles.length} file siap diupload.` : "Pilih foto untuk album."}
              </p>
              <button type="submit" disabled={isUploading} className="btn-primary !text-sm disabled:opacity-60">
                {isUploading ? "Mengupload..." : "Upload Foto"}
              </button>
            </div>
          </form>
          <MessageBanner msg={uploadMessage} />
        </section>
      )}

      {/* Search */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-400">🔍</span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Cari album berdasarkan judul..."
          className="input-modern !pl-11"
        />
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 rounded-full border-[3px] border-brand-200 border-t-primary animate-spin" />
        </div>
      )}

      {/* Album Grid */}
      {!isLoading && albums.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {albums.map((album) => (
            <button
              key={album.title}
              type="button"
              onClick={() => openAlbum(album)}
              className="group overflow-hidden rounded-2xl border border-brand-200 dark:border-brand-700 bg-white dark:bg-brand-900/40 text-left transition-all duration-400 hover:shadow-glass-lg hover:-translate-y-1"
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-brand-100 dark:bg-brand-800">
                <img
                  src={`${serverUrl}${album.cover.image}`}
                  alt={album.title}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute right-3 top-3 rounded-full bg-white/90 dark:bg-brand-900/90 backdrop-blur-sm px-3 py-1 text-xs font-semibold text-brand-800 dark:text-brand-200">
                  {album.total} foto
                </div>
              </div>
              <div className="p-4 space-y-1">
                <h3 className="line-clamp-2 text-lg font-semibold text-brand-800 dark:text-white group-hover:text-primary transition-colors">
                  {album.title}
                </h3>
                <p className="text-sm text-brand-600 dark:text-brand-400">
                  Update: {formatDate(album.updatedAt)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {!isLoading && albums.length > 0 && albumPage < albumMeta.totalPages && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => fetchAlbums({ page: albumPage + 1, append: true })}
            disabled={isLoadingMore}
            className="btn-outline !px-6 !py-2.5 text-sm disabled:opacity-60"
          >
            {isLoadingMore ? "Memuat..." : "Muat Album Lainnya"}
          </button>
        </div>
      )}

      {/* No Albums */}
      {!isLoading && albums.length === 0 && (
        <div className="glass-card py-14 text-center">
          <div className="mb-3 text-5xl">📸</div>
          <p className="text-brand-600 dark:text-brand-400">Album galeri belum tersedia.</p>
        </div>
      )}

      {/* Album Modal */}
      {activeAlbum && (
        <div className="modal-overlay" onClick={closeAlbum}>
          <div className="modal-content mx-4 flex h-full max-h-[92vh] w-full max-w-6xl flex-col rounded-2xl bg-white dark:bg-brand-950 border border-brand-200 dark:border-brand-700 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-brand-200 dark:border-brand-700 p-4">
              <div>
                <h2 className="text-lg font-bold text-brand-900 dark:text-white">{activeAlbum.title}</h2>
                <p className="text-sm text-brand-600 dark:text-brand-400">{activeAlbum.total} foto</p>
              </div>
              <button type="button" onClick={closeAlbum} className="rounded-xl border border-brand-200 dark:border-brand-700 px-4 py-1.5 text-sm font-medium hover:bg-brand-50 dark:hover:bg-brand-800/50 transition-all">
                Tutup
              </button>
            </div>

            <div className="grid flex-1 gap-4 overflow-hidden p-4 lg:grid-cols-3">
              <div className="space-y-4 lg:col-span-2 overflow-y-auto">
                <div className="aspect-video overflow-hidden rounded-xl bg-black flex items-center justify-center">
                  {isLoadingAlbumPhotos ? (
                    <div className="h-10 w-10 rounded-full border-[3px] border-white/40 border-t-white animate-spin" />
                  ) : activePhoto ? (
                    <img
                      src={`${serverUrl}${activePhoto.image}`}
                      alt={activePhoto.title}
                      loading="eager"
                      decoding="async"
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <p className="text-sm text-white/70">Belum ada foto.</p>
                  )}
                </div>
                <div className="glass-card p-4">
                  <p className="text-xs uppercase text-brand-500 dark:text-brand-400 font-medium tracking-wider">Judul Foto</p>
                  <p className="mt-1 font-semibold text-brand-800 dark:text-white">{activePhoto?.title || "-"}</p>
                  <p className="mt-1 text-sm text-brand-600 dark:text-brand-400">Uploaded: {formatDate(activePhoto?.createdAt)}</p>
                </div>

                {isAdmin && (
                  <div className="glass-card p-4 space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={startEditPhoto} className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-all">Edit Foto</button>
                      <button type="button" onClick={deletePhoto} disabled={isDeleting} className="rounded-xl bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-60 transition-all">
                        {isDeleting ? "Menghapus..." : "Hapus Foto"}
                      </button>
                    </div>
                    {isEditing && (
                      <form onSubmit={savePhotoEdit} className="space-y-3">
                        <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="input-modern" placeholder="Judul foto" required />
                        <input type="file" accept="image/*" onChange={(e) => setEditImage(e.target.files?.[0] || null)} className="input-modern !p-2" />
                        <div className="flex flex-wrap gap-2">
                          <button type="submit" disabled={isSavingEdit} className="btn-primary !text-sm disabled:opacity-60">
                            {isSavingEdit ? "Menyimpan..." : "Simpan Perubahan"}
                          </button>
                          <button type="button" onClick={() => { setIsEditing(false); setEditImage(null); }} className="rounded-xl border border-brand-200 dark:border-brand-700 px-4 py-2 text-sm font-medium hover:bg-brand-50 dark:hover:bg-brand-800/50 transition-all">
                            Batal
                          </button>
                        </div>
                      </form>
                    )}
                    <MessageBanner msg={actionMessage} />
                  </div>
                )}
              </div>

              <div className="overflow-y-auto rounded-xl border border-brand-200 dark:border-brand-700 p-3">
                <p className="mb-3 text-sm font-semibold text-brand-600 dark:text-brand-400">Daftar Foto Album</p>
                {isLoadingAlbumPhotos ? (
                  <div className="flex justify-center py-6">
                    <div className="h-8 w-8 rounded-full border-[3px] border-brand-200 border-t-primary animate-spin" />
                  </div>
                ) : activeAlbum.photos.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-2">
                    {activeAlbum.photos.map((photo) => (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => { setSelectedPhotoId(photo.id); setIsEditing(false); setEditImage(null); setActionMessage({ type: "", text: "" }); }}
                        className={`overflow-hidden rounded-xl border-2 transition-all ${
                          photo.id === activePhoto?.id
                            ? "border-primary ring-2 ring-primary/20 shadow-glow"
                            : "border-brand-200 dark:border-brand-700 hover:border-primary/50"
                        }`}
                      >
                        <img
                          src={`${serverUrl}${photo.image}`}
                          alt={photo.title}
                          loading="lazy"
                          decoding="async"
                          className="aspect-square h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-brand-500 dark:text-brand-400">Belum ada foto di album ini.</p>
                )}

                {!isLoadingAlbumPhotos && activeAlbum.photos.length > 0 && albumPhotosMeta.page < albumPhotosMeta.totalPages && (
                  <div className="mt-4 flex justify-center">
                    <button
                      type="button"
                      onClick={() => fetchAlbumPhotos({ title: activeAlbum.title, page: albumPhotosMeta.page + 1, append: true })}
                      className="btn-outline !px-4 !py-2 text-xs"
                    >
                      Muat Foto Lainnya
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default GalleryPage;
