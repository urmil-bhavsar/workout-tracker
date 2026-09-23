import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Save } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { SetTable } from '../components/SetTable'
import { dateKey, dayIndex, getWorkout, saveWorkout, shiftDate } from '../db/db'
import { useWorkoutData } from '../hooks/useWorkoutData'

const emptySets = (count = 3) => Array.from({ length: count }, () => ({ weight: '', reps: '' }))
const prettyDate = (date) => new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
export function Home() {
	const { split, workouts, loading, refresh } = useWorkoutData()
	const [searchParams] = useSearchParams(); const [date, setDate] = useState(searchParams.get('date') || dateKey()); const [form, setForm] = useState(null); const [notice, setNotice] = useState('')
	const template = split[dayIndex(date)]; const existing = workouts.find((item) => item.date === date)
	useEffect(() => { if (!template) return; getWorkout(date).then((saved) => setForm(saved || { id: date, date, splitDayId: template.id, name: template.name, note: '', exercises: template.exercises.map((exercise) => ({ ...exercise, sets: emptySets(exercise.defaultSets), note: '' })) })) }, [date, template?.id, existing?.updatedAt])
	const updateExercise = (index, patch) => setForm({ ...form, exercises: form.exercises.map((exercise, i) => i === index ? { ...exercise, ...patch } : exercise) })
	const save = async () => { await saveWorkout(form); await refresh(); setNotice('Saved locally'); setTimeout(() => setNotice(''), 2200) }
	if (loading || !form) return <Layout><main className="page"><div className="loading">Loading your logbook...</div></main></Layout>
	const totalSets = form.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0)
	return <Layout><main className="page workout-page"><div className="date-nav"><button onClick={() => setDate(shiftDate(date, -1))} aria-label="Previous day"><ChevronLeft size={20} /></button><button className="today-button" onClick={() => setDate(dateKey())}>{date === dateKey() ? 'TODAY' : 'BACK TO TODAY'}</button><button onClick={() => setDate(shiftDate(date, 1))} aria-label="Next day"><ChevronRight size={20} /></button></div><section className="workout-heading"><p className="eyebrow">{prettyDate(date)}</p><h1>{template?.isRest ? 'Rest day' : template?.name || 'No workout'}</h1><p className="muted">{template?.isRest ? 'Recovery is part of the plan.' : `${form.exercises.length} exercises · ${totalSets} sets`}</p></section>{template?.isRest ? <div className="rest-state"><span>01</span><h2>Take the day off.</h2><p>No workout scheduled today. Your next session will be waiting here.</p></div> : <>{form.exercises.map((exercise, index) => <section className="exercise-card" key={`${exercise.exerciseId}-${index}`}><div className="exercise-title"><div><span className="exercise-index">0{index + 1}</span><h2>{exercise.name}</h2></div><span className="set-count">{exercise.sets.length} sets</span></div><SetTable sets={exercise.sets} onChange={(sets) => updateExercise(index, { sets })}/><input className="note-input" value={exercise.note || ''} onChange={(event) => updateExercise(index, { note: event.target.value })} placeholder="Add a note (optional)" /></section>)}<textarea className="workout-note" value={form.note || ''} onChange={(event) => setForm({ ...form, note: event.target.value })} placeholder="How did it feel today?"/><button className="save-button" onClick={save}><Save size={18}/> {existing ? 'Update workout' : 'Save workout'}</button></>}{notice && <div className="toast">{notice}</div>}</main></Layout>
}