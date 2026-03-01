import { useState, useEffect } from 'react';
import { searchClaims, getClaims, ClaimItem } from '../api/client';
import Badge from '../components/shared/Badge';
import ScoreBar from '../components/shared/ScoreBar';
import LoadingSpinner from '../components/shared/LoadingSpinner';

export default function ClaimsPage() {
  const [query, setQuery] = useState('');
  const [allClaims, setAllClaims] = useState<ClaimItem[]>([]);
  const [results, setResults] = useState<ClaimItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    getClaims(50)
      .then(data => { setAllClaims(data); setResults(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSearch() {
    if (!query.trim()) {
      setResults(allClaims);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const data = await searchClaims(query.trim());
      setResults(data);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-200">Semantic Claims Search</h1>
        <p className="text-sm text-gray-500">
          Search extracted claims from conversations using semantic similarity
        </p>
      </div>

      <div className="flex gap-2 mb-6">
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Search claims... (e.g., 'customer prefers email contact')"
          className="input-field flex-1"
        />
        <button onClick={handleSearch} disabled={loading || !query.trim()} className="btn-primary">
          Search
        </button>
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {['customer preferences', 'delivery complaints', 'product feedback', 'return reasons', 'account issues'].map(s => (
          <button
            key={s}
            onClick={() => { setQuery(s); }}
            className="text-xs px-3 py-1.5 rounded-full bg-surface-3 text-gray-400 hover:text-gray-200 hover:bg-surface-4 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      {loading && <LoadingSpinner />}

      {!loading && results.length === 0 && (
        <div className="card text-center py-12">
          <p className="text-gray-500">{searched ? `No claims found for "${query}"` : 'No claims in the database yet'}</p>
          <p className="text-xs text-gray-600 mt-1">Claims are extracted from conversations with semantic analysis enabled</p>
        </div>
      )}

      <div className="space-y-3">
        {results.map((claim, i) => (
          <div key={i} className="card-hover">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className="text-sm text-gray-200">{claim.claim_text || claim.text || JSON.stringify(claim)}</p>
                <div className="flex items-center gap-2 mt-2">
                  {claim.confidence != null && (
                    <Badge variant={claim.confidence > 0.8 ? 'green' : claim.confidence > 0.5 ? 'amber' : 'red'}>
                      {(claim.confidence * 100).toFixed(0)}% confidence
                    </Badge>
                  )}
                </div>
              </div>
              {claim.similarity != null && (
                <div className="ml-4 w-24">
                  <ScoreBar value={claim.similarity} label="Match" color="brand" />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
