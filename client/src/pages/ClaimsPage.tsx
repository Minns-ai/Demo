import { useState, useEffect } from 'react';
import { searchClaims, getClaims, ClaimItem } from '../api/client';
import Badge from '../components/shared/Badge';
import ScoreBar from '../components/shared/ScoreBar';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import LearnMoreBanner from '../components/shared/LearnMoreBanner';

export default function ClaimsPage() {
  const [query, setQuery] = useState('');
  const [allClaims, setAllClaims] = useState<ClaimItem[]>([]);
  const [results, setResults] = useState<ClaimItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searched, setSearched] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

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
      <LearnMoreBanner
        title="Semantic Claim Extraction with Vector-Indexed Search"
        description="Claims are extracted from conversations and indexed with vector embeddings for semantic similarity search."
        sdkMethods={[
          { method: 'getClaims()', endpoint: 'GET /claims', description: 'Lists all extracted claims with confidence, entities, and evidence spans' },
          { method: 'searchClaims()', endpoint: 'POST /claims/search', description: 'Semantic similarity search over claim embeddings with query text' },
        ]}
        responseFields={[
          { field: 'claim_type', type: 'string', description: 'Type of claim: preference, fact, complaint, feedback, etc.' },
          { field: 'evidence_spans', type: 'EvidenceSpan[]', description: 'Source text snippets that support this claim' },
          { field: 'entities', type: 'ClaimEntity[]', description: 'Extracted entities with type and confidence' },
          { field: 'similarity', type: 'number', description: 'Cosine similarity score from vector search (search results only)' },
        ]}
      />

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
          <p className="text-xs text-gray-400 mt-1">Claims are extracted from conversations with semantic analysis enabled</p>
        </div>
      )}

      <div className="space-y-3">
        {results.map((claim, i) => {
          const isExpanded = expandedIdx === i;
          return (
            <div key={i} className="card-hover">
              {/* Header row: badges */}
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {claim.claim_type && <Badge variant="brand">{claim.claim_type}</Badge>}
                {claim.subject_entity && <Badge variant="gray">{claim.subject_entity}</Badge>}
                {claim.status && (
                  <Badge variant={claim.status === 'active' ? 'green' : claim.status === 'superseded' ? 'amber' : 'gray'}>
                    {claim.status}
                  </Badge>
                )}
                {claim.created_at && (
                  <span className="text-xs text-gray-400 ml-auto">
                    {new Date(typeof claim.created_at === 'number' ? claim.created_at * 1000 : claim.created_at).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Body: claim text */}
              <p className="text-sm text-gray-200 leading-relaxed">{claim.claim_text || claim.text || JSON.stringify(claim)}</p>

              {/* Footer row: metrics */}
              <div className="flex items-center gap-3 mt-3 flex-wrap">
                {claim.confidence != null && (
                  <Badge variant={claim.confidence > 0.8 ? 'green' : claim.confidence > 0.5 ? 'amber' : 'red'}>
                    {(claim.confidence * 100).toFixed(0)}% confidence
                  </Badge>
                )}
                {claim.support_count != null && (
                  <span className="text-xs text-gray-400">{claim.support_count} support</span>
                )}
                {claim.temporal_weight != null && (
                  <span className="text-xs text-gray-400">weight: {claim.temporal_weight.toFixed(2)}</span>
                )}
                {claim.superseded_by != null && (
                  <span className="text-xs text-amber-400">superseded by #{String(claim.superseded_by).slice(-6)}</span>
                )}
                {claim.similarity != null && (
                  <div className="ml-auto w-24">
                    <ScoreBar value={claim.similarity} label="Match" color="brand" />
                  </div>
                )}
              </div>

              {/* Expandable: evidence + entities */}
              {((claim.evidence_spans && claim.evidence_spans.length > 0) || (claim.entities && claim.entities.length > 0)) && (
                <div className="mt-2">
                  <button
                    onClick={() => setExpandedIdx(isExpanded ? null : i)}
                    className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                  >
                    {isExpanded ? 'Hide' : 'Show'} details
                    {claim.evidence_spans?.length ? ` (${claim.evidence_spans.length} evidence)` : ''}
                    {claim.entities?.length ? ` (${claim.entities.length} entities)` : ''}
                  </button>

                  {isExpanded && (
                    <div className="mt-2 space-y-3">
                      {claim.evidence_spans && claim.evidence_spans.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Evidence Spans</div>
                          <div className="space-y-1">
                            {claim.evidence_spans.map((es, j) => (
                              <div key={j} className="text-xs text-gray-300 bg-surface-3 rounded-lg px-3 py-2 italic">
                                "{es.source_text}"
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {claim.entities && claim.entities.length > 0 && (
                        <div>
                          <div className="text-xs text-gray-400 uppercase tracking-wider mb-1">Extracted Entities</div>
                          <div className="flex flex-wrap gap-2">
                            {claim.entities.map((ent, j) => (
                              <div key={j} className="flex items-center gap-1.5 bg-surface-3 rounded-lg px-2.5 py-1.5">
                                <Badge variant="gray">{ent.entity_type}</Badge>
                                <span className="text-xs text-gray-300">{ent.entity_text}</span>
                                <span className="text-xs text-gray-500">{(ent.confidence * 100).toFixed(0)}%</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
