import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';
import './Leaderboard.css';

const RANK_LABELS = ['#1', '#2', '#3'];

export default function Leaderboard({ onBack }) {
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    async function load() {
      const { data, error: err } = await supabase
        .from('scores')
        .select('id, username, score, created_at')
        .order('score', { ascending: false })
        .limit(10);

      if (err) { setError(err.message); setLoading(false); return; }
      setRows(data ?? []);
      setLoading(false);
    }
    load();
  }, []);

  function formatDate(ts) {
    const d = new Date(ts);
    return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()}`;
  }

  return (
    <main className="lb-root" aria-label="Leaderboard">
      <div className="lb-terminal">
        <header className="lb-header">
          <h1 className="lb-title">HIGH SCORES</h1>
          <p className="lb-subtitle">TOP 10 — GLOBAL</p>
        </header>

        {loading && <p className="lb-loading">LOADING...</p>}
        {error   && <p className="lb-error" role="alert">⚠ {error}</p>}

        {!loading && !error && (
          <table className="lb-table" aria-label="Global top 10 scores">
            <thead>
              <tr>
                <th className="lb-th">RANK</th>
                <th className="lb-th lb-th--name">PLAYER</th>
                <th className="lb-th">SCORE</th>
                <th className="lb-th lb-th--date">DATE</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.id} className={`lb-row ${i === 0 ? 'lb-row--gold' : ''}`}>
                  <td className="lb-td lb-td--rank">
                    <span aria-label={`Rank ${i+1}`} className={i < 3 ? 'lb-rank-top' : ''}>
                      {RANK_LABELS[i] ?? `#${i + 1}`}
                    </span>
                  </td>
                  <td className="lb-td lb-td--name">{row.username}</td>
                  <td className="lb-td lb-td--score">{row.score.toLocaleString()}</td>
                  <td className="lb-td lb-td--date">{formatDate(row.created_at)}</td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td className="lb-td lb-td--empty" colSpan={4}>NO SCORES YET — BE FIRST!</td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        <button className="px-btn px-btn--ghost lb-back" onClick={onBack}>
          ← BACK TO GARAGE
        </button>
      </div>
    </main>
  );
}
