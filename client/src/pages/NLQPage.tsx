import { useState } from 'react';
import { queryNLQ } from '../api/client';
import type { NLQResponse } from '../api/client';
import Badge from '../components/shared/Badge';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import LearnMoreBanner from '../components/shared/LearnMoreBanner';

const quickPicks = [
  'How many orders were placed last week?',
  'What is the most popular product?',
  'Which customers have open complaints?',
  'What is the average order value?',
  'Show me recent returns',
];

export default function NLQPage() {
  const [question, setQuestion] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [result, setResult] = useState<NLQResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (q?: string) => {
    const query = q || question;
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await queryNLQ(query, sessionId ? { session_id: sessionId } : undefined);
      setResult(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Query failed');
    } finally {
      setLoading(false);
    }
  };

  const confidenceVariant = (c: number) => c >= 0.8 ? 'green' : c >= 0.5 ? 'amber' : 'red';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <LearnMoreBanner
        title="Natural Language → Graph Query Translation"
        description="Translates natural language questions into graph queries, resolves entities, and returns structured answers with explanations."
        sdkMethods={[
          { method: 'nlq({ question })', endpoint: 'POST /nlq', description: 'Accepts a natural language question and returns the answer, resolved entities, query used, and explanation steps' },
        ]}
        responseFields={[
          { field: 'query_used', type: 'string', description: 'The actual graph query MINNS generated and executed' },
          { field: 'entities_resolved', type: 'array', description: 'Entities matched to graph nodes with confidence scores' },
          { field: 'total_count', type: 'number', description: 'Total matching records before pagination' },
          { field: 'explanation', type: 'string[]', description: 'Step-by-step reasoning for how the query was resolved' },
        ]}
      />

      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-200">Natural Language Query</h1>
        <p className="text-sm text-gray-500">Ask questions about your data using natural language</p>
      </div>

      {/* Input Area */}
      <div className="card space-y-4 mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Ask a question..."
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            className="flex-1 bg-surface-3 border border-white/10 rounded-lg px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-brand-500"
          />
          <button
            onClick={() => handleSubmit()}
            disabled={loading || !question.trim()}
            className="px-6 py-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 rounded-lg text-sm font-medium text-white transition-colors"
          >
            {loading ? 'Querying...' : 'Ask'}
          </button>
        </div>

        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Session ID (optional)"
            value={sessionId}
            onChange={e => setSessionId(e.target.value)}
            className="w-48 bg-surface-3 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-400 placeholder-gray-600 focus:outline-none focus:border-brand-500"
          />
        </div>

        {/* Quick Picks */}
        <div className="flex flex-wrap gap-2">
          {quickPicks.map(q => (
            <button
              key={q}
              onClick={() => { setQuestion(q); handleSubmit(q); }}
              className="px-3 py-1.5 bg-surface-3 hover:bg-surface-4 border border-white/5 rounded-full text-xs text-gray-400 hover:text-gray-200 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && <LoadingSpinner size="lg" />}

      {/* Error */}
      {error && (
        <div className="card border border-red-500/20 bg-red-500/5">
          <div className="text-sm text-red-400">{error}</div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          {/* Answer Card */}
          <div className="card">
            <div className="flex items-start justify-between mb-3">
              <div className="text-xs text-gray-400 uppercase tracking-wider">Answer</div>
              <Badge variant={confidenceVariant(result.confidence)}>
                {(result.confidence * 100).toFixed(0)}% confidence
              </Badge>
            </div>
            <div className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">{result.answer}</div>
            {result.execution_time_ms != null && (
              <div className="mt-3 text-xs text-gray-400">
                Executed in {result.execution_time_ms.toFixed(0)}ms
                {result.intent && ` | Intent: ${result.intent}`}
                {result.result_count > 0 && ` | ${result.result_count} results`}
                {result.total_count > 0 && ` | ${result.total_count} total`}
              </div>
            )}
          </div>

          {/* Query Used */}
          {result.query_used && (
            <div className="card">
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-2">Query Executed</div>
              <pre className="text-xs text-brand-300 bg-surface-3 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono">
                {result.query_used}
              </pre>
            </div>
          )}

          {/* Resolved Entities */}
          {result.entities_resolved?.length > 0 && (
            <div className="card">
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-3">Resolved Entities</div>
              <div className="flex flex-wrap gap-2">
                {result.entities_resolved.map((e, i) => (
                  <div key={i} className="flex items-center gap-1.5 bg-surface-3 rounded-lg px-3 py-1.5">
                    <Badge variant="gray">{e.node_type}</Badge>
                    <span className="text-sm text-gray-300">{e.text}</span>
                    <span className="text-xs text-gray-400">(node {e.node_id})</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Explanation */}
          {result.explanation?.length > 0 && (
            <div className="card">
              <div className="text-xs text-gray-400 uppercase tracking-wider mb-3">Explanation</div>
              <ol className="space-y-1.5">
                {result.explanation.map((step, i) => (
                  <li key={i} className="flex gap-2 text-xs">
                    <span className="text-gray-600 shrink-0">{i + 1}.</span>
                    <span className="text-gray-400">{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
