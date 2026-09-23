import { Plus, Trash2 } from 'lucide-react'
import { IconButton } from './IconButton'
export function SetTable({ sets, onChange }) {
  const update = (index, key, value) => onChange(sets.map((set, i) => i === index ? { ...set, [key]: value } : set))
  return <div className="set-table"><div className="set-head"><span>SET</span><span>WEIGHT · KG</span><span>REPS</span><span /></div>{sets.map((set, index) => <div className="set-row" key={index}><span className="set-number">{index + 1}</span><input aria-label={`Set ${index + 1} weight`} inputMode="decimal" value={set.weight} onChange={(e) => update(index, 'weight', e.target.value)} placeholder="0" /><input aria-label={`Set ${index + 1} reps`} inputMode="numeric" value={set.reps} onChange={(e) => update(index, 'reps', e.target.value)} placeholder="0" /><IconButton label="Remove set" onClick={() => onChange(sets.filter((_, i) => i !== index))}><Trash2 size={16} /></IconButton></div>)}<button className="add-set" onClick={() => onChange([...sets, { weight: '', reps: '' }])}><Plus size={16} /> Add set</button></div>
}
