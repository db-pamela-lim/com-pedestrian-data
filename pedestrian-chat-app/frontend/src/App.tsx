import { useState } from 'react'
import { ChatInterface } from './components/ChatInterface'
import { Dashboard } from './components/Dashboard'
import './App.css'

type TabId = 'chat' | 'dashboard'

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('chat')

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-inner">
          <h1>Pedestrian Data</h1>
          <p className="tagline">City of Melbourne Communications</p>
          <nav className="app-tabs" aria-label="Main navigation">
            <button
              type="button"
              className={`app-tab ${activeTab === 'chat' ? 'app-tab--active' : ''}`}
              onClick={() => setActiveTab('chat')}
              aria-selected={activeTab === 'chat'}
            >
              Chat
            </button>
            <button
              type="button"
              className={`app-tab ${activeTab === 'dashboard' ? 'app-tab--active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
              aria-selected={activeTab === 'dashboard'}
            >
              Dashboard
            </button>
          </nav>
        </div>
      </header>
      <main className="app-main">
        {activeTab === 'chat' && <ChatInterface />}
        {activeTab === 'dashboard' && <Dashboard />}
      </main>
    </div>
  )
}

export default App
