import { useEffect, useRef, useState } from 'react'
import Matter from 'matter-js'
import '../App.css'

const SETTINGS = {
  INITIAL_COUNT: 10,
  INITIAL_RADIUS: 25,
  MAX_BALLS: 500,
  COLORS: ['#00d2ff', '#3a47d5', '#fd79a8', '#ff7675', '#55efc4', '#ffeaa7'],
}

function InfinityRenderer() {
  const sceneRef = useRef<HTMLDivElement>(null)
  const [phase, setPhase] = useState<'EXPAND' | 'SHRINK'>('EXPAND')

  useEffect(() => {
    if (!sceneRef.current) return

    const width = window.innerWidth
    const height = window.innerHeight

    const engine = Matter.Engine.create({ gravity: { x: 0, y: 0 } })
    const world = engine.world

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

    let ballsArr: Matter.Body[] = []
    let currentPhaseInternal: 'EXPAND' | 'SHRINK' = 'EXPAND'

    // --- 演出用パーティクル生成関数 ---
    const spawnParticles = (x: number, y: number, color: string, isImplosion = false) => {
      const count = 10
      for (let i = 0; i < count; i++) {
        const particle = Matter.Bodies.rectangle(x, y, 3, 3, {
          label: 'particle',
          collisionFilter: { group: -1 },
          frictionAir: 0.05,
          render: { fillStyle: color, opacity: 0.8 }
        })
        
        const velocity = isImplosion ? 
          { x: (Math.random() - 0.5) * 5, y: (Math.random() - 0.5) * 5 } : // ゆっくり漂う
          { x: (Math.random() - 0.5) * 15, y: (Math.random() - 0.5) * 15 } // 勢いよく散る
        
        Matter.Body.setVelocity(particle, velocity)
        Matter.Composite.add(world, particle)
        
        setTimeout(() => {
          Matter.Composite.remove(world, particle)
        }, 800)
      }
    }

    const createBall = (x: number, y: number, radius: number, isGhost = false) => {
      const color = SETTINGS.COLORS[Math.floor(Math.random() * SETTINGS.COLORS.length)]
      const ball = Matter.Bodies.circle(x, y, radius, {
        label: 'ball',
        restitution: 1,
        friction: 0,
        frictionAir: 0,
        inertia: Infinity,
        render: { fillStyle: color, opacity: isGhost ? 0.6 : 1.0 }
      });
      if (isGhost) {
        (ball as any).isGhost = true
        setTimeout(() => { (ball as any).isGhost = false; if (ball.render) ball.render.opacity = 1.0 }, 200)
      }
      const angle = Math.random() * Math.PI * 2
      const speed = 3 + Math.random() * 3
      Matter.Body.setVelocity(ball, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed })
      return ball
    }

    for (let i = 0; i < SETTINGS.INITIAL_COUNT; i++) {
      const b = createBall(Math.random() * width, Math.random() * height, SETTINGS.INITIAL_RADIUS)
      ballsArr.push(b)
      Matter.Composite.add(world, b)
    }

    Matter.Events.on(engine, 'beforeUpdate', () => {
      const count = ballsArr.length
      if (count > 200 && currentPhaseInternal === 'EXPAND') { // 100から200に
        currentPhaseInternal = 'SHRINK'
        setPhase('SHRINK')
      } else if (count < 40 && currentPhaseInternal === 'SHRINK') { // 20から40に
        currentPhaseInternal = 'EXPAND'
        setPhase('EXPAND')
      }
    })

    Matter.Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair
        if (bodyA.label === 'ball' && bodyB.label === 'ball') {
          const bA = bodyA as any
          const bB = bodyB as any
          if (bA.isGhost || bB.isGhost) return

          const spawnX = (bA.position.x + bB.position.x) / 2
          const spawnY = (bA.position.y + bB.position.y) / 2
          const baseColor = bA.render.fillStyle as string

          Matter.Composite.remove(world, [bA, bB])
          ballsArr = ballsArr.filter(b => b !== bA && b !== bB)

          if (currentPhaseInternal === 'EXPAND') {
            // 分裂演出: 激しく火花を散らす
            spawnParticles(spawnX, spawnY, baseColor, false)
            for (let i = 0; i < 3; i++) {
              const nb = createBall(spawnX, spawnY, SETTINGS.INITIAL_RADIUS, true)
              if (ballsArr.length < SETTINGS.MAX_BALLS) {
                ballsArr.push(nb)
                Matter.Composite.add(world, nb)
              }
            }
          } else {
            // 融合演出: 光が集まるように漂う
            spawnParticles(spawnX, spawnY, '#ffffff', true)
            const nb = createBall(spawnX, spawnY, SETTINGS.INITIAL_RADIUS, true)
            nb.render.fillStyle = '#ffffff' // 合体直後は純白に
            setTimeout(() => { 
              if(nb.render) nb.render.fillStyle = baseColor 
            }, 500)
            ballsArr.push(nb)
            Matter.Composite.add(world, nb)
          }
        }
      })
    })

    const wallOptions = { isStatic: true, restitution: 1, render: { visible: false } }
    Matter.Composite.add(world, [
      Matter.Bodies.rectangle(width / 2, -50, width, 100, wallOptions),
      Matter.Bodies.rectangle(width / 2, height + 50, width, 100, wallOptions),
      Matter.Bodies.rectangle(-50, height / 2, 100, height, wallOptions),
      Matter.Bodies.rectangle(width + 50, height / 2, 100, height, wallOptions),
    ])

    const runner = Matter.Runner.run(Matter.Runner.create(), engine)
    Matter.Render.run(render)

    return () => {
      Matter.Render.stop(render)
      Matter.Runner.stop(runner)
      Matter.Engine.clear(engine)
      render.canvas.remove()
    }
  }, [])

  return (
    <div ref={sceneRef} className="canvas-container" style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        color: 'white',
        fontFamily: 'monospace',
        fontSize: '12px',
        letterSpacing: '4px',
        opacity: 0.4,
        pointerEvents: 'none'
      }}>
        UNIVERSE: {phase}
      </div>
    </div>
  )
}

export default InfinityRenderer
