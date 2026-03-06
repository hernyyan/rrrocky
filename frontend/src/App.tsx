import { WizardProvider } from './hooks/useWizardState'
import WizardShell from './components/wizard/WizardShell'
import Header from './components/layout/Header'

function App() {
  return (
    <WizardProvider>
      <div className="h-screen flex flex-col bg-white overflow-hidden">
        <Header />
        <main className="flex-1 flex flex-col overflow-hidden">
          <WizardShell />
        </main>
      </div>
    </WizardProvider>
  )
}

export default App
