import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import RichTextEditor from '../components/RichTextEditor';
import DOMPurify from 'dompurify';

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
    <section className="page-stack editor-shell space-y-4">
      <h1 className="font-display text-3xl font-bold text-brand-900 dark:text-white">{isEditMode ? 'Edit Renungan' : 'CMS Renungan Editor'}</h1>

      <form onSubmit={submit} className="editor-card space-y-4 p-4">
        {isFetching && <p className="text-sm text-brand-600 dark:text-brand-400">Memuat...</p>}
        <div className="space-y-2">
          <label className="text-sm font-medium text-brand-700 dark:text-brand-300">Judul Renungan</label>
          <input
            className="input-modern w-full p-2.5"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-brand-700 dark:text-brand-300">Konten (Rich Text)</label>
          <RichTextEditor value={content} onChange={setContent} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium text-brand-700 dark:text-brand-300">Status</label>
            <select
              className="input-modern w-full p-2.5"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {statusOptions.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-brand-700 dark:text-brand-300">Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImage(e.target.files?.[0] || null)}
              className="input-modern w-full !p-2"
            />
          </div>
        </div>

        <button
          disabled={isSubmitting || isFetching}
          className="btn-primary !px-5 !py-2.5 text-sm disabled:opacity-60"
        >
          {isSubmitting ? 'Menyimpan...' : isEditMode ? 'Update Renungan' : 'Simpan Renungan'}
        </button>

        {feedback && <p className="text-sm text-brand-600 dark:text-brand-300">{feedback}</p>}
      </form>

      <div className="editor-card space-y-2 p-4">
        <h2 className="font-semibold text-brand-900 dark:text-white">Preview</h2>
        <div className="prose max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(content) }} />
      </div>
    </section>
  );
}

export default ArticleEditorPage;
