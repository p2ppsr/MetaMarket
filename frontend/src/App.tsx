import React, {useEffect, useState} from 'react'
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import Layout from './Layout'
import Account from './pages/Account'
import Details from './pages/Details'
import Store from './pages/Store'
import UploadFile from './pages/UploadFile'

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
