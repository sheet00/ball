import { useEffect, useRef } from 'react'
import Matter from 'matter-js'
import '../App.css'

function StairsPhysics() {
  const sceneRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.title = 'STAIRS'
    if (!sceneRef.current) return

    const width = window.innerWidth
    const height = window.innerHeight

    const engine = Matter.Engine.create()
    const world = engine.world
    engine.gravity.y = 1.2 // 重力を少し強めて加速を促す

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

    // --- なだらかな階段の再設計 ---
    const stairs: Matter.Body[] = []
    const stepWidth = 120 // 広く
    const stepHeight = 35 // 低く
    const stepCount = 12
    const startX = 50
    const startY = 150

    for (let i = 0; i < stepCount; i++) {
      const x = startX + i * stepWidth
      const y = startY + i * stepHeight
      
      const step = Matter.Bodies.rectangle(x, y, stepWidth, stepHeight, {
        isStatic: true,
        friction: 0,
        frictionStatic: 0,
        restitution: 0.7,
        render: { 
          fillStyle: '#1e293b',
          strokeStyle: '#ffffff',
          lineWidth: 1
        }
      })
      stairs.push(step)
    }

    const COLORS = ['#00d2ff', '#3a47d5', '#fd79a8', '#ff7675', '#55efc4', '#ffeaa7']
    // ボール生成関数 (転がりやすさを追求)
    const spawnBall = () => {
      const color = COLORS[Math.floor(Math.random() * COLORS.length)]
      const radius = 10 + Math.random() * 25

      // 反発係数を 0.6 〜 0.9 の元気な範囲に設定
      const randomRestitution = 0.6 + Math.random() * 0.3
      const randomAirFriction = Math.random() * 0.005

      const ball = Matter.Bodies.circle(startX - 20, startY - 45, radius, {
        restitution: randomRestitution,
        friction: 0,
        frictionStatic: 0,
        frictionAir: randomAirFriction, 
        render: { 
          fillStyle: color,
          opacity: 1.0 
        }
      })

      const randomVX = 3 + Math.random() * 7
      Matter.Body.setVelocity(ball, { x: randomVX, y: 0 })
      // 初動の回転を少し強めて転がりやすくする
      Matter.Body.setAngularVelocity(ball, 0.1 + Math.random() * 0.2)

      Matter.Composite.add(world, ball)
    }

    const interval = setInterval(spawnBall, 300) // 300ms ごとに投下 (頻度を半分に)

    Matter.Events.on(engine, 'beforeUpdate', () => {
      const bodies = Matter.Composite.allBodies(world)
      bodies.forEach(body => {
        if (!body.isStatic && (body.position.y > height + 100 || body.position.x > width + 100)) {
          Matter.Composite.remove(world, body)
        }
      })
    })

    Matter.Composite.add(world, stairs)

    const runner = Matter.Runner.run(Matter.Runner.create(), engine)
    Matter.Render.run(render)

    return () => {
      document.title = 'BALL'
      clearInterval(interval)
      Matter.Render.stop(render)
      Matter.Runner.stop(runner)
      Matter.Engine.clear(engine)
      render.canvas.remove()
      render.textures = {}
    }
  }, [])

  return <div ref={sceneRef} className="canvas-container" />
}

export default StairsPhysics
