import { Link } from 'react-router-dom'
import { CalendarDays, ChevronRight, Trophy } from 'lucide-react'
import { Layout } from '../components/Layout'
import { dateKey } from '../db/db'
import { useWorkoutData } from '../hooks/useWorkoutData'
import { formatDay, heatmap, loggedWorkouts, prCountsByDate, weekStreaks, workoutVolume } from '../utils/analytics'

const dayLabels = ['Mon', '', 'Wed', '', 'Fri', '', 'Sun']
function TrainingCalendar({ workouts }) {
	const cells = heatmap(workouts); const streaks = weekStreaks(workouts)
	const recent = loggedWorkouts(workouts).filter((workout) => workout.date >= cells[0].date).length
	return <section className="calendar-card">
		<div className="stats-grid"><div><span>Week streak</span><strong>{streaks.current} <small>wk</small></strong></div><div><span>Longest streak</span><strong>{streaks.longest} <small>wk</small></strong></div><div><span>Last {cells.length / 7} weeks</span><strong>{recent} <small>workouts</small></strong></div></div>
		<div className="heatmap"><div className="heatmap-days">{dayLabels.map((label, index) => <span key={index}>{label}</span>)}</div><div className="heatmap-grid" style={{ gridTemplateColumns: `repeat(${cells.length / 7}, 1fr)` }}>{cells.map((cell) => cell.future ? <span key={cell.date} className="heat-cell future"/> : cell.level ? <Link key={cell.date} to={`/?date=${cell.date}`} className={`heat-cell level-${cell.level}`} title={`${formatDay(cell.date)} · ${Math.round(cell.volume).toLocaleString()} kg`} aria-label={`${formatDay(cell.date)}, ${Math.round(cell.volume).toLocaleString()} kg`}/> : <span key={cell.date} className="heat-cell" title={formatDay(cell.date)}/>)}</div></div>
		<div className="heatmap-legend"><span>{formatDay(cells[0].date)}</span><span className="heatmap-scale">Less {[1, 2, 3, 4].map((level) => <i key={level} className={`heat-cell level-${level}`}/>)} More</span></div>
	</section>
}
export function History() { const { workouts, loading } = useWorkoutData(); const volume = workoutVolume; const prs = prCountsByDate(workouts); return <Layout><main className="page"><div className="page-heading"><div><p className="eyebrow">Your archive</p><h1>History</h1></div><span className="heading-icon"><CalendarDays size={21}/></span></div>{loading ? <div className="loading">Loading history...</div> : workouts.length === 0 ? <div className="empty-state"><h2>No workouts yet.</h2><p>Your completed sessions will appear here.</p></div> : <><TrainingCalendar workouts={workouts}/><div className="history-list">{workouts.map((workout) => <Link className="history-row" to={`/?date=${workout.date}`} key={workout.id}><div><strong>{new Date(`${workout.date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</strong><span>{workout.name}{prs[workout.date] > 0 && <em className="pr-badge"><Trophy size={10}/> {prs[workout.date]} PR{prs[workout.date] > 1 ? 's' : ''}</em>}</span></div><div className="history-meta"><span>{workout.exercises.length} exercises</span><b>{volume(workout).toLocaleString()} kg</b><ChevronRight size={18}/></div></Link>)}</div></>}<p className="history-footnote">{dateKey()} · Stored offline on this device</p></main></Layout> }
