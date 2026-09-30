import { useEffect, useMemo, useState } from 'react'
import { Trash2, TrendingUp } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Layout } from '../components/Layout'
import { dateKey, db, shiftDate } from '../db/db'
import { useWorkoutData } from '../hooks/useWorkoutData'
import { exerciseBest, exerciseVolume, muscleVolume, weekStart } from '../utils/analytics'

const tabs = [['lifts', 'Lifts'], ['muscles', 'Muscles'], ['body', 'Body weight']]
const metrics = [['weight', 'Best weight', 'kg'], ['e1rm', 'Est. 1RM', 'kg'], ['reps', 'Best reps', ''], ['volume', 'Volume', 'kg']]
const tooltipStyle = { background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 6, color: 'var(--ink)', fontSize: 12 }
const axisTick = { fill: 'var(--muted)', fontSize: 10 }

function TrendChart({ data, dataKey, name, unit }) {
	return <div className="chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
		<XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--line)' }} minTickGap={24}/>
		<YAxis tick={axisTick} tickLine={false} axisLine={false} domain={['auto', 'auto']} width={48}/>
		<Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'var(--muted)' }} cursor={{ stroke: 'var(--line)' }} formatter={(value) => [`${value.toLocaleString()}${unit ? ` ${unit}` : ''}`, name]}/>
		<Line type="monotone" dataKey={dataKey} name={name} stroke="var(--lime)" strokeWidth={2} dot={{ fill: 'var(--lime)', stroke: 'var(--panel)', strokeWidth: 2, r: 4 }} activeDot={{ r: 5 }}/>
	</LineChart></ResponsiveContainer></div>
}

