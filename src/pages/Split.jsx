import { useState } from 'react'
import { ArrowDown, ArrowUp, Check, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { Layout } from '../components/Layout'
import { db } from '../db/db'
import { useWorkoutData } from '../hooks/useWorkoutData'

export function Split() {
  const { split, exercises, loading, refresh } = useWorkoutData()
  const [notice, setNotice] = useState('')

  const update = async (day, patch) => {
    await db.splitDays.update(day.id, patch)
    await refresh()
    setNotice('Split updated')
    setTimeout(() => setNotice(''), 1600)
  }

  const move = async (day, index, direction) => {
    const next = [...day.exercises]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    await update(day, { exercises: next.map((item, i) => ({ ...item, order: i })) })
  }

  const remove = async (day, index) => {
    const next = day.exercises.filter((_, i) => i !== index)
    await update(day, { exercises: next.map((item, i) => ({ ...item, order: i })) })
  }

  if (loading) return <Layout><main className="page"><div className="loading">Loading split...</div></main></Layout>

  return <Layout><main className="page">
    <div className="page-heading"><div><p className="eyebrow">Your weekly rhythm</p><h1>Split</h1></div><button className="text-button" onClick={() => split.forEach((day) => update(day, { name: day.isRest ? 'Rest' : day.name }))}><RotateCcw size={15}/> Reset</button></div>
    <div className="split-list">{split.map((day) => <section className={`split-day ${day.isRest ? 'is-rest' : ''}`} key={day.id}>
      <div className="split-day-head"><div><span className="day-name">{day.day}</span><input value={day.name} onChange={(event) => update(day, { name: event.target.value })}/></div><button className="rest-toggle" onClick={() => update(day, { isRest: !day.isRest, name: !day.isRest ? 'Rest' : 'Workout' })}>{day.isRest ? 'Rest day' : `${day.exercises.length} exercises`}</button></div>
      {!day.isRest && <><div className="split-exercises">{day.exercises.map((item, index) => <div className="split-exercise" key={`${item.exerciseId}-${index}`}><span>{index + 1}</span><strong>{item.name}</strong><label><input type="number" min="1" max="20" value={item.defaultSets} onChange={(event) => update(day, { exercises: day.exercises.map((entry, i) => i === index ? { ...entry, defaultSets: Number(event.target.value) } : entry) })}/> sets</label><button onClick={() => move(day, index, -1)} aria-label="Move exercise up"><ArrowUp size={14}/></button><button onClick={() => move(day, index, 1)} aria-label="Move exercise down"><ArrowDown size={14}/></button><button className="remove-exercise" onClick={() => remove(day, index)} aria-label={`Remove ${item.name}`}><Trash2 size={15}/></button></div>)}</div><div className="add-exercise"><select value="" onChange={(event) => { const exercise = exercises.find((item) => item.id === Number(event.target.value)); if (exercise && !day.exercises.some((entry) => entry.exerciseId === exercise.id)) update(day, { exercises: [...day.exercises, { exerciseId: exercise.id, name: exercise.name, defaultSets: 3, order: day.exercises.length }] }) }}><option value="">+ Add exercise</option>{exercises.map((exercise) => <option value={exercise.id} key={exercise.id}>{exercise.name}</option>)}</select><Plus size={16}/></div></>}
    </section>)}</div>
    {notice && <div className="toast"><Check size={16}/> {notice}</div>}
  </main></Layout>
}
