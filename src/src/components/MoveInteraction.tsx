import { useEffect, useRef } from 'react'
import Matter from 'matter-js'
import '../App.css'

function MoveInteraction() {
  const sceneRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.title = 'MOVE'
    if (!sceneRef.current) return

    const width = window.innerWidth
    const height = window.innerHeight

    const engine = Matter.Engine.create()
    const world = engine.world
    engine.gravity.y = 1.0 
    engine.enableSleeping = false // 全ての図形を常に動かし、リアルタイムな連動を保つ

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

    // 四方の壁 (標準的な物理)
    const wallOptions = { 
      isStatic: true, 
      render: { fillStyle: '#1e293b' },
      restitution: 0.5,
      friction: 0.1
    }
    const thickness = 100
    const walls = [
      Matter.Bodies.rectangle(width / 2, height + thickness / 2, width, thickness, wallOptions),
      Matter.Bodies.rectangle(width / 2, -thickness / 2, width, thickness, wallOptions),
      Matter.Bodies.rectangle(-thickness / 2, height / 2, thickness, height, wallOptions),
      Matter.Bodies.rectangle(width + thickness / 2, height / 2, thickness, height, wallOptions)
    ]
    Matter.Composite.add(world, walls)

    // 多彩な形状を初期配置
    const shapes: Matter.Body[] = []
    const COLORS = ['#00d2ff', '#3a47d5', '#fd79a8', '#ff7675', '#55efc4', '#ffeaa7', '#a29bfe']
    
    const shapeCount = Math.floor((width * height) / 6000) 
    
    for (let i = 0; i < shapeCount; i++) {
      const x = Math.random() * width
      const y = Math.random() * height
      const color = COLORS[Math.floor(Math.random() * COLORS.length)]
      
      const commonOptions = {
        restitution: 0.4, // 標準的な反発
        friction: 0.1,  // 標準的な摩擦
        frictionAir: 0.01, // 自然な空気抵抗
        mass: 1 + Math.random() * 2, // 自然な重さ
        render: { 
          fillStyle: color, 
          opacity: 0.9
        }
      }

      let body: Matter.Body
      const type = Math.floor(Math.random() * 5)

      switch (type) {
        case 0: // 円
          body = Matter.Bodies.circle(x, y, 15 + Math.random() * 25, commonOptions)
          break
        case 1: // 長方形 / 正方形
          body = Matter.Bodies.rectangle(x, y, 30 + Math.random() * 40, 30 + Math.random() * 40, commonOptions)
          break
        case 2: // 多角形 (3〜8角形)
          const sides = 3 + Math.floor(Math.random() * 6)
          body = Matter.Bodies.polygon(x, y, sides, 20 + Math.random() * 25, commonOptions)
          break
        case 3: // 台形
          body = Matter.Bodies.trapezoid(x, y, 40 + Math.random() * 40, 30 + Math.random() * 30, 0.5 + Math.random() * 0.5, commonOptions)
          break
        default: // 細長い棒状
          body = Matter.Bodies.rectangle(x, y, 60 + Math.random() * 40, 15, commonOptions)
          break
      }
      
      Matter.Body.setAngle(body, Math.random() * Math.PI)
      shapes.push(body)
    }
    Matter.Composite.add(world, shapes)

    let lastPop = 0

    // カオス・ポップ制御ルーチン (1秒に1回、10%の図形を吹き飛ばす)
    Matter.Events.on(engine, 'beforeUpdate', (event: any) => {
      const currentTime = event.timestamp
      
      if (currentTime - lastPop > 1000) {
        const bodies = Matter.Composite.allBodies(world)
        
        bodies.forEach(body => {
          if (body.isStatic) return
          
          // 約10%の確率で吹き飛ばす
          if (Math.random() < 0.1) {
            const angle = Math.random() * Math.PI * 2
            const magnitude = 0.4 * body.mass // 少しパワーも微調整
            
            Matter.Body.applyForce(body, body.position, {
              x: Math.cos(angle) * magnitude,
              y: Math.sin(angle) * magnitude
            })
            
            Matter.Body.setAngularVelocity(body, (Math.random() - 0.5) * 0.2)
          }
        })
        
        lastPop = currentTime
      }
      
      // 全ての物体の速度制限 (吹き飛び防止のセーフティ)
      const bodies = Matter.Composite.allBodies(world)
      bodies.forEach(body => {
        if (body.isStatic) return
        const maxV = 25
        const speed = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2)
        if (speed > maxV) {
          Matter.Body.setVelocity(body, {
            x: (body.velocity.x / speed) * maxV,
            y: (body.velocity.y / speed) * maxV
          })
        }
      })
    })

    // マウス操作の追加
    const mouse = Matter.Mouse.create(render.canvas)
    const mouseConstraint = Matter.MouseConstraint.create(engine, {
      mouse: mouse,
      constraint: {
        stiffness: 0.2,
        render: { visible: false }
      }
    })
    Matter.Composite.add(world, mouseConstraint)

    // スクロール干渉防止
    render.canvas.style.touchAction = 'none'

    const runner = Matter.Runner.run(Matter.Runner.create(), engine)
    Matter.Render.run(render)

    return () => {
      document.title = 'BALL'
      Matter.Render.stop(render)
      Matter.Runner.stop(runner)
      Matter.Engine.clear(engine)
      render.canvas.remove()
      render.textures = {}
    }
  }, [])

  return (
    <div className="canvas-container">
      <div ref={sceneRef} />
      <div className="game-overlay">
        <div style={{ color: 'white', opacity: 0.5, pointerEvents: 'none', userSelect: 'none' }}>
          DRAG & TOSS
        </div>
      </div>
    </div>
  )
}

export default MoveInteraction
