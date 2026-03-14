import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Menu from './components/Menu'
import BreakoutGame from './components/BreakoutGame'
import InfinityRenderer from './components/InfinityRenderer'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Menu />} />
        <Route path="/block" element={<BreakoutGame />} />
        <Route path="/infinity" element={<InfinityRenderer />} />
      </Routes>
    </Router>
  )
}

export default App
