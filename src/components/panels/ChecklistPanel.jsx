import { useSearch } from '../../context/SearchContext'
import { PERSON_CATEGORIES } from '../../data/sarProfiles'
import { PROTOCOLS } from '../../data/protocols'
import { useState } from 'react'
import { FiCheckSquare, FiSquare, FiChevronDown, FiChevronRight } from 'react-icons/fi'

export default function ChecklistPanel() {
  const { state, toggleChecklist } = useSearch()
  const { incident, checklistItems } = state
  const [activeTab, setActiveTab] = useState('field')
  const [expanded, setExpanded] = useState({})

  if (!incident) return null
  const profile = PERSON_CATEGORIES[incident.profileId]

  const fieldItems = profile?.checklist || []
  const mxItems    = PROTOCOLS.mexico.items
  const intItems   = PROTOCOLS.international.items

  const tabs = [
    { id: 'field', label: 'Campo',         items: fieldItems,  color: '#ef4444' },
    { id: 'mx',    label: 'Protocolos MX', items: mxItems,     color: '#006847' },
    { id: 'int',   label: 'NASAR/ISAR',   items: intItems,     color: '#1d4ed8' },
  ]

  const activeItems = tabs.find(t => t.id === activeTab)?.items || []
  const activeColor = tabs.find(t => t.id === activeTab)?.color

  const completedCount = activeItems.filter(item => {
    const id = item.id || item
    return checklistItems[id]
  }).length

  function getItemId(item) { return item.id || item }
  function getItemLabel(item) { return item.title || item }
  function getItemDesc(item) { return item.description || null }

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-slate-800 px-3 pt-3 gap-1 shrink-0">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`text-xs px-3 py-1.5 rounded-t-lg font-medium transition-all ${
              activeTab === tab.id
                ? 'text-white border-b-2'
                : 'text-slate-500 hover:text-slate-300'
            }`}
            style={activeTab === tab.id ? { borderColor: tab.color, color: tab.color } : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Progreso */}
      <div className="px-3 py-2 bg-slate-800/50 border-b border-slate-800 shrink-0">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-500">Completado</span>
          <span className="text-white font-mono">
            {completedCount}/{activeItems.length}
          </span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-1.5">
          <div
            className="h-1.5 rounded-full transition-all duration-500"
            style={{
              width: `${activeItems.length ? (completedCount / activeItems.length) * 100 : 0}%`,
              background: activeColor,
            }}
          />
        </div>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {activeItems.map((item, i) => {
          const id = getItemId(item)
          const label = getItemLabel(item)
          const desc = getItemDesc(item)
          const done = !!checklistItems[id]
          const isExpanded = expanded[id]

          return (
            <div
              key={id || i}
              className={`rounded-lg border transition-all ${
                done
                  ? 'border-slate-700 bg-slate-800/50'
                  : 'border-slate-700 bg-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start gap-2 p-2.5">
                <button
                  onClick={() => toggleChecklist(id)}
                  className="shrink-0 mt-0.5 transition-colors"
                  style={{ color: done ? activeColor : '#475569' }}
                >
                  {done ? <FiCheckSquare size={16} /> : <FiSquare size={16} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs leading-snug ${done ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                    {label}
                  </p>
                  {desc && !isExpanded && (
                    <button
                      onClick={() => setExpanded(e => ({ ...e, [id]: true }))}
                      className="text-[10px] text-slate-600 hover:text-slate-400 mt-0.5 flex items-center gap-0.5"
                    >
                      <FiChevronRight size={10} /> Ver protocolo
                    </button>
                  )}
                  {desc && isExpanded && (
                    <div className="mt-1.5 pt-1.5 border-t border-slate-700">
                      <p className="text-[11px] text-slate-500 leading-relaxed">{desc}</p>
                      <button
                        onClick={() => setExpanded(e => ({ ...e, [id]: false }))}
                        className="text-[10px] text-slate-600 hover:text-slate-400 mt-1 flex items-center gap-0.5"
                      >
                        <FiChevronDown size={10} /> Colapsar
                      </button>
                    </div>
                  )}
                  {item.phase && (
                    <span className="text-[10px] text-slate-600 uppercase tracking-wide mt-0.5 block">
                      {item.phase}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
