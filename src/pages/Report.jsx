import { useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, Printer, Share2, Trophy } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { dateKey } from '../db/db'
import { useWorkoutData } from '../hooks/useWorkoutData'
import { doneSets, formatDay, shiftPeriod, summarizePeriod, workoutVolume } from '../utils/analytics'

const kg = (value) => `${Math.round(value).toLocaleString()} kg`
const signed = (value, unit) => `${value > 0 ? '+' : ''}${value}${unit}`
const setsText = (exercise) => doneSets(exercise).map((set) => `${Number(set.weight) || 0}×${set.reps}`).join(', ')

function shareText(summary, title) {
	const lines = [title, summary.range.label, '', `Workouts: ${summary.sessions.length}/${summary.planned} planned`, `Volume: ${kg(summary.volume)}${summary.volumeChange !== null ? ` (${signed(summary.volumeChange, '%')})` : ''}`, `Sets: ${summary.sets}`, `PRs: ${summary.prs.length}`]
	if (summary.mostImproved) lines.push(`Most improved: ${summary.mostImproved.name} ${signed(summary.mostImproved.gain, '%')}`)
	summary.prs.forEach((pr) => lines.push(`🏆 ${pr.exercise} ${pr.label} (${formatDay(pr.date)})`))
	if (summary.bodyWeight) lines.push(`Body weight: ${summary.bodyWeight.start} → ${summary.bodyWeight.end} kg`)
	return lines.join('\n')
}

export function Report() {
	const { split, workouts, exercises, weights, loading } = useWorkoutData()
	const [params, setParams] = useSearchParams()
	const [notice, setNotice] = useState('')
	const kind = params.get('kind') === 'month' ? 'month' : 'week'
	const anchor = params.get('date') || dateKey()
	const go = (next) => setParams({ kind, date: anchor, ...next }, { replace: true })
	if (loading) return <main className="report-screen"><div className="loading">Building report...</div></main>
	const summary = summarizePeriod({ workouts, split, exercises, weights }, kind, anchor)
	const title = `RepBook ${kind === 'week' ? 'weekly' : 'monthly'} report`
	const share = async () => {
		const text = shareText(summary, title)
		try {
			if (navigator.share) await navigator.share({ title, text })
			else { await navigator.clipboard.writeText(text); setNotice('Summary copied to clipboard'); setTimeout(() => setNotice(''), 2200) }
		} catch (error) { if (error?.name !== 'AbortError') setNotice('Sharing is not available here') }
	}
	return <main className="report-screen">
		<div className="report-toolbar no-print">
			<Link to="/progress?tab=summary" className="report-back"><ArrowLeft size={17}/> Progress</Link>
			<div className="chip-row">{[['week', 'Week'], ['month', 'Month']].map(([key, label]) => <button key={key} className={`chip${kind === key ? ' active' : ''}`} onClick={() => go({ kind: key })}>{label}</button>)}</div>
			<div className="period-step"><button onClick={() => go({ date: shiftPeriod(kind, anchor, -1) })} aria-label="Previous period"><ChevronLeft size={18}/></button><strong>{summary.range.label}</strong><button disabled={summary.range.to >= dateKey()} onClick={() => go({ date: shiftPeriod(kind, anchor, 1) })} aria-label="Next period"><ChevronRight size={18}/></button></div>
			<div className="report-actions"><button onClick={share}><Share2 size={16}/> Share</button><button className="primary" onClick={() => window.print()}><Printer size={16}/> Save as PDF</button></div>
		</div>
		<article className="report-paper">
			<header><p>REPBOOK · {kind === 'week' ? 'WEEKLY' : 'MONTHLY'} REPORT</p><h1>{summary.range.label}</h1><small>Generated {formatDay(dateKey())}</small></header>
			<div className="report-stats">
				<div><span>Workouts</span><strong>{summary.sessions.length}<small>/{summary.planned}</small></strong><em>planned</em></div>
				<div><span>Volume</span><strong>{kg(summary.volume)}</strong><em>{summary.volumeChange === null ? 'no previous data' : `${signed(summary.volumeChange, '%')} vs ${summary.partial ? 'same point last' : 'last'} ${kind}`}</em></div>
				<div><span>Sets</span><strong>{summary.sets}</strong><em>with reps logged</em></div>
				<div><span>PRs</span><strong>{summary.prs.length}</strong><em>{summary.mostImproved ? `best: ${summary.mostImproved.name} ${signed(summary.mostImproved.gain, '%')}` : 'no lift improved'}</em></div>
			</div>
			{summary.bodyWeight && <p className="report-note">Body weight {summary.bodyWeight.start} → {summary.bodyWeight.end} kg ({signed(summary.bodyWeight.change, ' kg')})</p>}
			<h2>Personal records</h2>
			{summary.prs.length ? <table><thead><tr><th>Date</th><th>Exercise</th><th>Record</th></tr></thead><tbody>{summary.prs.map((pr, index) => <tr key={index}><td>{formatDay(pr.date)}</td><td><Trophy size={11}/> {pr.exercise}</td><td>{pr.label}</td></tr>)}</tbody></table> : <p className="report-empty">No PRs this {kind}.</p>}
			<h2>Muscle groups</h2>
			{summary.muscles.length ? <table><thead><tr><th>Muscle</th><th className="num">Sets</th><th className="num">Volume</th></tr></thead><tbody>{summary.muscles.map((group) => <tr key={group.muscle}><td>{group.muscle}</td><td className="num">{group.sets}</td><td className="num">{kg(group.volume)}</td></tr>)}</tbody></table> : <p className="report-empty">Nothing logged.</p>}
			<h2>Sessions</h2>
			{summary.sessions.length ? summary.sessions.map((workout) => <section className="report-session" key={workout.date}>
				<div className="report-session-head"><strong>{formatDay(workout.date)} · {workout.name}</strong><span>{kg(workoutVolume(workout))}</span></div>
				<table><tbody>{workout.exercises.filter((exercise) => doneSets(exercise).length).map((exercise, index) => <tr key={index}><td>{exercise.name}</td><td className="num">{setsText(exercise)}</td></tr>)}</tbody></table>
				{workout.note && <p className="report-note">“{workout.note}”</p>}
			</section>) : <p className="report-empty">No workouts logged this {kind}.</p>}
		</article>
		{notice && <div className="toast">{notice}</div>}
	</main>
}
