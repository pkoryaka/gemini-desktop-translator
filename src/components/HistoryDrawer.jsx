import React, { useState } from 'react';
import { X, Search, Star, Trash2, Clock, ArrowRight, BookOpen } from 'lucide-react';
import { storageService } from '../services/storageService';

export function HistoryDrawer({ isOpen, onClose, onSelectHistoryItem }) {
  if (!isOpen) return null;

  const [history, setHistory] = useState(storageService.getHistory());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterFavorites, setFilterFavorites] = useState(false);

  const handleToggleFavorite = (e, id) => {
    e.stopPropagation();
    const updated = storageService.toggleFavoriteHistory(id);
    setHistory(updated);
  };

  const handleDeleteItem = (e, id) => {
    e.stopPropagation();
    const updated = storageService.deleteHistoryItem(id);
    setHistory(updated);
  };

  const handleClearAll = () => {
    if (window.confirm('Clear all translation history?')) {
      storageService.clearHistory();
      setHistory([]);
    }
  };

  const filteredHistory = history.filter((item) => {
    if (filterFavorites && !item.favorite) return false;
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.sourceText?.toLowerCase().includes(term) ||
      item.translatedText?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="drawer-overlay" onClick={onClose}>
      <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={20} color="#6366f1" />
            <h2 className="modal-title" style={{ fontSize: '1.1rem' }}>History</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {history.length > 0 && (
              <button
                type="button"
                className="btn-icon"
                onClick={handleClearAll}
                title="Clear all history"
              >
                <Trash2 size={16} />
              </button>
            )}
            <button className="btn-icon" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Search & Favorites Filter */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', color: '#64748b' }} />
            <input
              type="text"
              className="form-input"
              placeholder="Search history..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ paddingLeft: '32px', fontSize: '0.85rem' }}
            />
          </div>
          <button
            type="button"
            className={`btn-icon ${filterFavorites ? 'active' : ''}`}
            onClick={() => setFilterFavorites(!filterFavorites)}
            title="Filter Starred"
          >
            <Star size={16} fill={filterFavorites ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* History List */}
        <div className="history-list">
          {filteredHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#64748b', fontSize: '0.85rem' }}>
              No translation history found.
            </div>
          ) : (
            filteredHistory.map((item) => (
              <div
                key={item.id}
                className="history-card"
                onClick={() => {
                  onSelectHistoryItem(item);
                  onClose();
                }}
              >
                <div className="history-meta">
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                    {item.sourceLang} <ArrowRight size={12} /> {item.targetLang}
                    {item.isExplained && (
                      <span style={{ color: '#c084fc', display: 'flex', alignItems: 'center', gap: '2px', marginLeft: '4px' }}>
                        • <BookOpen size={10} /> Jargon
                      </span>
                    )}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: item.favorite ? '#f59e0b' : '#64748b' }}
                      onClick={(e) => handleToggleFavorite(e, item.id)}
                    >
                      <Star size={14} fill={item.favorite ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                      onClick={(e) => handleDeleteItem(e, item.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="history-source">
                  {item.sourceText}
                </div>

                <div className="history-target">
                  {item.translatedText}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
