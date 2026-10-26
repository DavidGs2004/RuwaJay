import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// Firebase Auth autoriza `localhost` en desarrollo, pero trata `127.0.0.1`
// como un dominio diferente. Conservamos toda la ruta y cambiamos solo el host.
if (window.location.hostname === '127.0.0.1') {
  const localUrl = new URL(window.location.href)
  localUrl.hostname = 'localhost'
  window.location.replace(localUrl.toString())
} else {
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
}
