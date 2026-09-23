import { Routes, Route, Navigate } from 'react-router-dom'
import { Home } from './pages/Home'
import { History } from './pages/History'
import { Progress } from './pages/Progress'
import { Split } from './pages/Split'
import { Settings } from './pages/Settings'

export default function App() {
  return <Routes><Route path="/" element={<Home />} /><Route path="/history" element={<History />} /><Route path="/progress" element={<Progress />} /><Route path="/split" element={<Split />} /><Route path="/settings" element={<Settings />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes>
}