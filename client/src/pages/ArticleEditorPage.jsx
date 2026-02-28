import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import RichTextEditor from '../components/RichTextEditor';

function ArticleEditorPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('<p>Tulis konten renungan di sini...</p>');
  const [status, setStatus] = useState(user?.role === 'admin' ? 'published' : 'pending');
  const [image, setImage] = useState(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');

  const statusOptions = useMemo(() => {
    if (user?.role === 'admin') {
      return ['draft', 'pending', 'published'];
    }

    return ['draft', 'pending'];
  }, [user]);

  useEffect(() => {
    if (!isEditMode) {
      return;
    }

    async function fetchArticle() {
      setIsFetching(true);
      setFeedback('Memuat data renungan...');
      try {
        const { data } = await api.get(`/articles/${id}`);
        setTitle(data.title || '');
        setContent(data.content || '');
        setStatus(data.status || 'pending');
        setFeedback('');
      } catch (error) {
        setFeedback(error.response?.data?.message || 'Gagal memuat data renungan.');
      } finally {
        setIsFetching(false);
      }
    }

    fetchArticle();
  }, [id, isEditMode]);

  const submit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback('Menyimpan renungan...');

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('content', content);
      formData.append('status', status);
      if (image) {
        formData.append('image', image);
      }

      if (isEditMode) {
        await api.put(`/articles/${id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/articles', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      if (isEditMode) {
        setFeedback('Renungan berhasil diperbarui.');
        setTimeout(() => navigate('/dashboard/articles/manage'), 800);
        return;
      }

      setTitle('');
      setContent('<p>Tulis konten renungan di sini...</p>');
      setImage(null);
      setFeedback('Renungan berhasil disimpan.');
    } catch (error) {
      setFeedback(error.response?.data?.message || 'Gagal menyimpan renungan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">{isEditMode ? 'Edit Renungan' : 'CMS Renungan Editor'}</h1>

      <form onSubmit={submit} className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        {isFetching && <p className="text-sm">Memuat...</p>}
        <div className="space-y-2">
          <label className="text-sm font-medium">Judul Renungan</label>
          <input
            className="w-full rounded border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-950"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Konten (Rich Text)</label>
          <RichTextEditor value={content} onChange={setContent} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <select
              className="w-full rounded border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-950"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
              className="w-full rounded border border-slate-300 p-2 dark:border-slate-700 dark:bg-slate-950"
            />
          </div>
        </div>

        <button
          disabled={isSubmitting || isFetching}
          className="rounded bg-primary px-4 py-2 text-white disabled:opacity-60"
        >
          {isSubmitting ? 'Menyimpan...' : isEditMode ? 'Update Renungan' : 'Simpan Renungan'}
        </button>

        {feedback && <p className="text-sm text-slate-600 dark:text-slate-300">{feedback}</p>}
      </form>

      <div className="space-y-2 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <h2 className="font-semibold">Preview</h2>
        <div className="prose max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: content }} />
      </div>
    </section>
  );
}

export default ArticleEditorPage;
