import { useNavigate } from 'react-router-dom'
import '../App.css'

function Menu() {
  const navigate = useNavigate()

  const games = [
    { id: 'block', title: 'ブロック崩し', color: '#00d2ff' },
    { id: 'infinity', title: 'INFINITY', color: '#fd79a8' },
  ]

  return (
    <div className="menu-container">
      <h1 className="menu-title">BALL</h1>
      <div className="menu-grid">
        {games.map((game) => (
          <div 
            key={game.id} 
            className="menu-card" 
            style={{ '--hover-color': game.color } as any}
            onClick={() => navigate(`/${game.id}`)}
          >
            <h2 className="game-title">{game.title}</h2>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Menu
