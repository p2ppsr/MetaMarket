import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './Layout'
import Home from './pages/Home'
import UploadFilePage from './pages/UploadFilePage'
import Store from './pages/Store'
import Details from './pages/Details'

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="store" element={<Store />} />
          <Route path="upload-file" element={<UploadFilePage />} />
          <Route path=":txid/:outputIndex" element={<Details />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
