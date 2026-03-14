import { useEffect, useRef } from 'react'
import Matter from 'matter-js'
import '../App.css'

function BeadsCascade() {
  const sceneRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sceneRef.current) return

    const width = window.innerWidth
    const height = window.innerHeight

    const engine = Matter.Engine.create()
    const world = engine.world
    engine.gravity.y = 1.5 // 重力を大幅に強化してスピードアップ

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

    // 外枠（容器）
    const wallProps = { isStatic: true, render: { fillStyle: 'rgba(255, 255, 255, 0.1)' } }
    const containerWidth = 400
    const walls = [
      Matter.Bodies.rectangle(width / 2, height - 20, containerWidth, 40, wallProps), 
      Matter.Bodies.rectangle(width / 2 - containerWidth / 2, height / 2, 40, height - 40, wallProps), 
      Matter.Bodies.rectangle(width / 2 + containerWidth / 2, height / 2, 40, height - 40, wallProps), 
      Matter.Bodies.rectangle(width / 2, 20, containerWidth, 40, wallProps), 
    ]

    // ジグザグの足場 - 短くして詰まりを防止
    const slopes: Matter.Body[] = []
    const rowCount = 6
    const slopeWidth = 220 
    for (let i = 0; i < rowCount; i++) {
      const isLeft = i % 2 === 0
      const x = isLeft ? width / 2 - 80 : width / 2 + 80
      const y = 150 + i * ((height - 250) / rowCount)
      const angle = isLeft ? Math.PI / 6 : -Math.PI / 6
      
      slopes.push(Matter.Bodies.rectangle(x, y, slopeWidth, 15, {
        isStatic: true,
        angle: angle,
        restitution: 0.5, // 坂でも跳ねるように
        friction: 0, 
        frictionStatic: 0,
        render: { fillStyle: 'rgba(255, 255, 255, 0.1)' }
      }))
    }

    Matter.Composite.add(world, [...walls, ...slopes])

    // ビーズ（ボール）管理 - 削除なしで蓄積
    const spawnBead = () => {
      const bead = Matter.Bodies.circle(width / 2, 60, 8, { 
        restitution: 0.8, // ビーズ同士で激しく弾ける
        friction: 0, 
        frictionStatic: 0,
        frictionAir: 0.001, 
        slop: 0.5, 
        render: { 
          fillStyle: '#00d2ff',
          opacity: 0.6 
        }
      })
      
      Matter.Composite.add(world, bead)
    }

    const beadInterval = setInterval(spawnBead, 500)

    const runner = Matter.Runner.run(Matter.Runner.create(), engine)
    Matter.Render.run(render)

    return () => {
      clearInterval(beadInterval)
      Matter.Render.stop(render)
      Matter.Runner.stop(runner)
      Matter.Engine.clear(engine)
      render.canvas.remove()
      render.textures = {}
    }
  }, [])

  return <div ref={sceneRef} className="canvas-container" />
}

export default BeadsCascade
