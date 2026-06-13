import { SearchProvider, useSearch } from './context/SearchContext'
import SetupPage from './pages/SetupPage'
import OperationsPage from './pages/OperationsPage'

function AppRouter() {
  const { state } = useSearch()
  return state.phase === 'setup' ? <SetupPage /> : <OperationsPage />
}

export default function App() {
  return (
    <SearchProvider>
      <AppRouter />
    </SearchProvider>
  )
}
