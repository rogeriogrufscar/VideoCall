import React from 'react'
import ReactDOM from 'react-dom/client'
import VideoCall from './components/VideoCall'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Renderize APENAS UM VideoCall aqui */}
    <VideoCall roomUrl="" accessToken="" />
  </React.StrictMode>
)