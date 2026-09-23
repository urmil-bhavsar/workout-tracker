import * as XLSX from 'xlsx'

const download = (workbook) => {
  XLSX.writeFile(workbook, `repbook-export-${new Date().toISOString().slice(0, 10)}.xlsx`)
}

export function exportToExcel({ exercises, splitDays, workouts, bodyWeights }) {
  const workoutRows = workouts.map((workout) => ({
    Date: workout.date,
    Workout: workout.name,
    Exercises: workout.exercises.length,
    Sets: workout.exercises.reduce((total, exercise) => total + exercise.sets.length, 0),
    'Total Volume (kg)': workout.exercises.reduce((total, exercise) => total + exercise.sets.reduce((sum, set) => sum + Number(set.weight || 0) * Number(set.reps || 0), 0), 0),
    Notes: workout.note || '',
  }))
  const setRows = workouts.flatMap((workout) => workout.exercises.flatMap((exercise) => exercise.sets.map((set, index) => ({
    Date: workout.date,
    Workout: workout.name,
    Exercise: exercise.name,
    Set: index + 1,
    'Weight (kg)': Number(set.weight) || 0,
    Reps: Number(set.reps) || 0,
    'Volume (kg)': (Number(set.weight) || 0) * (Number(set.reps) || 0),
    Notes: exercise.note || '',
  }))))
  const libraryRows = exercises.map(({ id, name, muscle, equipment, custom }) => ({ ID: id, Name: name, Muscle: muscle, Equipment: equipment, Custom: custom ? 'Yes' : 'No' }))
  const splitRows = splitDays.flatMap((day) => day.exercises.map((exercise, index) => ({ Day: day.day, Workout: day.name, Rest: day.isRest ? 'Yes' : 'No', Order: index + 1, Exercise: exercise.name, 'Default Sets': exercise.defaultSets })))
  const weightRows = bodyWeights.map((entry) => ({ Date: entry.date, 'Body Weight (kg)': entry.weight, Notes: entry.note || '' }))
  const workbook = XLSX.utils.book_new()
  ;[['Workouts', workoutRows], ['Sets', setRows], ['Exercise Library', libraryRows], ['Weekly Split', splitRows], ['Body Weight', weightRows]].forEach(([name, rows]) => {
    const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ Info: 'No data recorded yet.' }])
    sheet['!cols'] = Object.keys(rows[0] || { Info: '' }).map(() => ({ wch: 18 }))
    XLSX.utils.book_append_sheet(workbook, sheet, name)
  })
  download(workbook)
}
