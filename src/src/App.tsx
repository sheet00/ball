import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Menu from './components/Menu'
import BreakoutGame from './components/BreakoutGame'
import './App.css'

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Menu />} />
        <Route path="/block" element={<BreakoutGame />} />
      </Routes>
    </Router>
  )
}

export default App
