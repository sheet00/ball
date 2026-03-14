import { useEffect, useRef } from 'react'
import Matter from 'matter-js'
import './App.css'

function App() {
  const sceneRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!sceneRef.current) return

    // Matter.js エンジンの作成
    const engine = Matter.Engine.create()
    const world = engine.world

    // レンダラーの作成（描画用）
    const render = Matter.Render.create({
      element: sceneRef.current,
      engine: engine,
      options: {
        width: window.innerWidth,
        height: window.innerHeight,
        wireframes: false, // ワイヤーフレームを無効にして色を付ける
        background: '#111',
      },
    })

    // 共通の物理プロパティ（無限バウンド用）
    const bounceProps = {
      restitution: 1, 
      friction: 0,
      frictionAir: 0,
      render: { fillStyle: '#2d3436' }
    }

    // 外壁の作成（上下左右）
    const wallThickness = 50
    const walls = [
      // 下
      Matter.Bodies.rectangle(window.innerWidth / 2, window.innerHeight, window.innerWidth, wallThickness, { isStatic: true, ...bounceProps }),
      // 上
      Matter.Bodies.rectangle(window.innerWidth / 2, 0, window.innerWidth, wallThickness, { isStatic: true, ...bounceProps }),
      // 左
      Matter.Bodies.rectangle(0, window.innerHeight / 2, wallThickness, window.innerHeight, { isStatic: true, ...bounceProps }),
      // 右
      Matter.Bodies.rectangle(window.innerWidth, window.innerHeight / 2, wallThickness, window.innerHeight, { isStatic: true, ...bounceProps })
    ]

    // 斜めのスロープ（障害物）
    const slopes = [
      Matter.Bodies.rectangle(window.innerWidth * 0.3, window.innerHeight * 0.4, 300, 20, { 
        isStatic: true, 
        angle: Math.PI / 6, // 30度
        ...bounceProps,
        render: { fillStyle: '#636e72' }
      }),
      Matter.Bodies.rectangle(window.innerWidth * 0.7, window.innerHeight * 0.6, 300, 20, { 
        isStatic: true, 
        angle: -Math.PI / 4, // -45度
        ...bounceProps,
        render: { fillStyle: '#636e72' }
      }),
      Matter.Bodies.rectangle(window.innerWidth / 2, window.innerHeight * 0.8, 200, 20, { 
        isStatic: true, 
        angle: Math.PI / 10, // 18度
        ...bounceProps,
        render: { fillStyle: '#636e72' }
      })
    ]

    // ボールの作成
    const ball = Matter.Bodies.circle(
      window.innerWidth / 2 - 100, // 少し横にずらしてスタート
      100, 
      25, 
      {
        restitution: 1, 
        friction: 0, 
        frictionAir: 0, 
        inertia: Infinity,
        render: { fillStyle: '#fab1a0' } 
      }
    )
    
    // 初速を与えて斜めに飛ばす
    Matter.Body.setVelocity(ball, { x: 5, y: 5 })

    // 世界にオブジェクトを追加
    Matter.Composite.add(world, [...walls, ...slopes, ball])

    // エンジンとレンダラーの実行
    const runner = Matter.Runner.create()
    Matter.Runner.run(runner, engine)
    Matter.Render.run(render)

    // クリーンアップ処理
    return () => {
      Matter.Render.stop(render)
      Matter.Runner.stop(runner)
      Matter.Engine.clear(engine)
      render.canvas.remove()
      render.textures = {}
    }
  }, [])

  return (
    <div ref={sceneRef} className="canvas-container" />
  )
}

export default App
