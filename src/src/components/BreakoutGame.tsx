import { useEffect, useRef } from 'react'
import Matter from 'matter-js'
import '../App.css'

// --- ゲーム設定の集約 ---
const SETTINGS = {
  BALL: {
    RADIUS: 18,
    RESTITUTION: 1.1, // わずかに加速する設定
    FRICTION: 0,
    FRICTION_AIR: 0.005, 
    MAX_COUNT: 1000,
    MAX_SPEED: 25, 
    GHOST_DURATION: 200,
  },
  PADDLE: {
    RADIUS: 70,
    RESTITUTION: 1.0, // マレットも加速なしに合わせる
    BOOST_SPEED: 22,
  },
  BLOCK: {
    ROWS: 8,
    COLS: 25,
    PADDING: 2,
    HEIGHT: 12,
  },
  COLORS: ['#ff7675', '#74b9ff', '#ffeaa7'], 
  WALL: {
    THICKNESS: 50,
    COLOR: 'rgba(255, 255, 255, 0.1)',
  }
}

function BreakoutGame() {
  const sceneRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    document.title = 'BREAKOUT'
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
        background: '#020617', 
      },
    })

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
          opacity: isGhost ? 0.5 : 1.0,
          strokeStyle: '#ffffff',
          lineWidth: 1
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

    const spawnParticles = (x: number, y: number, color: string) => {
      const count = 8
      for (let i = 0; i < count; i++) {
        const particle = Matter.Bodies.rectangle(x, y, 4, 4, {
          label: 'particle',
          collisionFilter: { group: -1 }, 
          frictionAir: 0.05,
          render: { fillStyle: color, opacity: 0.8 }
        })
        Matter.Body.setVelocity(particle, {
          x: (Math.random() - 0.5) * 12,
          y: (Math.random() - 0.5) * 12
        })
        Matter.Composite.add(world, particle)
        setTimeout(() => {
          Matter.Composite.remove(world, particle)
        }, 1000)
      }
    }

    const spawnBlocks = () => {
      const newBlocks: Matter.Body[] = []
      const effectiveWidth = window.innerWidth - 100 
      const blockWidth = (effectiveWidth - SETTINGS.BLOCK.PADDING * (SETTINGS.BLOCK.COLS + 1)) / SETTINGS.BLOCK.COLS
      for (let r = 0; r < SETTINGS.BLOCK.ROWS; r++) {
        for (let c = 0; c < SETTINGS.BLOCK.COLS; c++) {
          const x = 50 + SETTINGS.BLOCK.PADDING + blockWidth / 2 + c * (blockWidth + SETTINGS.BLOCK.PADDING)
          const y = 80 + r * (SETTINGS.BLOCK.HEIGHT + SETTINGS.BLOCK.PADDING)
          const color = SETTINGS.COLORS[(r + c) % SETTINGS.COLORS.length]
          const block = Matter.Bodies.rectangle(x, y, blockWidth, SETTINGS.BLOCK.HEIGHT, {
            label: 'block',
            isStatic: true,
            render: { 
              fillStyle: color,
              strokeStyle: '#ffffff',
              lineWidth: 0.5
            }
          })
          newBlocks.push(block)
        }
      }
      Matter.Composite.add(world, newBlocks)
    }

    const walls = [
      Matter.Bodies.rectangle(window.innerWidth / 2, window.innerHeight, window.innerWidth, 50, { isStatic: true, restitution: 1, render: { visible: false } }),
      Matter.Bodies.rectangle(window.innerWidth / 2, 0, window.innerWidth, 50, { isStatic: true, restitution: 1, render: { visible: false } }),
      Matter.Bodies.rectangle(0, window.innerHeight / 2, 50, window.innerHeight, { isStatic: true, restitution: 1, render: { visible: false } }),
      Matter.Bodies.rectangle(window.innerWidth, window.innerHeight / 2, 50, window.innerHeight, { isStatic: true, restitution: 1, render: { visible: false } })
    ]

    const mallet = Matter.Bodies.polygon(window.innerWidth / 2, window.innerHeight - 150, 6, SETTINGS.PADDLE.RADIUS, { 
      label: 'paddle', 
      isStatic: true, 
      restitution: SETTINGS.PADDLE.RESTITUTION,
      render: { 
        fillStyle: '#ffffff',
        strokeStyle: '#00d2ff',
        lineWidth: 2
      } 
    })

    let ballsArr: Matter.Body[] = []
    let isResetting = false

    Matter.Events.on(engine, 'beforeUpdate', () => {
      const allBodies = Matter.Composite.allBodies(world)
      allBodies.forEach(body => {
        if (body.label === 'ball') {
          const speed = Matter.Vector.magnitude(body.velocity)
          if (speed > SETTINGS.BALL.MAX_SPEED) {
            const ratio = SETTINGS.BALL.MAX_SPEED / speed
            Matter.Body.setVelocity(body, {
              x: body.velocity.x * ratio,
              y: body.velocity.y * ratio
            })
          }
        }
      })
    })

    const resetStage = () => {
      const currentBalls = Matter.Composite.allBodies(world).filter(b => b.label === 'ball')
      Matter.Composite.remove(world, currentBalls)
      ballsArr = []
      const newBall = createBall(window.innerWidth / 2, window.innerHeight - 200, SETTINGS.BALL.RADIUS)
      Matter.Body.setVelocity(newBall, { x: 0, y: -22 })
      ballsArr.push(newBall)
      Matter.Composite.add(world, newBall)
      spawnBlocks()
      isResetting = false
    }

    Matter.Events.on(engine, 'collisionStart', (event) => {
      event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair
        
        // パドル衝突
        const isPaddleCollision = (bodyA.label === 'paddle' && bodyB.label === 'ball') || (bodyA.label === 'ball' && bodyB.label === 'paddle')
        if (isPaddleCollision) {
          const ballBody = bodyA.label === 'ball' ? bodyA : bodyB
          const paddleBody = bodyA.label === 'paddle' ? bodyA : bodyB
          const deltaX = ballBody.position.x - paddleBody.position.x
          const deltaY = ballBody.position.y - paddleBody.position.y
          const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY) || 1
          Matter.Body.setVelocity(ballBody, { 
            x: (deltaX / distance) * SETTINGS.PADDLE.BOOST_SPEED, 
            y: (deltaY / distance) * SETTINGS.PADDLE.BOOST_SPEED 
          })
        }

        // ボール衝突 (1% 分裂)
        const isBallCollision = bodyA.label === 'ball' && bodyB.label === 'ball'
        if (isBallCollision) {
          const ballA = bodyA as any
          const ballB = bodyB as any
          if (!ballA.isGhost && !ballB.isGhost && Math.random() < 0.01) {
            const spawnX = (ballA.position.x + ballB.position.x) / 2
            const spawnY = (ballA.position.y + ballB.position.y) / 2
            const newBall = createBall(spawnX, spawnY, SETTINGS.BALL.RADIUS, true)
            Matter.Body.setVelocity(newBall, { x: (Math.random() - 0.5) * 15, y: (Math.random() - 0.5) * 15 })
            if (ballsArr.length >= SETTINGS.BALL.MAX_COUNT) {
              const oldest = ballsArr.shift()
              if (oldest) Matter.Composite.remove(world, oldest)
            }
            ballsArr.push(newBall)
            Matter.Composite.add(world, newBall)
          }
        }

        // ブロック衝突
        const isBlockCollision = (bodyA.label === 'block' && bodyB.label === 'ball') || (bodyA.label === 'ball' && bodyB.label === 'block')
        if (isBlockCollision) {
          const blockBody = bodyA.label === 'block' ? bodyA : bodyB
          const ballBody = bodyA.label === 'ball' ? bodyA : bodyB
          if ((ballBody as any).isGhost) return
          
          const spawnPos = { x: blockBody.position.x, y: blockBody.position.y }
          const blockColor = blockBody.render.fillStyle
          const ballColor = ballBody.render.fillStyle

          // 演出: 破片を散らす
          spawnParticles(spawnPos.x, spawnPos.y, blockColor as string)

          // どんなブロックでも破壊
          Matter.Composite.remove(world, blockBody)

          const remainingBlocks = Matter.Composite.allBodies(world).filter(b => b.label === 'block')
          if (remainingBlocks.length === 0 && !isResetting) {
            isResetting = true
            setTimeout(resetStage, 1000)
          }

          // 色が一致した時だけ分裂
          if (blockColor === ballColor) {
            const newBall = createBall(spawnPos.x, spawnPos.y, SETTINGS.BALL.RADIUS, true)
            newBall.render.fillStyle = SETTINGS.COLORS[Math.floor(Math.random() * SETTINGS.COLORS.length)]
            Matter.Body.setVelocity(newBall, { x: (Math.random() - 0.5) * 25, y: (Math.random() - 0.5) * 15 + 5 })
            if (ballsArr.length >= SETTINGS.BALL.MAX_COUNT) {
              const oldest = ballsArr.shift()
              if (oldest) Matter.Composite.remove(world, oldest)
            }
            ballsArr.push(newBall)
            Matter.Composite.add(world, newBall)
          }
        }
      })
    })

    const handleMouseMove = (event: MouseEvent) => {
      const blockBottomY = 80 + SETTINGS.BLOCK.ROWS * (SETTINGS.BLOCK.HEIGHT + SETTINGS.BLOCK.PADDING)
      const minY = blockBottomY + SETTINGS.PADDLE.RADIUS + 20
      const x = Math.max(SETTINGS.PADDLE.RADIUS + 20, Math.min(window.innerWidth - SETTINGS.PADDLE.RADIUS - 20, event.clientX))
      const y = Math.max(minY, Math.min(window.innerHeight - 50, event.clientY))
      Matter.Body.setPosition(mallet, { x, y })
    }

    Matter.Composite.add(world, [...walls, mallet])
    resetStage()

    window.addEventListener('mousemove', handleMouseMove)

    const runner = Matter.Runner.create()
    Matter.Runner.run(runner, engine)
    Matter.Render.run(render)

    return () => {
      document.title = 'BALL'
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

export default BreakoutGame
