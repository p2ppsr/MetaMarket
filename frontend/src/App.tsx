import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './Layout'
import Home from './pages/Home'
import UploadFilePage from './pages/UploadFilePage'

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="upload-file" element={<UploadFilePage />}/>
        </Route>
      </Routes>
    </Router>
  )
}

export default App
