import { dayIndex, shiftDate } from '../db/db'

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

// PR count for every workout, in one chronological pass.
export function prCountsByDate(workouts) {
	const bests = new Map(); const counts = {}
	byDate(workouts).forEach((workout) => {
		counts[workout.date] = workout.exercises.reduce((sum, exercise) => sum + (exercisePrs(exercise, bests.get(exerciseKey(exercise))).length ? 1 : 0), 0)
		workout.exercises.forEach((exercise) => {
			if (!doneSets(exercise).length) return
			const best = exerciseBest(exercise); const previous = bests.get(exerciseKey(exercise))
			bests.set(exerciseKey(exercise), previous ? { weight: Math.max(previous.weight, best.weight), reps: Math.max(previous.reps, best.reps), e1rm: Math.max(previous.e1rm, best.e1rm) } : best)
		})
	})
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
