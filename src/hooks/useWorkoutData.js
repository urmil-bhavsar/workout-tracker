import { useEffect, useState } from 'react'
import { db, seedDatabase } from '../db/db'

export function useWorkoutData() {
  const [data, setData] = useState({ split: [], exercises: [], workouts: [], weights: [], loading: true })
  const refresh = async () => setData({ split: await db.splitDays.orderBy('dayIndex').toArray(), exercises: await db.exercises.orderBy('name').toArray(), workouts: await db.workouts.orderBy('date').reverse().toArray(), weights: await db.bodyWeights.orderBy('date').reverse().toArray(), loading: false })
  useEffect(() => { seedDatabase().then(refresh) }, [])
  return { ...data, refresh }
}
