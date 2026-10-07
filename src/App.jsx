import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './firebase/AuthContext'

const Home = lazy(() => import('./pages/Home').then((module) => ({ default: module.Home })))
const History = lazy(() => import('./pages/History').then((module) => ({ default: module.History })))
const Progress = lazy(() => import('./pages/Progress').then((module) => ({ default: module.Progress })))
const Split = lazy(() => import('./pages/Split').then((module) => ({ default: module.Split })))
const Settings = lazy(() => import('./pages/Settings').then((module) => ({ default: module.Settings })))
const Report = lazy(() => import('./pages/Report').then((module) => ({ default: module.Report })))

export default function App() {
  const { ready, syncing } = useAuth()
  if (!ready) return <main className="page"><div className="loading">{ syncing ? 'Syncing your logbook...' : 'Loading your logbook...' }</div></main>
  return <Suspense fallback={ <main className="page"><div className="loading">Loading your logbook...</div></main> }><Routes><Route path="/" element={ <Home /> } /><Route path="/history" element={ <History /> } /><Route path="/progress" element={ <Progress /> } /><Route path="/split" element={ <Split /> } /><Route path="/settings" element={ <Settings /> } /><Route path="/report" element={ <Report /> } /><Route path="*" element={ <Navigate to="/" replace /> } /></Routes></Suspense>
}