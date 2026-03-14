import { useEffect, useRef } from 'react'
import Matter from 'matter-js'
import './App.css'

function App() {
  const sceneRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sceneRef.current) return

    const engine = Matter.Engine.create()
    const world = engine.world

    const render = Matter.Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: window.innerWidth,
        height: window.innerHeight,
        wireframes: false, 
        background: '#a29bfe', 
      },
    })

    const bounceProps = {
      restitution: 1, 
      friction: 0,
      frictionAir: 0,
      render: { fillStyle: '#6c5ce7' } 
    }

    const candyColors = ['#ff7675', '#74b9ff', '#55efc4', '#ffeaa7', '#fd79a8', '#e17055', '#fdcb6e']

    const wallThickness = 50
    const walls = [
      Matter.Bodies.rectangle(window.innerWidth / 2, window.innerHeight, window.innerWidth, wallThickness, { isStatic: true, ...bounceProps }),
      Matter.Bodies.rectangle(window.innerWidth / 2, 0, window.innerWidth, wallThickness, { isStatic: true, ...bounceProps }),
      Matter.Bodies.rectangle(0, window.innerHeight / 2, wallThickness, window.innerHeight, { isStatic: true, ...bounceProps }),
      Matter.Bodies.rectangle(window.innerWidth, window.innerHeight / 2, wallThickness, window.innerHeight, { isStatic: true, ...bounceProps })
    ]

    const ball = Matter.Bodies.circle(window.innerWidth / 2, window.innerHeight - 150, 25, {
      label: 'ball',
      restitution: 1, 
      friction: 0, 
      frictionAir: 0.02, 
      inertia: Infinity,
      render: { fillStyle: '#ffeaa7' } 
    })
    Matter.Body.setVelocity(ball, { x: 0, y: -20 })

    const paddleWidth = 150
    const paddleHeight = 20
    const paddle = Matter.Bodies.rectangle(window.innerWidth / 2, window.innerHeight - 80, paddleWidth, paddleHeight, { 
      label: 'paddle', 
      isStatic: true, 
      restitution: 1.3,
      render: { fillStyle: '#fdcb6e' } 
    })

    const rows = 6
    const cols = 20
    const blockPadding = 3
    const blockWidth = (window.innerWidth - blockPadding * (cols + 1)) / cols
    const blockHeight = 15
    const blocks: Matter.Body[] = []

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = blockPadding + blockWidth / 2 + c * (blockWidth + blockPadding)
        const y = 60 + r * (blockHeight + blockPadding)
        const block = Matter.Bodies.rectangle(x, y, blockWidth, blockHeight, {
          label: 'block',
          isStatic: true,
          render: { fillStyle: candyColors[(r + c) % candyColors.length] }
        })
        blocks.push(block)
      }
    }

    let ballsArr: Matter.Body[] = [ball]
    const MAX_BALLS = 50

    Matter.Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair
        
        // パドル衝突
        const isPaddleCollision = (bodyA.label === 'paddle' && bodyB.label === 'ball') || (bodyA.label === 'ball' && bodyB.label === 'paddle')
        if (isPaddleCollision) {
          const ballBody = bodyA.label === 'ball' ? bodyA : bodyB
          const paddleBody = bodyA.label === 'paddle' ? bodyA : bodyB
          
          // パドルの中心からの距離を計算 (-1.0 〜 1.0)
          const deltaX = ballBody.position.x - paddleBody.position.x
          const normalizedDeltaX = deltaX / (paddleWidth / 2)
          
          // 当たった位置に応じて横方向の速度を決定 (端ほど鋭い角度に)
          const bounceAngle = normalizedDeltaX * 15 // 最大15の横移動速度を付与
          
          Matter.Body.setVelocity(ballBody, { 
            x: bounceAngle, 
            y: -30 // 常に強烈な上方向へのブースト
          })
        }

        // ブロック衝突
        const isBlockCollision = (bodyA.label === 'block' && bodyB.label === 'ball') || (bodyA.label === 'ball' && bodyB.label === 'block')
        if (isBlockCollision) {
          const blockBody = bodyA.label === 'block' ? bodyA : bodyB
          const ballBody = bodyA.label === 'ball' ? bodyA : bodyB
          
          // ボールがゴースト状態（無敵）ならブロックを壊さない
          if ((ballBody as any).isGhost) return

          const spawnX = blockBody.position.x
          const spawnY = blockBody.position.y
          
          // 1. ブロックは即座に消去
          Matter.Composite.remove(world, blockBody)

          // 2. 新しいボールを即座に分裂生成
          const newBall = Matter.Bodies.circle(spawnX, spawnY, 20, {
            label: 'ball',
            restitution: 1,
            friction: 0,
            frictionAir: 0.02,
            inertia: Infinity,
            render: { fillStyle: candyColors[Math.floor(Math.random() * candyColors.length)], opacity: 0.5 }
          });
          
          (newBall as any).isGhost = true

          Matter.Body.setVelocity(newBall, { 
            x: (Math.random() - 0.5) * 20, 
            y: (Math.random() - 0.5) * 10 + 5 
          })

          // 0.2秒後に実体化
          setTimeout(() => {
            (newBall as any).isGhost = false
            newBall.render.opacity = 1.0
          }, 200)

          if (ballsArr.length >= MAX_BALLS) {
            const oldestBall = ballsArr.shift()
            if (oldestBall) Matter.Composite.remove(world, oldestBall)
          }
          ballsArr.push(newBall)
          Matter.Composite.add(world, newBall)
        }
      })
    })

    const handleMouseMove = (event: MouseEvent) => {
      const { clientX } = event
      const x = Math.max(paddleWidth / 2, Math.min(window.innerWidth - paddleWidth / 2, clientX))
      Matter.Body.setPosition(paddle, { x, y: paddle.position.y })
    }

    Matter.Composite.add(world, [...walls, ball, paddle, ...blocks])

    window.addEventListener('mousemove', handleMouseMove)

    const runner = Matter.Runner.create()
    Matter.Runner.run(runner, engine)
    Matter.Render.run(render)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      Matter.Render.stop(render)
      Matter.Runner.stop(runner)
      Matter.Engine.clear(engine)
      render.canvas.remove()
      render.textures = {}
    }
  }, [])

  return <div ref={sceneRef} className="canvas-container" />
}

export default App
