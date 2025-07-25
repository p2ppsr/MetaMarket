import React, {useEffect, useState} from 'react'
import { checkForMetaNetClient, NoMncModal } from 'metanet-react-prompt'
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom'
import Layout from './Layout'
import Account from './pages/Account'
import Details from './pages/Details'
import Store from './pages/Store'
import UploadFile from './pages/UploadFile'
import {WalletClient} from '@bsv/sdk'
const [MNCmissing, setMNCMissing] = useState<boolean>(false)
const App: React.FC = () => {
   useEffect(() => {
      const intervalId = setInterval(async () => {
      const hasMNC = await checkForMetaNetClient()
      if(hasMNC===0){
        setMNCMissing(true)
      }else{
        clearInterval(intervalId)
        setMNCMissing(false)
        const Client = new WalletClient
        await Client.waitForAuthentication()
      }
    },1000)
    return () => {
      clearInterval(intervalId)
    }
  }, [])
  
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
      <NoMncModal appName={'Pollr'} open={MNCmissing} onClose={() => setMNCMissing(false)} />
    </Router>
  )
}

export default App
