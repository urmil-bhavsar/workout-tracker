import { Link } from 'react-router-dom'
import { Bell, Zap } from 'lucide-react'
import { BottomNav } from './BottomNav'
export function Layout({ children }) { return <div className="app-frame"><header className="topbar"><Link to="/" className="brand"><span className="brand-mark"><Zap size={16} fill="currentColor" /></span><span>REPBOOK</span></Link><button className="profile-dot" aria-label="Profile"><Bell size={17} /></button></header>{children}<BottomNav /></div> }
