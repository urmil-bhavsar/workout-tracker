import { dateKey, dayIndex, shiftDate } from '../db/db'

const num = (value) => Number(value) || 0
export const doneSets = (exercise) => exercise.sets.filter((set) => num(set.reps) > 0)
export const setVolume = (set) => num(set.weight) * num(set.reps)
export const exerciseVolume = (exercise) => exercise.sets.reduce((sum, set) => sum + setVolume(set), 0)
export const workoutVolume = (workout) => workout.exercises.reduce((sum, exercise) => sum + exerciseVolume(exercise), 0)
// Epley formula; a single rep is the lift itself.
export const oneRepMax = (weight, reps) => { const w = num(weight); const r = num(reps); if (!w || !r) return 0; return r === 1 ? w : Math.round(w * (1 + r / 30) * 10) / 10 }
export const exerciseKey = (exercise) => exercise.exerciseId ?? exercise.name
export const exerciseBest = (exercise) => ({
	weight: Math.max(0, ...doneSets(exercise).map((set) => num(set.weight))),
	reps: Math.max(0, ...doneSets(exercise).map((set) => num(set.reps))),
	e1rm: Math.max(0, ...exercise.sets.map((set) => oneRepMax(set.weight, set.reps))),
})

const byDate = (workouts) => [...workouts].sort((a, b) => a.date.localeCompare(b.date))

// Best weight / reps / estimated 1RM per exercise from every workout before `date`.
export function bestsBefore(workouts, date) {
	const bests = new Map()
	workouts.filter((workout) => workout.date < date).forEach((workout) => workout.exercises.forEach((exercise) => {
		const best = exerciseBest(exercise); const previous = bests.get(exerciseKey(exercise))
		if (!previous) { if (doneSets(exercise).length) bests.set(exerciseKey(exercise), best); return }
		bests.set(exerciseKey(exercise), { weight: Math.max(previous.weight, best.weight), reps: Math.max(previous.reps, best.reps), e1rm: Math.max(previous.e1rm, best.e1rm) })
	}))
	return bests
}

// Records an exercise beats compared to its previous best. A first-ever session is not a PR.
export function exercisePrs(exercise, previousBest) {
	if (!previousBest) return []
	const best = exerciseBest(exercise); const prs = []
	if (best.weight > previousBest.weight) prs.push({ type: 'weight', label: `${best.weight} kg`, value: best.weight })
	if (best.e1rm > previousBest.e1rm) prs.push({ type: 'e1rm', label: `${best.e1rm} kg est. 1RM`, value: best.e1rm })
	if (best.reps > previousBest.reps) prs.push({ type: 'reps', label: `${best.reps} reps`, value: best.reps })
	return prs
}

export function workoutPrs(workout, workouts) {
	const bests = bestsBefore(workouts, workout.date)
	return workout.exercises.flatMap((exercise) => exercisePrs(exercise, bests.get(exerciseKey(exercise))).map((pr) => ({ ...pr, exercise: exercise.name })))
}

// Every PR ever set, in date order: { date, exercise, type, label, value }.
export function prEvents(workouts) {
	const bests = new Map(); const events = []
	byDate(workouts).forEach((workout) => workout.exercises.forEach((exercise) => {
		const key = exerciseKey(exercise); const previous = bests.get(key)
		exercisePrs(exercise, previous).forEach((pr) => events.push({ ...pr, date: workout.date, exercise: exercise.name }))
		if (!doneSets(exercise).length) return
		const best = exerciseBest(exercise)
		bests.set(key, previous ? { weight: Math.max(previous.weight, best.weight), reps: Math.max(previous.reps, best.reps), e1rm: Math.max(previous.e1rm, best.e1rm) } : best)
	}))
	return events
}

// Number of exercises with a PR, per workout date.
export function prCountsByDate(workouts) {
	const seen = new Set(); const counts = {}
	prEvents(workouts).forEach(({ date, exercise }) => { if (seen.has(`${date}|${exercise}`)) return; seen.add(`${date}|${exercise}`); counts[date] = (counts[date] || 0) + 1 })
	return counts
}

// Most recent logged session of an exercise before `date`.
export function lastPerformance(workouts, exercise, date) {
	const key = exerciseKey(exercise)
	for (const workout of byDate(workouts).reverse()) {
		if (workout.date >= date) continue
		const match = workout.exercises.find((item) => exerciseKey(item) === key && doneSets(item).length)
		if (match) return { date: workout.date, sets: match.sets }
	}
	return null
}

export const weekStart = (date) => shiftDate(date, -dayIndex(date))

