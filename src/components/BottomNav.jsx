import { NavLink } from 'react-router-dom'
import { CalendarDays, Dumbbell, Home, Settings, TrendingUp } from 'lucide-react'
const items = [['/', Home, 'Today'], ['/history', CalendarDays, 'History'], ['/progress', TrendingUp, 'Progress'], ['/split', Dumbbell, 'Split'], ['/settings', Settings, 'Settings']]
export function BottomNav() { return <nav className="bottom-nav">{items.map(([to, Icon, label]) => <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}><Icon size={19} strokeWidth={1.8} /><span>{label}</span></NavLink>)}</nav> }