function Lifts({ workouts }) {
	const rows = useMemo(() => workouts.flatMap((workout) => workout.exercises.map((exercise) => ({ date: workout.date, label: workout.date.slice(5), name: exercise.name, ...exerciseBest(exercise), volume: exerciseVolume(exercise) }))).filter((row) => row.reps > 0), [workouts])
	const names = [...new Set(rows.map((row) => row.name))].sort()
	const [selected, setSelected] = useState('')
	const [metric, setMetric] = useState('weight')
	useEffect(() => { if (!names.includes(selected) && names[0]) setSelected(names[0]) }, [names.join(), selected])
	if (!names.length) return <div className="empty-state"><h2>Your chart starts here.</h2><p>Log a workout to see your performance trend.</p></div>
	const data = rows.filter((row) => row.name === selected).sort((a, b) => a.date.localeCompare(b.date))
	const best = (key) => Math.max(0, ...data.map((row) => row[key]))
	const total = data.reduce((sum, row) => sum + row.volume, 0)
	const [, metricName, unit] = metrics.find(([key]) => key === metric)
	return <>
		<label className="select-label">Exercise<select value={selected} onChange={(event) => setSelected(event.target.value)}>{names.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
		<div className="stats-grid stats-grid-4"><div><span>Best weight</span><strong>{best('weight')} <small>kg</small></strong></div><div><span>Est. 1RM</span><strong>{best('e1rm')} <small>kg</small></strong></div><div><span>Best reps</span><strong>{best('reps')}</strong></div><div><span>Sessions</span><strong>{data.length}</strong></div></div>
		<div className="progress-volume"><span>Total volume</span><strong>{total.toLocaleString()} <small>kg</small></strong></div>
		<section className="chart-card"><div className="chip-row">{metrics.map(([key, label]) => <button key={key} className={`chip${metric === key ? ' active' : ''}`} onClick={() => setMetric(key)}>{label}</button>)}</div><TrendChart data={data} dataKey={metric} name={metricName} unit={unit}/></section>
		<p className="chart-footnote">Est. 1RM uses the Epley formula: weight × (1 + reps ÷ 30), from your best set each session.</p>
	</>
}

const ranges = [['week', 'This week'], ['last', 'Last week'], ['month', 'Last 4 weeks']]
function Muscles({ workouts, exercises }) {
	const [range, setRange] = useState('week')
	const monday = weekStart(dateKey())
	const [from, to, weeks] = { week: [monday, shiftDate(monday, 6), 1], last: [shiftDate(monday, -7), shiftDate(monday, -1), 1], month: [shiftDate(monday, -21), shiftDate(monday, 6), 4] }[range]
	const groups = muscleVolume(workouts, exercises, from, to)
	const sessions = workouts.filter((workout) => workout.date >= from && workout.date <= to).length
	const maxSets = Math.max(1, ...groups.map((group) => group.sets))
	return <>
		<div className="chip-row">{ranges.map(([key, label]) => <button key={key} className={`chip${range === key ? ' active' : ''}`} onClick={() => setRange(key)}>{label}</button>)}</div>
		<div className="stats-grid"><div><span>Workouts</span><strong>{sessions}</strong></div><div><span>Sets done</span><strong>{groups.reduce((sum, group) => sum + group.sets, 0)}</strong></div><div><span>Volume</span><strong>{Math.round(groups.reduce((sum, group) => sum + group.volume, 0)).toLocaleString()} <small>kg</small></strong></div></div>
		{groups.length === 0 ? <div className="empty-state"><h2>Nothing logged yet.</h2><p>Sets with reps entered count toward each muscle group.</p></div> : <section className="chart-card muscle-card">
			<p className="card-label">{weeks > 1 ? 'Sets per week (avg)' : 'Sets'} by muscle group</p>
			{groups.map((group) => <div className="muscle-row" key={group.muscle} title={`${group.sets} sets · ${Math.round(group.volume).toLocaleString()} kg`}><span className="muscle-name">{group.muscle}</span><div className="muscle-bar"><i style={{ width: `${(group.sets / maxSets) * 100}%` }}/></div><span className="muscle-value"><b>{Math.round((group.sets / weeks) * 10) / 10}</b> <small>{Math.round(group.volume / weeks).toLocaleString()} kg</small></span></div>)}
		</section>}
		<p className="chart-footnote">Muscle groups come from the exercise library. Custom exercises show as “Custom”. Many lifters aim for about 10–20 hard sets per muscle each week.</p>
	</>
}

function BodyWeight({ weights, refresh }) {
	const [date, setDate] = useState(dateKey())
	const [weight, setWeight] = useState('')
	const save = async () => { const value = Number(weight); if (!value) return; const existing = await db.bodyWeights.where('date').equals(date).first(); if (existing) await db.bodyWeights.update(existing.id, { weight: value }); else await db.bodyWeights.add({ date, weight: value, note: '' }); setWeight(''); await refresh() }
	const remove = async (entry) => { if (!window.confirm(`Delete ${entry.weight} kg from ${entry.date}?`)) return; await db.bodyWeights.delete(entry.id); await refresh() }
	const data = [...weights].sort((a, b) => a.date.localeCompare(b.date)).map((entry) => ({ ...entry, label: entry.date.slice(5) }))
	const latest = data[data.length - 1]
	const monthAgo = latest && [...data].reverse().find((entry) => entry.date <= shiftDate(latest.date, -30))
	const change = latest && monthAgo ? Math.round((latest.weight - monthAgo.weight) * 10) / 10 : null
	return <>
		<div className="weight-form"><input type="date" value={date} max={dateKey()} onChange={(event) => setDate(event.target.value)} aria-label="Date"/><input inputMode="decimal" value={weight} onChange={(event) => setWeight(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') save() }} placeholder="Weight · kg" aria-label="Body weight in kg"/><button onClick={save}>Log</button></div>
		{!latest ? <div className="empty-state"><h2>No weigh-ins yet.</h2><p>Log your body weight to see the trend. Weighing at the same time each day gives the cleanest line.</p></div> : <>
			<div className="stats-grid"><div><span>Latest</span><strong>{latest.weight} <small>kg</small></strong></div><div><span>30-day change</span><strong>{change === null ? '–' : `${change > 0 ? '+' : ''}${change}`} {change !== null && <small>kg</small>}</strong></div><div><span>Weigh-ins</span><strong>{data.length}</strong></div></div>
			{data.length > 1 && <section className="chart-card"><p className="card-label">Body weight · kg</p><TrendChart data={data} dataKey="weight" name="Body weight" unit="kg"/></section>}
			<div className="history-list weight-list">{[...data].reverse().slice(0, 12).map((entry) => <div className="history-row" key={entry.id}><div><strong>{entry.weight} kg</strong><span>{new Date(`${entry.date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span></div><button className="icon-button" onClick={() => remove(entry)} aria-label={`Delete weigh-in from ${entry.date}`}><Trash2 size={16}/></button></div>)}</div>
		</>}
	</>
}

export function Progress() {
	const { workouts, exercises, weights, loading, refresh } = useWorkoutData()
	const [tab, setTab] = useState('lifts')
	return <Layout><main className="page">
		<div className="page-heading"><div><p className="eyebrow">Measured over time</p><h1>Progress</h1></div><span className="heading-icon"><TrendingUp size={21}/></span></div>
		<div className="tab-row" role="tablist">{tabs.map(([key, label]) => <button key={key} role="tab" aria-selected={tab === key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{label}</button>)}</div>
		{loading ? <div className="loading">Calculating progress...</div> : tab === 'lifts' ? <Lifts workouts={workouts}/> : tab === 'muscles' ? <Muscles workouts={workouts} exercises={exercises}/> : <BodyWeight weights={weights} refresh={refresh}/>}
	</main></Layout>
}
