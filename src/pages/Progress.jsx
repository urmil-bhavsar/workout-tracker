import { useEffect, useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, FileText, Trash2, Trophy, TrendingUp } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Layout } from '../components/Layout'
import { dateKey, db, shiftDate } from '../db/db'
import { useWorkoutData } from '../hooks/useWorkoutData'
import { bodyWeightOn, exerciseBest, exerciseVolume, formatDay, muscleVolume, personalRecords, relativeStrength, shiftPeriod, summarizePeriod, weekStart } from '../utils/analytics'

const tabs = [['summary', 'Summary'], ['lifts', 'Lifts'], ['records', 'Records'], ['muscles', 'Muscles'], ['body', 'Body']]
const metrics = [['weight', 'Best weight', 'kg'], ['e1rm', 'Est. 1RM', 'kg'], ['relative', '× Body weight', '× BW'], ['reps', 'Best reps', ''], ['volume', 'Volume', 'kg']]
const signed = (value, unit = '') => value === null || value === undefined ? '–' : `${value > 0 ? '+' : ''}${value}${unit}`
const tooltipStyle = { background: 'var(--panel-2)', border: '1px solid var(--line)', borderRadius: 6, color: 'var(--ink)', fontSize: 12 }
const axisTick = { fill: 'var(--muted)', fontSize: 10 }

function TrendChart({ data, dataKey, name, unit }) {
	return <div className="chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -6 }}>
		<XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--line)' }} minTickGap={24}/>
		<YAxis tick={axisTick} tickLine={false} axisLine={false} domain={['auto', 'auto']} width={44} tickFormatter={(value) => Number(value.toFixed(2)).toLocaleString()}/>
		<Tooltip contentStyle={tooltipStyle} labelStyle={{ color: 'var(--muted)' }} cursor={{ stroke: 'var(--line)' }} formatter={(value) => [`${value.toLocaleString()}${unit ? ` ${unit}` : ''}`, name]}/>
		<Line type="monotone" dataKey={dataKey} name={name} stroke="var(--lime)" strokeWidth={2} dot={{ fill: 'var(--lime)', stroke: 'var(--panel)', strokeWidth: 2, r: 4 }} activeDot={{ r: 5 }}/>
	</LineChart></ResponsiveContainer></div>
}