// Sets and volume per muscle group for workouts in [from, to].
export function muscleVolume(workouts, exercises, from, to) {
	const muscleOf = new Map(exercises.map((exercise) => [exercise.id, exercise.muscle]))
	const groups = {}
	workouts.filter((workout) => workout.date >= from && workout.date <= to).forEach((workout) => workout.exercises.forEach((exercise) => {
		const sets = doneSets(exercise).length; if (!sets) return
		const muscle = muscleOf.get(exercise.exerciseId) || 'Other'
		groups[muscle] = groups[muscle] || { muscle, sets: 0, volume: 0 }
		groups[muscle].sets += sets; groups[muscle].volume += exerciseVolume(exercise)
	}))
	return Object.values(groups).sort((a, b) => b.sets - a.sets)
}

export const isLogged = (workout) => workout.exercises.some((exercise) => doneSets(exercise).length)
export const loggedWorkouts = (workouts) => workouts.filter(isLogged)
const round1 = (value) => Math.round(value * 10) / 10

// Body weight on a date: latest weigh-in on or before it, else the earliest one.
export function bodyWeightOn(weights, date) {
	const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date))
	return ([...sorted].reverse().find((entry) => entry.date <= date) || sorted[0])?.weight || 0
}
export const relativeStrength = (e1rm, bodyWeight) => bodyWeight ? Math.round((e1rm / bodyWeight) * 100) / 100 : 0

// Best weight, reps and estimated 1RM per exercise, with the date and set that set them.
export function personalRecords(workouts, weights = []) {
	const records = new Map()
	byDate(workouts).forEach((workout) => workout.exercises.forEach((exercise) => {
		const sets = doneSets(exercise); if (!sets.length) return
		const key = exerciseKey(exercise)
		const record = records.get(key) || { key, name: exercise.name, sessions: 0, weight: null, reps: null, e1rm: null }
		record.name = exercise.name; record.sessions += 1; record.lastDate = workout.date
		sets.forEach((set) => {
			const weight = num(set.weight); const reps = num(set.reps); const e1rm = oneRepMax(weight, reps)
			if (!record.weight || weight > record.weight.value) record.weight = { value: weight, reps, date: workout.date }
			if (!record.reps || reps > record.reps.value) record.reps = { value: reps, weight, date: workout.date }
			if (e1rm && (!record.e1rm || e1rm > record.e1rm.value)) record.e1rm = { value: e1rm, weight, reps, date: workout.date }
		})
		records.set(key, record)
	}))
	return [...records.values()].map((record) => ({ ...record, relative: record.e1rm ? relativeStrength(record.e1rm.value, bodyWeightOn(weights, record.e1rm.date)) : 0, latestRecord: [record.weight, record.reps, record.e1rm].filter(Boolean).map((item) => item.date).sort().pop() }))
}

