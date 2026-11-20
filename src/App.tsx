import { Route, Routes } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import HomePage from '@/pages/HomePage'
import DailyDivePage from '@/pages/DailyDivePage'
import UnlimitedPage from '@/pages/UnlimitedPage'
import ArchivePage from '@/pages/ArchivePage'
import ArchivedDailyPracticePage from '@/pages/ArchivedDailyPracticePage'
import GameRecordPage from '@/pages/GameRecordPage'
import StatisticsPage from '@/pages/StatisticsPage'
import SettingsPage from '@/pages/SettingsPage'
import NotFoundPage from '@/pages/NotFoundPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="daily" element={<DailyDivePage />} />
        <Route path="unlimited" element={<UnlimitedPage />} />
        <Route path="archive/daily/:date" element={<ArchivedDailyPracticePage />} />
        <Route path="archive/game/:runId" element={<GameRecordPage />} />
        <Route path="archive" element={<ArchivePage />} />
        <Route path="stats" element={<StatisticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
