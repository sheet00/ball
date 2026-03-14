import { useEffect, useRef } from 'react'
import Matter from 'matter-js'
import './App.css'

// --- ゲーム設定の集約 ---
const SETTINGS = {
  BALL: {
    RADIUS: 20,
    INITIAL_RADIUS: 25,
    RESTITUTION: 1.0, 
    FRICTION: 0,
    FRICTION_AIR: 0.001, 
    MAX_COUNT: 50,
    GHOST_DURATION: 200,
  },
  PADDLE: {
    WIDTH: 225,
    HEIGHT: 20,
    RESTITUTION: 1.3,
    BOOST_Y: -30,
    BOOST_X_MULTI: 2.0,
  },
  BLOCK: {
    ROWS: 6,
    COLS: 20,
    PADDING: 3,
    HEIGHT: 15,
  },
  COLORS: ['#ff7675', '#74b9ff', '#55efc4', '#ffeaa7', '#fd79a8', '#e17055', '#fdcb6e'],
  WALL: {
    THICKNESS: 50,
    COLOR: '#6c5ce7',
  }
}

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

    // --- 共通オブジェクト作成関数 ---
    const createBall = (x: number, y: number, radius: number, isGhost = false) => {
      const color = SETTINGS.COLORS[Math.floor(Math.random() * SETTINGS.COLORS.length)]
      const ball = Matter.Bodies.circle(x, y, radius, {
        label: 'ball',
        restitution: SETTINGS.BALL.RESTITUTION,
        friction: SETTINGS.BALL.FRICTION,
        frictionAir: SETTINGS.BALL.FRICTION_AIR,
        inertia: Infinity,
        render: { 
          fillStyle: color,
          opacity: isGhost ? 0.5 : 1.0 
        }
      });
      
      if (isGhost) {
        (ball as any).isGhost = true
        setTimeout(() => {
          (ball as any).isGhost = false
          ball.render.opacity = 1.0
        }, SETTINGS.BALL.GHOST_DURATION)
      }
      
      return ball
    }

    let ballsArr: Matter.Body[] = []
    let isResetting = false

    // ステージ（ブロックとボール）をリセットする関数
    const resetStage = () => {
      // 1. 既存のボールをすべて削除
      const currentBalls = Matter.Composite.allBodies(world).filter(b => b.label === 'ball')
      Matter.Composite.remove(world, currentBalls)
      ballsArr = []

      // 2. 新しいボールを1つだけ生成
      const newBall = createBall(window.innerWidth / 2, window.innerHeight - 150, SETTINGS.BALL.INITIAL_RADIUS)
      Matter.Body.setVelocity(newBall, { x: 0, y: -20 })
      ballsArr.push(newBall)
      Matter.Composite.add(world, newBall)

      // 3. ブロックを再生成 (外壁の内側に収める)
      const newBlocks: Matter.Body[] = []
      const effectiveWidth = window.innerWidth - SETTINGS.WALL.THICKNESS * 2
      const blockWidth = (effectiveWidth - SETTINGS.BLOCK.PADDING * (SETTINGS.BLOCK.COLS + 1)) / SETTINGS.BLOCK.COLS
      
      for (let r = 0; r < SETTINGS.BLOCK.ROWS; r++) {
        for (let c = 0; c < SETTINGS.BLOCK.COLS; c++) {
          const x = SETTINGS.WALL.THICKNESS + SETTINGS.BLOCK.PADDING + blockWidth / 2 + c * (blockWidth + SETTINGS.BLOCK.PADDING)
          const y = SETTINGS.WALL.THICKNESS + 20 + r * (SETTINGS.BLOCK.HEIGHT + SETTINGS.BLOCK.PADDING)
          const block = Matter.Bodies.rectangle(x, y, blockWidth, SETTINGS.BLOCK.HEIGHT, {
            label: 'block',
            isStatic: true,
            render: { fillStyle: SETTINGS.COLORS[(r + c) % SETTINGS.COLORS.length] }
          })
          newBlocks.push(block)
        }
      }
      Matter.Composite.add(world, newBlocks)
      
      isResetting = false
    }

    // 外壁
    const walls = [
      Matter.Bodies.rectangle(window.innerWidth / 2, window.innerHeight, window.innerWidth, SETTINGS.WALL.THICKNESS, { isStatic: true, restitution: 1, friction: 0, render: { fillStyle: SETTINGS.WALL.COLOR } }),
      Matter.Bodies.rectangle(window.innerWidth / 2, 0, window.innerWidth, SETTINGS.WALL.THICKNESS, { isStatic: true, restitution: 1, friction: 0, render: { fillStyle: SETTINGS.WALL.COLOR } }),
      Matter.Bodies.rectangle(0, window.innerHeight / 2, SETTINGS.WALL.THICKNESS, window.innerHeight, { isStatic: true, restitution: 1, friction: 0, render: { fillStyle: SETTINGS.WALL.COLOR } }),
      Matter.Bodies.rectangle(window.innerWidth, window.innerHeight / 2, SETTINGS.WALL.THICKNESS, window.innerHeight, { isStatic: true, restitution: 1, friction: 0, render: { fillStyle: SETTINGS.WALL.COLOR } })
    ]

    // パドル
    const paddle = Matter.Bodies.rectangle(window.innerWidth / 2, window.innerHeight - 80, SETTINGS.PADDLE.WIDTH, SETTINGS.PADDLE.HEIGHT, { 
      label: 'paddle', 
      isStatic: true, 
      restitution: SETTINGS.PADDLE.RESTITUTION,
      render: { fillStyle: '#fdcb6e' } 
    })

    Matter.Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair
        
        // パドル衝突
        const isPaddleCollision = (bodyA.label === 'paddle' && bodyB.label === 'ball') || (bodyA.label === 'ball' && bodyB.label === 'paddle')
        if (isPaddleCollision) {
          const ballBody = bodyA.label === 'ball' ? bodyA : bodyB
          const paddleBody = bodyA.label === 'paddle' ? bodyA : bodyB
          const deltaX = ballBody.position.x - paddleBody.position.x
          const normalizedDeltaX = deltaX / (SETTINGS.PADDLE.WIDTH / 2)
          Matter.Body.setVelocity(ballBody, { 
            x: normalizedDeltaX * 15, 
            y: SETTINGS.PADDLE.BOOST_Y 
          })
        }

        // ブロック衝突
        const isBlockCollision = (bodyA.label === 'block' && bodyB.label === 'ball') || (bodyA.label === 'ball' && bodyB.label === 'block')
        if (isBlockCollision) {
          const blockBody = bodyA.label === 'block' ? bodyA : bodyB
          const ballBody = bodyA.label === 'ball' ? bodyA : bodyB
          if ((ballBody as any).isGhost) return
          
          const spawnPos = { x: blockBody.position.x, y: blockBody.position.y }
          Matter.Composite.remove(world, blockBody)

          // クリア判定（ブロックが全て消えたか）
          const remainingBlocks = Matter.Composite.allBodies(world).filter(b => b.label === 'block')
          if (remainingBlocks.length === 0 && !isResetting) {
            isResetting = true
            setTimeout(resetStage, 1000) // 1秒後にボールも含めてリセット
          }

          // 分裂生成
          const newBall = createBall(spawnPos.x, spawnPos.y, SETTINGS.BALL.RADIUS, true)
          Matter.Body.setVelocity(newBall, { 
            x: (Math.random() - 0.5) * 20, 
            y: (Math.random() - 0.5) * 10 + 5 
          })

          if (ballsArr.length >= SETTINGS.BALL.MAX_COUNT) {
            const oldest = ballsArr.shift()
            if (oldest) Matter.Composite.remove(world, oldest)
          }
          ballsArr.push(newBall)
          Matter.Composite.add(world, newBall)
        }
      })
    })

    const handleMouseMove = (event: MouseEvent) => {
      const minX = SETTINGS.WALL.THICKNESS + SETTINGS.PADDLE.WIDTH / 2
      const maxX = window.innerWidth - SETTINGS.WALL.THICKNESS - SETTINGS.PADDLE.WIDTH / 2
      const x = Math.max(minX, Math.min(maxX, event.clientX))
      Matter.Body.setPosition(paddle, { x, y: paddle.position.y })
    }

    Matter.Composite.add(world, [...walls, paddle])
    resetStage() // 初期化時もresetStageを呼ぶことで一貫性を保つ

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
