import { useMemo } from 'react';

interface Props {
  code: string;
  className?: string;
}

interface Token {
  type: 'keyword' | 'string' | 'comment' | 'number' | 'property' | 'method' | 'punctuation' | 'operator' | 'plain';
  text: string;
}

const KEYWORDS = new Set([
  'import', 'from', 'const', 'let', 'var', 'await', 'async', 'function',
  'return', 'if', 'else', 'new', 'true', 'false', 'null', 'undefined',
  'export', 'default', 'type', 'interface',
]);

function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < code.length) {
    // Comments: // ...
    if (code[i] === '/' && code[i + 1] === '/') {
      let end = code.indexOf('\n', i);
      if (end === -1) end = code.length;
      tokens.push({ type: 'comment', text: code.slice(i, end) });
      i = end;
      continue;
    }

    // Strings: "..." or '...' or `...`
    if (code[i] === '"' || code[i] === "'" || code[i] === '`') {
      const quote = code[i];
      let j = i + 1;
      while (j < code.length && code[j] !== quote) {
        if (code[j] === '\\') j++;
        j++;
      }
      tokens.push({ type: 'string', text: code.slice(i, j + 1) });
      i = j + 1;
      continue;
    }

    // Numbers
    if (/\d/.test(code[i]) && (i === 0 || /[\s,:\[({=]/.test(code[i - 1]))) {
      let j = i;
      while (j < code.length && /[\d.]/.test(code[j])) j++;
      tokens.push({ type: 'number', text: code.slice(i, j) });
      i = j;
      continue;
    }

    // Words (keywords, methods, properties)
    if (/[a-zA-Z_$]/.test(code[i])) {
      let j = i;
      while (j < code.length && /[a-zA-Z0-9_$]/.test(code[j])) j++;
      const word = code.slice(i, j);

      if (KEYWORDS.has(word)) {
        tokens.push({ type: 'keyword', text: word });
      } else if (j < code.length && code[j] === '(') {
        tokens.push({ type: 'method', text: word });
      } else if (i > 0 && code[i - 1] === '.') {
        tokens.push({ type: 'property', text: word });
      } else {
        tokens.push({ type: 'plain', text: word });
      }
      i = j;
      continue;
    }

    // Operators
    if (/[=><+\-*/?!&|]/.test(code[i])) {
      let j = i;
      while (j < code.length && /[=><+\-*/?!&|]/.test(code[j])) j++;
      tokens.push({ type: 'operator', text: code.slice(i, j) });
      i = j;
      continue;
    }

    // Punctuation
    if (/[{}()\[\]:;.,]/.test(code[i])) {
      tokens.push({ type: 'punctuation', text: code[i] });
      i++;
      continue;
    }

    // Whitespace and everything else
    let j = i;
    while (j < code.length && !/[a-zA-Z0-9_$"'`/{}()\[\]:;.,=><+\-*?!&|]/.test(code[j])) j++;
    tokens.push({ type: 'plain', text: code.slice(i, j) });
    i = j;
  }

  return tokens;
}

const colorMap: Record<Token['type'], string> = {
  keyword: 'text-purple-400',
  string: 'text-emerald-400',
  comment: 'text-gray-500 italic',
  number: 'text-amber-400',
  property: 'text-blue-300',
  method: 'text-yellow-300',
  punctuation: 'text-gray-400',
  operator: 'text-pink-400',
  plain: 'text-gray-300',
};

export default function CodeBlock({ code, className = '' }: Props) {
  const tokens = useMemo(() => tokenize(code), [code]);

  return (
    <pre className={`text-[11px] font-mono bg-gray-900 rounded-xl p-4 overflow-x-auto leading-relaxed ${className}`}>
      {tokens.map((t, i) => (
        <span key={i} className={colorMap[t.type]}>{t.text}</span>
      ))}
    </pre>
  );
}
