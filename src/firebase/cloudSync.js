import { collection, doc, getDocs, writeBatch } from 'firebase/firestore'
import { db } from '../db/db'
import { firestore } from './client'

const tableNames = ['exercises', 'splitDays', 'workouts', 'bodyWeights']
let syncQueue = Promise.resolve()
let syncTimer

const recordId = (tableName, row) => String(tableName === 'bodyWeights' ? row.date : row.id)
const freshest = (localRow, cloudRow) => (Number(localRow.updatedAt) || 0) >= (Number(cloudRow.updatedAt) || 0) ? localRow : cloudRow

function mergeExercises(localRows, cloudRows) {
  const merged = new Map(cloudRows.map((row) => [String(row.id), row]))
  const cloudByName = new Map(cloudRows.map((row) => [row.name.trim().toLowerCase(), row]))
  const remappedNames = new Map()
  let nextId = Math.max(0, ...cloudRows.map((row) => Number(row.id) || 0), ...localRows.map((row) => Number(row.id) || 0)) + 1

  for (const local of localRows) {
    const sameName = cloudByName.get(local.name.trim().toLowerCase())
    if (sameName) {
      remappedNames.set(local.name, sameName.id)
      if (String(sameName.id) === String(local.id)) merged.set(String(local.id), freshest(local, sameName))
      continue
    }
    const collision = merged.get(String(local.id))
    if (collision) {
      const moved = { ...local, id: nextId++ }
      merged.set(String(moved.id), moved)
      remappedNames.set(local.name, moved.id)
    } else {
      merged.set(String(local.id), local)
      remappedNames.set(local.name, local.id)
    }
  }

  const localIdToMerged = new Map(localRows.map((row) => [String(row.id), remappedNames.get(row.name) ?? row.id]))
  return { rows: [...merged.values()], localIdToMerged }
}

function remapReferences(tableName, rows, idMap) {
  if (tableName === 'splitDays') return rows.map((row) => ({ ...row, exercises: (row.exercises || []).map((exercise) => ({ ...exercise, exerciseId: idMap.get(String(exercise.exerciseId)) ?? exercise.exerciseId })) }))
  if (tableName === 'workouts') return rows.map((row) => ({ ...row, exercises: (row.exercises || []).map((exercise) => ({ ...exercise, exerciseId: idMap.get(String(exercise.exerciseId)) ?? exercise.exerciseId })) }))
  return rows
}

async function syncTables(uid) {
  if (!firestore) throw new Error('Firebase is not configured.')
  const localTables = Object.fromEntries(await Promise.all(tableNames.map(async (name) => [name, await db.table(name).toArray()])))
  const cloudTables = {}
  for (const name of tableNames) {
    const snapshot = await getDocs(collection(firestore, 'users', uid, name))
    cloudTables[name] = snapshot.docs.map((item) => item.data())
  }

  const { rows: exercises, localIdToMerged } = mergeExercises(localTables.exercises, cloudTables.exercises)
  const merged = { exercises }
  for (const name of ['splitDays', 'workouts', 'bodyWeights']) {
    const locals = remapReferences(name, localTables[name], localIdToMerged)
    const byId = new Map(cloudTables[name].map((row) => [recordId(name, row), row]))
    for (const row of locals) {
      const key = recordId(name, row)
      const cloudRow = byId.get(key)
      byId.set(key, cloudRow ? freshest(row, cloudRow) : row)
    }
    merged[name] = [...byId.values()]
  }

  const writeOperations = []
  for (const name of tableNames) {
    const ref = collection(firestore, 'users', uid, name)
    const snapshot = await getDocs(ref)
    const keep = new Set(merged[name].map((row) => recordId(name, row)))
    snapshot.docs.filter((item) => !keep.has(item.id)).forEach((item) => writeOperations.push({ type: 'delete', ref: item.ref }))
    merged[name].forEach((row) => writeOperations.push({ type: 'set', ref: doc(ref, recordId(name, row)), row }))
  }
  for (let offset = 0; offset < writeOperations.length; offset += 450) {
    const batch = writeBatch(firestore)
    for (const operation of writeOperations.slice(offset, offset + 450)) {
      if (operation.type === 'delete') batch.delete(operation.ref)
      else batch.set(operation.ref, operation.row)
    }
    await batch.commit()
  }

  await db.transaction('rw', tableNames.map((name) => db.table(name)), async () => {
    for (const name of tableNames) {
      await db.table(name).clear()
      if (merged[name].length) await db.table(name).bulkPut(merged[name])
    }
  })
  return { records: tableNames.reduce((count, name) => count + merged[name].length, 0) }
}

export function syncLocalData(uid) {
  syncQueue = syncQueue.catch(() => undefined).then(() => syncTables(uid))
  return syncQueue
}

export function scheduleCloudSync(uid) {
  if (!uid) return
  clearTimeout(syncTimer)
  syncTimer = setTimeout(() => { syncLocalData(uid).catch((error) => console.error('Workout sync failed:', error)) }, 1200)
}
