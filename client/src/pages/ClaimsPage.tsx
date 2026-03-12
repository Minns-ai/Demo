import { useState, useEffect } from 'react';
import { searchClaims, getClaims, ClaimItem } from '../api/client';
import Badge from '../components/shared/Badge';
import ScoreBar from '../components/shared/ScoreBar';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import CodeBlock from '../components/shared/CodeBlock';
import LearnMoreBanner from '../components/shared/LearnMoreBanner';

export default function ClaimsPage() {
  const [query, setQuery] = useState('');
  const [allClaims, setAllClaims] = useState<ClaimItem[]>([]);
  const [results, setResults] = useState<ClaimItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searched, setSearched] = useState(false);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [searchTime, setSearchTime] = useState<number | null>(null);

  useEffect(() => {
    getClaims(50)
      .then(data => { setAllClaims(data); setResults(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function handleSearch(searchQuery?: string) {
    const q = (searchQuery ?? query).trim();
    if (!q) {
      setResults(allClaims);
      setSearched(false);
      setSearchTime(null);
      return;
    }
    setQuery(q);
    setLoading(true);
    setSearched(true);
    const start = Date.now();
    try {
      const data = await searchClaims(q);
      setResults(data);
      setSearchTime(Date.now() - start);
    } catch {
      setResults([]);
      setSearchTime(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-white rounded-2xl shadow-sm">
      <div className="max-w-4xl mx-auto p-6">
        <LearnMoreBanner
          light
          title="Semantic Claim Search"
          description="Claims are atomic facts extracted from conversations and indexed with vector embeddings. Search uses cosine similarity across claim embeddings to find semantically related facts."
          sdkMethods={[
            { method: 'searchClaims()', endpoint: 'POST /claims/search', description: 'Semantic similarity search over claim embeddings' },
            { method: 'getClaims()', endpoint: 'GET /claims', description: 'List all extracted claims with confidence and evidence' },
          ]}
          responseFields={[
            { field: 'claim_text', type: 'string', description: 'The extracted atomic fact' },
            { field: 'similarity', type: 'number', description: 'Cosine similarity score from vector search' },
            { field: 'confidence', type: 'number', description: 'Extraction confidence (0-1)' },
            { field: 'evidence_spans', type: 'EvidenceSpan[]', description: 'Source text supporting this claim' },
          ]}
        />

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-800 mb-1">Semantic Claims Search</h1>
          <p className="text-sm text-gray-500">
            Search facts extracted from ingested conversations using vector similarity
          </p>
        </div>

        {/* Search box */}
        <div className="flex gap-2 mb-4">
          <div className="flex-1 relative">
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder='Try: "dietary requirements", "travel budget", "family members"'
              className="input-field w-full pl-9"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button onClick={() => handleSearch()} disabled={loading || !query.trim()} className="btn-primary">
            Search
          </button>
        </div>

        {/* Quick search suggestions */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {['nut allergy', 'travel budget', 'family members', 'Amalfi Coast', 'day trips', 'accommodation preferences'].map(s => (
            <button
              key={s}
              onClick={() => handleSearch(s)}
              className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>

        {/* SDK code snippet */}
        <div className="bg-gray-900 rounded-xl p-3 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[9px] text-gray-500 font-mono uppercase tracking-wider">SDK Call</span>
            {searchTime != null && (
              <span className="ml-auto text-[10px] font-mono text-emerald-400">{searchTime}ms</span>
            )}
          </div>
          <CodeBlock className="!p-3 !rounded-lg" code={searched
  ? `await client.searchClaims({\n  queryText: "${query}",\n  topK: 10,\n  minSimilarity: 0.5\n});`
  : `await client.getClaims({ limit: 50 });`} />
        </div>

        {loading && <LoadingSpinner />}

        {/* Results count */}
        {!loading && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-gray-500">
              {results.length} claim{results.length !== 1 ? 's' : ''}
              {searched ? ` matching "${query}"` : ' in database'}
            </span>
          </div>
        )}

        {!loading && results.length === 0 && (
          <div className="card text-center py-12">
            <p className="text-gray-500">{searched ? `No claims found for "${query}"` : 'No claims in the database yet'}</p>
            <p className="text-xs text-gray-400 mt-1">Ingest conversations on the Chat page to generate claims</p>
          </div>
        )}

        <div className="space-y-3">
          {results.map((claim, i) => {
            const isExpanded = expandedIdx === i;
            return (
              <div key={i} className="card-hover">
                {/* Header row */}
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

                {/* Claim text */}
                <p className="text-sm text-gray-700 leading-relaxed break-words overflow-hidden">{claim.claim_text || claim.text || JSON.stringify(claim)}</p>

                {/* Metrics */}
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
                    <span className="text-xs text-amber-500">superseded by #{String(claim.superseded_by).slice(-6)}</span>
                  )}
                  {claim.similarity != null && (
                    <div className="ml-auto w-24">
                      <ScoreBar value={claim.similarity} label="Match" color="brand" />
                    </div>
                  )}
                </div>

                {/* Expandable details */}
                {((claim.evidence_spans && claim.evidence_spans.length > 0) || (claim.entities && claim.entities.length > 0)) && (
                  <div className="mt-2">
                    <button
                      onClick={() => setExpandedIdx(isExpanded ? null : i)}
                      className="text-xs text-brand-500 hover:text-brand-600 transition-colors"
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
                                <div key={j} className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 italic">
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
                                <div key={j} className="flex items-center gap-1.5 bg-gray-50 rounded-lg px-2.5 py-1.5">
                                  <Badge variant="gray">{ent.entity_type}</Badge>
                                  <span className="text-xs text-gray-700">{ent.entity_text}</span>
                                  <span className="text-xs text-gray-400">{(ent.confidence * 100).toFixed(0)}%</span>
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
    </div>
  );
}
