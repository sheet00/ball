import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Menu from './components/Menu'
import BreakoutGame from './components/BreakoutGame'
import InfinityRenderer from './components/InfinityRenderer'
import BeadsCascade from './components/BeadsCascade'
import StairsPhysics from './components/StairsPhysics'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Menu />} />
        <Route path="/block" element={<BreakoutGame />} />
        <Route path="/infinity" element={<InfinityRenderer />} />
        <Route path="/beads" element={<BeadsCascade />} />
        <Route path="/stairs" element={<StairsPhysics />} />
      </Routes>
    </Router>
  )
}

export default App
