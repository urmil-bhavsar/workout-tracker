import Dexie from 'dexie'

export const db = new Dexie('repbook')
db.version(1).stores({
  exercises: '++id, name, muscle, custom',
  splitDays: '++id, dayIndex, name, isRest',
  workouts: 'id, date, splitDayId, name',
  bodyWeights: '++id, date',
})

const catalog = [
  ['Bench Press', 'Chest', 'Barbell'], ['Incline Dumbbell Press', 'Chest', 'Dumbbells'], ['Cable Fly', 'Chest', 'Cable'],
  ['Lat Pulldown', 'Back', 'Cable'], ['Barbell Row', 'Back', 'Barbell'], ['Seated Cable Row', 'Back', 'Cable'],
  ['Shoulder Press', 'Shoulders', 'Machine'], ['Lateral Raise', 'Shoulders', 'Dumbbells'], ['Rear Delt Fly', 'Shoulders', 'Machine'],
  ['Squat', 'Legs', 'Barbell'], ['Leg Press', 'Legs', 'Machine'], ['Leg Extension', 'Legs', 'Machine'], ['Leg Curl', 'Legs', 'Machine'], ['Calf Raise', 'Legs', 'Machine'],
  ['Barbell Curl', 'Arms', 'Barbell'], ['Hammer Curl', 'Arms', 'Dumbbells'], ['Tricep Pushdown', 'Arms', 'Cable'], ['Skull Crushers', 'Arms', 'Barbell'],
]
const split = [
  ['Monday', 'Push', ['Bench Press', 'Incline Dumbbell Press', 'Shoulder Press', 'Lateral Raise', 'Tricep Pushdown']],
  ['Tuesday', 'Pull', ['Lat Pulldown', 'Barbell Row', 'Seated Cable Row', 'Rear Delt Fly', 'Hammer Curl']],
  ['Wednesday', 'Rest', []], ['Thursday', 'Legs', ['Squat', 'Leg Press', 'Leg Extension', 'Leg Curl', 'Calf Raise']],
  ['Friday', 'Push', ['Bench Press', 'Incline Dumbbell Press', 'Shoulder Press', 'Lateral Raise', 'Tricep Pushdown']],
  ['Saturday', 'Pull', ['Lat Pulldown', 'Barbell Row', 'Seated Cable Row', 'Rear Delt Fly', 'Hammer Curl']],
  ['Sunday', 'Rest', []],
]

export async function seedDatabase() {
  if (await db.exercises.count()) return
  await db.transaction('rw', db.exercises, db.splitDays, async () => {
    const ids = await db.exercises.bulkAdd(catalog.map(([name, muscle, equipment]) => ({ name, muscle, equipment, custom: false })), { allKeys: true })
    const byName = Object.fromEntries(catalog.map(([entry], index) => [entry, ids[index]]))
    await db.splitDays.bulkAdd(split.map(([day, name, names], dayIndex) => ({ dayIndex, day, name, isRest: name === 'Rest', exercises: names.map((exercise, order) => ({ exerciseId: byName[exercise], name: exercise, defaultSets: 3, order })) })))
  })
}

export const dateKey = (date = new Date()) => {
  const local = new Date(date)
  return `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`
}
export const shiftDate = (date, amount) => { const next = new Date(`${date}T12:00:00`); next.setDate(next.getDate() + amount); return dateKey(next) }
export const dayIndex = (date) => new Date(`${date}T12:00:00`).getDay() === 0 ? 6 : new Date(`${date}T12:00:00`).getDay() - 1

export async function getWorkout(date) { return db.workouts.get(date) }
export async function getPreviousPerformance(exerciseId, beforeDate) {
  const workouts = await db.workouts.where('date').below(beforeDate).reverse().sortBy('date')
  return workouts.find((workout) => workout.exercises.some((exercise) => exercise.exerciseId === exerciseId))?.exercises.find((exercise) => exercise.exerciseId === exerciseId) || null
}
export async function saveWorkout(workout) { await db.workouts.put({ ...workout, updatedAt: Date.now() }) }
export async function clearAllData() { await db.transaction('rw', db.tables, () => Promise.all(db.tables.map((table) => table.clear()))) }
export async function exportData() { return { exercises: await db.exercises.toArray(), splitDays: await db.splitDays.toArray(), workouts: await db.workouts.toArray(), bodyWeights: await db.bodyWeights.toArray() } }
export async function importData(data) { await clearAllData(); await db.transaction('rw', db.tables, () => Promise.all(Object.entries(data).filter(([key]) => db[key]).map(([key, rows]) => db[key].bulkPut(rows)))) }
