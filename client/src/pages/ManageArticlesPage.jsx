import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

function ManageArticlesPage() {
  const { user } = useAuth();
  const [articles, setArticles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchArticles = async () => {
    setIsLoading(true);
    setError('');

    try {
      const { data } = await api.get('/articles/manage', {
        params: { page: 1, limit: 100 }
      });
      setArticles(data.data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Gagal memuat data renungan.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, []);

  const reviewArticle = async (id, action) => {
    try {
      await api.patch(`/articles/${id}/review`, { action });
      fetchArticles();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Gagal memproses approval.');
    }
  };

  const deleteArticle = async (article) => {
    const confirmed = window.confirm(`Hapus renungan "${article.title}"?`);
    if (!confirmed) {
      return;
    }

    try {
      await api.delete(`/articles/${article.id}`);
      fetchArticles();
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Gagal menghapus renungan.');
    }
  };

  return (
    <section className="page-stack admin-shell space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold text-brand-900 dark:text-white">Manajemen Renungan</h1>
        <Link to="/dashboard/articles/new" className="btn-primary !px-5 !py-2.5 text-sm">+ Buat Renungan</Link>
      </div>

      {isLoading && <p className="text-sm text-brand-600 dark:text-brand-400">Loading...</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="space-y-3">
        {articles.map((article) => (
          <div key={article.id} className="admin-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-brand-900 dark:text-white">{article.title}</h2>
                <p className="text-sm text-brand-500 dark:text-brand-400">
                  Status: {article.status}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  to={`/dashboard/articles/${article.id}/edit`}
                  className="rounded-full bg-amber-600 px-3 py-1 text-sm text-white transition-all hover:bg-amber-700"
                >
                  Edit
                </Link>
                <button
                  onClick={() => deleteArticle(article)}
                  className="rounded-full bg-rose-600 px-3 py-1 text-sm text-white transition-all hover:bg-rose-700"
                >
                  Hapus
                </button>

                {user?.role === 'admin' && article.status === 'pending' && (
                  <>
                    <button onClick={() => reviewArticle(article.id, 'approve')} className="rounded-full bg-emerald-600 px-3 py-1 text-sm text-white transition-all hover:bg-emerald-700">Approve</button>
                    <button onClick={() => reviewArticle(article.id, 'reject')} className="rounded-full bg-slate-700 px-3 py-1 text-sm text-white transition-all hover:bg-slate-800">Reject</button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default ManageArticlesPage;
