interface TreeData {
  nodes: Record<string, string[]>;
  provenance: string;
}

function TreeNodeItem({ nodeKey, children, allNodes, depth = 0 }: {
  nodeKey: string;
  children: string[];
  allNodes: Record<string, string[]>;
  depth?: number;
}) {
  return (
    <div>
      <div
        className="flex items-center gap-2 py-1 hover:bg-white/5 rounded px-2 transition-colors"
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        {children.length > 0 ? (
          <svg className="w-3 h-3 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        ) : (
          <div className="w-3 h-3 flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-gray-600" />
          </div>
        )}
        <span className="text-sm text-gray-300">{nodeKey}</span>
        <span className="text-[10px] text-gray-600 ml-auto">
          {children.length > 0 ? `${children.length} children` : 'leaf'}
        </span>
      </div>
      {children.map(child => (
        <TreeNodeItem
          key={child}
          nodeKey={child}
          children={allNodes[child] ?? []}
          allNodes={allNodes}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

export default function TreeView({ data }: { data: TreeData }) {
  const nodes = data.nodes ?? {};
  const allChildren = new Set(Object.values(nodes).flat());
  // Root nodes are those that appear as keys but not as children of any other node
  const roots = Object.keys(nodes).filter(k => !allChildren.has(k));
  // If no clear roots, just use all keys
  const displayRoots = roots.length > 0 ? roots : Object.keys(nodes);

  if (displayRoots.length === 0) {
    return (
      <div className="card text-center py-8 text-sm text-gray-500">
        Empty tree
      </div>
    );
  }

  return (
    <div className="card">
      <div className="text-xs font-medium text-gray-400 mb-3">Tree Structure</div>
      {displayRoots.map(root => (
        <TreeNodeItem
          key={root}
          nodeKey={root}
          children={nodes[root] ?? []}
          allNodes={nodes}
        />
      ))}
    </div>
  );
}
