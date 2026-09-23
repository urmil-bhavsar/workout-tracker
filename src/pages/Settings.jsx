import { useState } from 'react'
import { Download, FileSpreadsheet, Moon, Upload } from 'lucide-react'
import { Layout } from '../components/Layout'
import { exportData, importData } from '../db/db'
import { exportToExcel } from '../utils/excelExport'

export function Settings() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')
  const [message, setMessage] = useState('')
  const notify = (text) => { setMessage(text); setTimeout(() => setMessage(''), 2200) }
  const toggleTheme = () => { const next = theme === 'dark' ? 'light' : 'dark'; setTheme(next); localStorage.setItem('theme', next); document.documentElement.dataset.theme = next }
  const downloadJson = async () => { const blob = new Blob([JSON.stringify(await exportData(), null, 2)], { type: 'application/json' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `repbook-backup-${new Date().toISOString().slice(0, 10)}.json`; link.click(); URL.revokeObjectURL(link.href); notify('JSON backup exported') }
  const downloadExcel = async () => { exportToExcel(await exportData()); notify('Excel file exported') }
  const upload = (event) => { const file = event.target.files[0]; if (!file || !confirm('Importing replaces the local data on this device. Continue?')) return; const reader = new FileReader(); reader.onload = async () => { try { await importData(JSON.parse(reader.result)); notify('Backup restored') } catch { notify('That backup could not be read') } }; reader.readAsText(file) }
  return <Layout><main className="page"><div className="page-heading"><div><p className="eyebrow">Local only</p><h1>Settings</h1></div></div><section className="settings-group"><button className="setting-row" onClick={toggleTheme}><span><Moon size={19}/><span>Appearance<small>{theme === 'dark' ? 'Dark mode' : 'Light mode'}</small></span></span><span className="switch on"/></button><div className="settings-divider"/><button className="setting-row" onClick={downloadJson}><span><Download size={19}/><span>Export JSON<small>Full backup for restoring later</small></span></span><span>→</span></button><button className="setting-row" onClick={downloadExcel}><span><FileSpreadsheet size={19}/><span>Export as Excel<small>Open your workout data in spreadsheets</small></span></span><span>→</span></button><label className="setting-row"><span><Upload size={19}/><span>Import JSON<small>Restore from a backup</small></span></span><input type="file" accept="application/json" onChange={upload}/><span>→</span></label></section><p className="settings-note">RepBook stores your logbook in this browser using IndexedDB. No account or server is involved.</p>{message && <div className="toast">{message}</div>}</main></Layout>
}