function Lifts({ workouts, weights }) {
	const rows = useMemo(() => workouts.flatMap((workout) => workout.exercises.map((exercise) => ({ date: workout.date, label: workout.date.slice(5), name: exercise.name, ...exerciseBest(exercise), volume: exerciseVolume(exercise) }))).filter((row) => row.reps > 0).map((row) => ({ ...row, relative: relativeStrength(row.e1rm, bodyWeightOn(weights, row.date)) })), [workouts, weights])
	const names = [...new Set(rows.map((row) => row.name))].sort()
	const [selected, setSelected] = useState('')
	const [metric, setMetric] = useState('weight')
	useEffect(() => { if (!names.includes(selected) && names[0]) setSelected(names[0]) }, [names.join(), selected])
	if (!names.length) return <div className="empty-state"><h2>Your chart starts here.</h2><p>Log a workout to see your performance trend.</p></div>
	const data = rows.filter((row) => row.name === selected).sort((a, b) => a.date.localeCompare(b.date))
	const best = (key) => Math.max(0, ...data.map((row) => row[key]))
	const total = data.reduce((sum, row) => sum + row.volume, 0)
	const available = metrics.filter(([key]) => key !== 'relative' || weights.length)
	const [, metricName, unit] = available.find(([key]) => key === metric) || available[0]
	const latest = data[data.length - 1]
	return <>
		<label className="select-label">Exercise<select value={selected} onChange={(event) => setSelected(event.target.value)}>{names.map((name) => <option key={name} value={name}>{name}</option>)}</select></label>
		<div className="stats-grid stats-grid-4"><div><span>Best weight</span><strong>{best('weight')} <small>kg</small></strong></div><div><span>Est. 1RM</span><strong>{best('e1rm')} <small>kg</small></strong></div><div><span>Best reps</span><strong>{best('reps')}</strong></div><div><span>Sessions</span><strong>{data.length}</strong></div></div>
		<div className="progress-volume"><span>Total volume</span><strong>{total.toLocaleString()} <small>kg</small></strong></div>
		<div className="progress-volume"><span>Est. 1RM ÷ body weight</span>{!latest ? null : weights.length ? <strong>{latest.relative}× <small>latest session</small></strong> : <small>Log body weight to see this</small>}</div>
		<section className="chart-card"><div className="chip-row">{available.map(([key, label]) => <button key={key} className={`chip${metric === key ? ' active' : ''}`} onClick={() => setMetric(key)}>{label}</button>)}</div><TrendChart data={data} dataKey={available.some(([key]) => key === metric) ? metric : 'weight'} name={metricName} unit={unit}/></section>
		<p className="chart-footnote">Est. 1RM uses the Epley formula: weight × (1 + reps ÷ 30), from your best set each session. × Body weight divides it by your latest weigh-in on or before that day.</p>
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

function Summary({ data }) {
	const [kind, setKind] = useState('week')
	const [anchor, setAnchor] = useState(dateKey())
	const summary = summarizePeriod(data, kind, anchor)
	const isCurrent = summary.range.to >= dateKey()
	const noun = kind === 'week' ? 'week' : 'month'
	const change = (label, value, previous) => <small className="delta">{value === null ? `no ${previous} data` : `${signed(value, '%')} vs ${previous}`}</small>
	return <>
		<div className="period-nav"><div className="chip-row">{[['week', 'Week'], ['month', 'Month']].map(([key, label]) => <button key={key} className={`chip${kind === key ? ' active' : ''}`} onClick={() => setKind(key)}>{label}</button>)}</div><div className="period-step"><button onClick={() => setAnchor(shiftPeriod(kind, anchor, -1))} aria-label={`Previous ${noun}`}><ChevronLeft size={18}/></button><strong>{summary.range.label}</strong><button disabled={isCurrent} onClick={() => setAnchor(shiftPeriod(kind, anchor, 1))} aria-label={`Next ${noun}`}><ChevronRight size={18}/></button></div></div>
		<div className="stats-grid stats-grid-4">
			<div><span>Workouts</span><strong>{summary.sessions.length}<small> / {summary.planned} planned</small></strong></div>
			<div><span>Volume</span><strong>{Math.round(summary.volume).toLocaleString()} <small>kg</small></strong>{change('Volume', summary.volumeChange, summary.partial ? `same point last ${noun}` : `last ${noun}`)}</div>
			<div><span>Sets done</span><strong>{summary.sets}</strong></div>
			<div><span>PRs</span><strong>{summary.prs.length}</strong></div>
		</div>
		<section className="chart-card summary-card">
			<p className="card-label">Most improved</p>
			{summary.mostImproved ? <p className="summary-line"><b>{summary.mostImproved.name}</b> est. 1RM {summary.mostImproved.from} → {summary.mostImproved.to} kg <em>{signed(summary.mostImproved.gain, '%')}</em></p> : <p className="summary-line muted">No lift beat its earlier best this {noun} yet.</p>}
			<p className="card-label">Personal records</p>
			{summary.prs.length ? <ul className="pr-list">{summary.prs.map((pr, index) => <li key={index}><Trophy size={12}/><span><b>{pr.exercise}</b> {pr.label}</span><small>{formatDay(pr.date)}</small></li>)}</ul> : <p className="summary-line muted">No PRs this {noun}.</p>}
			{summary.bodyWeight && <><p className="card-label">Body weight</p><p className="summary-line">{summary.bodyWeight.start} → {summary.bodyWeight.end} kg <em>{signed(summary.bodyWeight.change, ' kg')}</em></p></>}
		</section>
		<Link className="report-link" to={`/report?kind=${kind}&date=${anchor}`}><FileText size={17}/> Open printable report<ChevronRight size={16}/></Link>
	</>
}

const recordSorts = [['recent', 'Recent'], ['strongest', 'Strongest'], ['name', 'A–Z']]
function Records({ workouts, weights }) {
	const [sort, setSort] = useState('recent')
	const records = personalRecords(workouts, weights).sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'strongest' ? (b.e1rm?.value || 0) - (a.e1rm?.value || 0) : b.latestRecord.localeCompare(a.latestRecord))
	if (!records.length) return <div className="empty-state"><h2>No records yet.</h2><p>Your best lifts will be collected here as you log workouts.</p></div>
	return <>
		<div className="chip-row">{recordSorts.map(([key, label]) => <button key={key} className={`chip${sort === key ? ' active' : ''}`} onClick={() => setSort(key)}>{label}</button>)}</div>
		<div className="record-list">{records.map((record) => <section className="record-card" key={record.key}>
			<div className="record-head"><h2>{record.name}</h2>{record.e1rm && <strong>{record.e1rm.value}<small> kg 1RM</small></strong>}</div>
			<dl>
				<div><dt>Heaviest</dt><dd>{record.weight.value} kg × {record.weight.reps}</dd><small>{formatDay(record.weight.date)}</small></div>
				<div><dt>Most reps</dt><dd>{record.reps.value} @ {record.reps.weight} kg</dd><small>{formatDay(record.reps.date)}</small></div>
				<div><dt>{weights.length ? '× Body weight' : 'Sessions'}</dt><dd>{weights.length ? `${record.relative}×` : record.sessions}</dd><small>{weights.length ? `${record.sessions} sessions` : `last ${formatDay(record.lastDate)}`}</small></div>
			</dl>
		</section>)}</div>
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

  return <Layout><main className="page"><div className="page-heading"><div><p className="eyebrow">Measured over time</p><h1>Progress</h1></div><span className="heading-icon"><TrendingUp size={21}/></span></div>{loading ? <div className="loading">Calculating progress...</div> : !selected ? <div className="empty-state"><h2>Your chart starts here.</h2><p>Log a workout to see your performance trend.</p></div> : <><label className="select-label">Exercise<select value={selected} onChange={(event) => setSelected(event.target.value)}>{names.map((name) => <option key={name} value={name}>{name}</option>)}</select></label><div className="stats-grid"><div><span>Best weight</span><strong>{bestWeight} <small>kg</small></strong></div><div><span>Best reps</span><strong>{bestReps}</strong></div><div><span>Sessions</span><strong>{data.length}</strong></div></div><div className="progress-volume"><span>Total volume</span><strong>{total.toLocaleString()} <small>kg</small></strong></div><section className="chart-card"><div className="chart-legend"><span><i className="legend-weight"/> Weight · kg</span><span><i className="legend-reps"/> Reps</span></div><div className="chart"><ResponsiveContainer width="100%" height="100%"><LineChart data={data}><XAxis dataKey="date" hide/><YAxis yAxisId="weight" hide domain={['auto', 'auto']}/><YAxis yAxisId="reps" hide orientation="right" domain={['auto', 'auto']}/><Tooltip contentStyle={{ background: 'var(--panel)', border: '1px solid var(--line)', color: 'var(--ink)', borderRadius: 6 }}/><Line yAxisId="weight" type="monotone" dataKey="weight" name="Weight (kg)" stroke="var(--accent)" strokeWidth={3} dot={{ fill: 'var(--accent)', r: 4 }} /><Line yAxisId="reps" type="monotone" dataKey="reps" name="Reps" stroke="var(--chart-secondary)" strokeWidth={2} dot={{ fill: 'var(--chart-secondary)', r: 3 }} /></LineChart></ResponsiveContainer></div></section></>}</main></Layout>
}
