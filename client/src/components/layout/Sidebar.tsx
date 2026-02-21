import { NavLink } from 'react-router-dom';

const nav = [
  { to: '/chat', label: 'Chat', sdk: 'Intent Sidecar + Events', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  { to: '/dashboard', label: 'Dashboard', sdk: 'Health + Stats', icon: 'M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z' },
  { to: '/memories', label: 'Memories', sdk: 'Three-Tier Memory', icon: 'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z' },
  { to: '/strategies', label: 'Strategies', sdk: 'Strategy System', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { to: '/graph', label: 'Graph', sdk: 'Graph Analytics', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' },
  { to: '/claims', label: 'Claims', sdk: 'Semantic Claims', icon: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z' },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-surface-1 border-r border-surface-4 flex flex-col h-full">
      <div className="p-5 border-b border-surface-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center text-sm font-bold">M</div>
          <div>
            <div className="font-semibold text-sm">minns-sdk</div>
            <div className="text-[10px] text-gray-500 uppercase tracking-wider">Demo Agent</div>
          </div>
        </div>
      </div>
      <nav className="flex-1 py-3 px-3 space-y-1">
        {nav.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-150 group ${
                isActive ? 'bg-brand-600/20 text-brand-300' : 'text-gray-400 hover:text-gray-200 hover:bg-surface-3'
              }`
            }
          >
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
            </svg>
            <div className="flex-1 min-w-0">
              <div className="font-medium">{item.label}</div>
              <div className="text-[10px] text-gray-600 group-hover:text-gray-500 truncate">{item.sdk}</div>
            </div>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-surface-4">
        <div className="text-[10px] text-gray-600 text-center">Customer Service Agent v1.0</div>
      </div>
    </aside>
  );
}
