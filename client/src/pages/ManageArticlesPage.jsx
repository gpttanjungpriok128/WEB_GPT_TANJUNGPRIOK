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
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Manajemen Renungan</h1>
        <Link to="/dashboard/articles/new" className="rounded bg-primary px-4 py-2 text-white">+ Buat Renungan</Link>
      </div>

      {isLoading && <p>Loading...</p>}
      {error && <p className="text-sm text-rose-600">{error}</p>}

      <div className="space-y-3">
        {articles.map((article) => (
          <div key={article.id} className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{article.title}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Status: {article.status}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  to={`/dashboard/articles/${article.id}/edit`}
                  className="rounded bg-amber-600 px-3 py-1 text-sm text-white"
                >
                  Edit
                </Link>
                <button
                  onClick={() => deleteArticle(article)}
                  className="rounded bg-rose-600 px-3 py-1 text-sm text-white"
                >
                  Hapus
                </button>

                {user?.role === 'admin' && article.status === 'pending' && (
                  <>
                    <button onClick={() => reviewArticle(article.id, 'approve')} className="rounded bg-emerald-600 px-3 py-1 text-sm text-white">Approve</button>
                    <button onClick={() => reviewArticle(article.id, 'reject')} className="rounded bg-slate-700 px-3 py-1 text-sm text-white">Reject</button>
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
