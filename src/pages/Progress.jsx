import { useEffect, useMemo, useState } from 'react'
import { TrendingUp } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Layout } from '../components/Layout'
import { useWorkoutData } from '../hooks/useWorkoutData'

export function Progress() {
  const { workouts, loading } = useWorkoutData()
  const rows = useMemo(() => workouts.flatMap((workout) => workout.exercises.map((exercise) => ({
    date: workout.date.slice(5),
    name: exercise.name,
    weight: Math.max(0, ...exercise.sets.map((set) => Number(set.weight) || 0)),
    reps: Math.max(0, ...exercise.sets.map((set) => Number(set.reps) || 0)),
    volume: exercise.sets.reduce((sum, set) => sum + Number(set.weight || 0) * Number(set.reps || 0), 0),
  }))), [workouts])
  const names = [...new Set(rows.map((row) => row.name))]
  const [selected, setSelected] = useState('')
  useEffect(() => { if (!selected && names[0]) setSelected(names[0]) }, [names, selected])
  const data = rows.filter((row) => row.name === selected).reverse()
  const selectedRows = rows.filter((row) => row.name === selected)
  const total = selectedRows.reduce((sum, row) => sum + row.volume, 0)
  const bestWeight = Math.max(0, ...selectedRows.map((row) => row.weight))
  const bestReps = Math.max(0, ...selectedRows.map((row) => row.reps))

  return <Layout><main className="page"><div className="page-heading"><div><p className="eyebrow">Measured over time</p><h1>Progress</h1></div><span className="heading-icon"><TrendingUp size={21}/></span></div>{loading ? <div className="loading">Calculating progress...</div> : !selected ? <div className="empty-state"><h2>Your chart starts here.</h2><p>Log a workout to see your performance trend.</p></div> : <><label className="select-label">Exercise<select value={selected} onChange={(event) => setSelected(event.target.value)}>{names.map((name) => <option key={name} value={name}>{name}</option>)}</select></label><div className="stats-grid"><div><span>Best weight</span><strong>{bestWeight} <small>kg</small></strong></div><div><span>Best reps</span><strong>{bestReps}</strong></div><div><span>Sessions</span><strong>{data.length}</strong></div></div><div className="progress-volume"><span>Total volume</span><strong>{total.toLocaleString()} <small>kg</small></strong></div><section className="chart-card"><div className="chart-legend"><span><i className="legend-weight"/> Weight · kg</span><span><i className="legend-reps"/> Reps</span></div><div className="chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={data}><XAxis dataKey="date" hide/><YAxis yAxisId="weight" hide domain={['auto', 'auto']}/><YAxis yAxisId="reps" hide orientation="right" domain={['auto', 'auto']}/><Tooltip contentStyle={{ background: '#242824', border: '1px solid #3a4038', borderRadius: 6 }}/><Line yAxisId="weight" type="monotone" dataKey="weight" name="Weight (kg)" stroke="#d7ff57" strokeWidth={3} dot={{ fill: '#d7ff57', r: 4 }} /><Line yAxisId="reps" type="monotone" dataKey="reps" name="Reps" stroke="#75c8ff" strokeWidth={2} dot={{ fill: '#75c8ff', r: 3 }} /></LineChart></ResponsiveContainer></div></section></>}</main></Layout>
}
