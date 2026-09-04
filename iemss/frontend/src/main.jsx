import { createRoot } from 'react-dom/client'
import './legacy-style.css'
import App from './App.jsx'

// StrictMode is intentionally not used: the original page scripts
// are not written to be idempotent
// (they attach listeners / read the DOM once on load), and StrictMode's
// dev-mode double-invoke of effects would run them twice.
createRoot(document.getElementById('root')).render(<App />)
