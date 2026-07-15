import { useState } from 'react'
import './App.css'
import Header from './components/custom/Header'
import Hero from './components/custom/Hero'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div>
      <Header />
      <Hero />
    </div>
  )
}

export default App
