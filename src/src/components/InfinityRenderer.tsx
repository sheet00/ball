import { useEffect, useRef } from 'react'
import Matter from 'matter-js'
import '../App.css'

const SETTINGS = {
  BALL_RADIUS: 180,
  MAX_BALLS: 1000,
  COLORS: ['#00d2ff', '#3a47d5', '#fd79a8', '#ff7675', '#55efc4', '#ffeaa7'],
  WALL_COLOR: 'rgba(255, 255, 255, 0.1)',
}

function InfinityRenderer() {
  const sceneRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<Matter.Engine | null>(null)
  const ballsArrRef = useRef<Matter.Body[]>([])

  const createBall = (world: Matter.World, x: number, y: number, radius: number, isGhost = false, expires = false) => {
    const color = SETTINGS.COLORS[Math.floor(Math.random() * SETTINGS.COLORS.length)]
    const ball = Matter.Bodies.circle(x, y, radius, {
      label: 'ball',
      restitution: 1.0,
      friction: 0,
      frictionAir: 0,
      inertia: Infinity,
      render: { 
        fillStyle: color,
        strokeStyle: '#ffffff',
        lineWidth: 1,
        opacity: isGhost ? 0.6 : 1.0
      }
    });
    
    if (isGhost) {
      (ball as any).isGhost = true
      setTimeout(() => { 
        (ball as any).isGhost = false; 
        ball.render.opacity = 1.0 
      }, 200)
    }

    if (expires) {
      // 2秒後に消去するタイマー
      setTimeout(() => {
        ball.render.opacity = 0.3
        setTimeout(() => {
          Matter.Composite.remove(world, ball)
          ballsArrRef.current = ballsArrRef.current.filter(b => b !== ball)
        }, 500)
      }, 1500)
    }
    
    const angle = Math.random() * Math.PI * 2
    const speed = 3 + Math.random() * 5
    Matter.Body.setVelocity(ball, {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed
    })
    
    return ball
  }

  const handleReset = () => {
    if (!engineRef.current) return
    const world = engineRef.current.world
    const allBalls = Matter.Composite.allBodies(world).filter(b => b.label === 'ball')
    Matter.Composite.remove(world, allBalls)
    ballsArrRef.current = []
    const firstBall = createBall(world, window.innerWidth / 2, window.innerHeight / 2, SETTINGS.BALL_RADIUS)
    ballsArrRef.current.push(firstBall)
    Matter.Composite.add(world, firstBall)
  }

  useEffect(() => {
    if (!sceneRef.current) return

    const width = sceneRef.current.clientWidth || window.innerWidth
    const height = sceneRef.current.clientHeight || window.innerHeight

    const engine = Matter.Engine.create()
    engineRef.current = engine
    const world = engine.world
    engine.gravity.y = 0 

    const render = Matter.Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: width,
        height: height,
        wireframes: false,
        background: '#020617',
      },
    })

    const wallOptions = { isStatic: true, restitution: 1.0, friction: 0, render: { fillStyle: SETTINGS.WALL_COLOR } }
    const walls = [
      Matter.Bodies.rectangle(width / 2, 0, width, 40, wallOptions), 
      Matter.Bodies.rectangle(width / 2, height, width, 40, wallOptions), 
      Matter.Bodies.rectangle(0, height / 2, 40, height, wallOptions), 
      Matter.Bodies.rectangle(width, height / 2, 40, height, wallOptions), 
    ]
    Matter.Composite.add(world, walls)

    const firstBall = createBall(world, width / 2, height / 2, SETTINGS.BALL_RADIUS)
    ballsArrRef.current.push(firstBall)
    Matter.Composite.add(world, firstBall)

    Matter.Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair
        if (bodyA.label === 'ball' && bodyB.label === 'ball') {
          const ballA = bodyA as any
          const ballB = bodyB as any
          if (ballA.isGhost || ballB.isGhost) return

          const radius = (ballA.circleRadius + ballB.circleRadius) / 4 
          // 最小サイズ(2px)チェック
          if (radius < 2) return

          const spawnX = (ballA.position.x + ballB.position.x) / 2
          const spawnY = (ballA.position.y + ballB.position.y) / 2

          Matter.Composite.remove(world, [ballA, ballB])
          ballsArrRef.current = ballsArrRef.current.filter(b => b !== ballA && b !== ballB)

          for (let i = 0; i < 4; i++) {
            // 次の分裂で2pxを切るなら、これが最終形態。2秒後に消す。
            const willBeTooSmall = (radius / 2) < 2
            const newBall = createBall(world, spawnX, spawnY, radius, true, willBeTooSmall)
            if (ballsArrRef.current.length < SETTINGS.MAX_BALLS) {
              ballsArrRef.current.push(newBall)
              Matter.Composite.add(world, newBall)
            }
          }
        }
      })
    })

    const handleMouseDown = (event: MouseEvent) => {
      const newBall = createBall(world, event.clientX, event.clientY, SETTINGS.BALL_RADIUS)
      if (ballsArrRef.current.length >= SETTINGS.MAX_BALLS) {
        const oldest = ballsArrRef.current.shift()
        if (oldest) Matter.Composite.remove(world, oldest)
      }
      ballsArrRef.current.push(newBall)
      Matter.Composite.add(world, newBall)
    }

    const canvas = render.canvas
    canvas.addEventListener('mousedown', handleMouseDown)

    const runner = Matter.Runner.create()
    Matter.Runner.run(runner, engine)
    Matter.Render.run(render)

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown)
      Matter.Render.stop(render)
      Matter.Runner.stop(runner)
      Matter.Engine.clear(engine)
      render.canvas.remove()
      render.textures = {}
    }
  }, [])

  return (
    <div ref={sceneRef} className="canvas-container" style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <button 
        onClick={handleReset}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          padding: '10px 24px',
          background: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          color: 'white',
          borderRadius: '2px',
          cursor: 'pointer',
          fontFamily: 'monospace',
          fontSize: '14px',
          letterSpacing: '2px',
          zIndex: 100,
          transition: 'all 0.3s'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
          e.currentTarget.style.borderColor = '#00d2ff'
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
        }}
      >
        RESET
      </button>
    </div>
  )
}

export default InfinityRenderer
