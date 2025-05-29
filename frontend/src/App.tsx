import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Layout from './Layout'
import UploadFile from './pages/UploadFile'
import Store from './pages/Store'
import Details from './pages/Details'
import Account from './pages/Account'

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Store />} />
          <Route path="upload-file" element={<UploadFile />} />
          <Route path=":txid/:outputIndex" element={<Details />} />
          <Route path="account" element={<Account />} />
        </Route>
      </Routes>
    </Router>
  )
}

export default App