// Week (Mon–Sun) or calendar month containing `anchor`.
export function periodRange(kind, anchor) {
	if (kind === 'week') { const from = weekStart(anchor); return { kind, from, to: shiftDate(from, 6), label: `${formatDay(from)} – ${formatDay(shiftDate(from, 6))}` } }
	const [year, month] = anchor.split('-').map(Number)
	const from = `${anchor.slice(0, 7)}-01`; const to = dateKey(new Date(year, month, 0))
	return { kind, from, to, label: new Date(`${from}T12:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) }
}
export const shiftPeriod = (kind, anchor, amount) => {
	if (kind === 'week') return shiftDate(anchor, amount * 7)
	const [year, month] = anchor.split('-').map(Number)
	return dateKey(new Date(year, month - 1 + amount, 1))
}
export const formatDay = (date) => new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

// Training days the split planned in [from, to], not counting days after `today`.
export function plannedDays(split, from, to, today = dateKey()) {
	let count = 0
	for (let date = from; date <= to && date <= today; date = shiftDate(date, 1)) if (split[dayIndex(date)] && !split[dayIndex(date)].isRest) count += 1
	return count
}

const percentChange = (current, previous) => previous ? Math.round(((current - previous) / previous) * 100) : null

// Everything the weekly/monthly summary and the report show.
export function summarizePeriod({ workouts, split, exercises, weights = [] }, kind, anchor) {
	const range = periodRange(kind, anchor); const previous = periodRange(kind, shiftPeriod(kind, anchor, -1))
	const logged = loggedWorkouts(workouts)
	const inRange = (item, { from, to }) => item.date >= from && item.date <= to
	const sessions = logged.filter((workout) => inRange(workout, range)).sort((a, b) => a.date.localeCompare(b.date))
	// A period still in progress is compared with the same number of days of the previous one.
	const today = dateKey(); const elapsed = range.to > today ? Math.round((new Date(`${today}T12:00:00`) - new Date(`${range.from}T12:00:00`)) / 86400000) : null
	const compareTo = elapsed === null ? previous : { from: previous.from, to: [shiftDate(previous.from, elapsed), previous.to].sort()[0] }
	const previousSessions = logged.filter((workout) => inRange(workout, compareTo))
	const volume = sessions.reduce((sum, workout) => sum + workoutVolume(workout), 0)
	const previousVolume = previousSessions.reduce((sum, workout) => sum + workoutVolume(workout), 0)
	const sets = sessions.reduce((sum, workout) => sum + workout.exercises.reduce((total, exercise) => total + doneSets(exercise).length, 0), 0)
	// One entry per exercise per day, e.g. "80 kg · 93.3 kg est. 1RM".
	const prs = Object.values(prEvents(workouts).filter((pr) => inRange(pr, range)).reduce((groups, pr) => { const key = `${pr.date}|${pr.exercise}`; groups[key] = groups[key] ? { ...groups[key], label: `${groups[key].label} · ${pr.label}` } : { ...pr }; return groups }, {}))
	// Most improved: biggest % rise in best est. 1RM this period over the best before it.
	const before = bestsBefore(workouts, range.from); const improvements = new Map()
	sessions.forEach((workout) => workout.exercises.forEach((exercise) => {
		const previousBest = before.get(exerciseKey(exercise)); const best = exerciseBest(exercise).e1rm
		if (!previousBest?.e1rm || best <= previousBest.e1rm) return
		const gain = (best - previousBest.e1rm) / previousBest.e1rm
		if (!improvements.has(exercise.name) || gain > improvements.get(exercise.name).gain) improvements.set(exercise.name, { name: exercise.name, gain, from: previousBest.e1rm, to: best })
	}))
	const mostImproved = [...improvements.values()].sort((a, b) => b.gain - a.gain)[0] || null
	const periodWeights = weights.filter((entry) => inRange(entry, range)).sort((a, b) => a.date.localeCompare(b.date))
	return {
		range, previous, partial: elapsed !== null, sessions, volume, previousVolume, volumeChange: percentChange(volume, previousVolume), sets, prs, mostImproved: mostImproved && { ...mostImproved, gain: Math.round(mostImproved.gain * 100) },
		planned: plannedDays(split, range.from, range.to), muscles: muscleVolume(workouts, exercises, range.from, range.to),
		bodyWeight: periodWeights.length ? { start: periodWeights[0].weight, end: periodWeights[periodWeights.length - 1].weight, change: round1(periodWeights[periodWeights.length - 1].weight - periodWeights[0].weight) } : null,
	}
}

// Weeks in a row (up to this week) with at least one workout. This week only breaks the streak once it is over.
export function weekStreaks(workouts, today = dateKey()) {
	const weeks = new Set(loggedWorkouts(workouts).map((workout) => weekStart(workout.date)))
	let current = 0; let week = weekStart(today)
	if (!weeks.has(week)) week = shiftDate(week, -7)
	while (weeks.has(week)) { current += 1; week = shiftDate(week, -7) }
	let longest = 0; let run = 0; let previous = null
	;[...weeks].sort().forEach((start) => { run = previous && shiftDate(previous, 7) === start ? run + 1 : 1; longest = Math.max(longest, run); previous = start })
	return { current, longest }
}

// Calendar cells for the last `weeks` weeks, Monday-first, with a 0–4 volume level.
export function heatmap(workouts, weeks = 17, today = dateKey()) {
	const volumes = {}
	loggedWorkouts(workouts).forEach((workout) => { volumes[workout.date] = (volumes[workout.date] || 0) + workoutVolume(workout) })
	const start = shiftDate(weekStart(today), -(weeks - 1) * 7)
	const values = Object.entries(volumes).filter(([date]) => date >= start).map(([, volume]) => volume).sort((a, b) => a - b)
	const quartile = (q) => values[Math.min(values.length - 1, Math.floor(q * values.length))] || 0
	const cuts = [quartile(.25), quartile(.5), quartile(.75)]
	return Array.from({ length: weeks * 7 }, (_, index) => {
		const date = shiftDate(start, index); const volume = volumes[date]
		return { date, volume: volume || 0, future: date > today, level: volume === undefined ? 0 : 1 + cuts.filter((cut) => volume > cut).length }
	})
}
