import { CssBaseline } from '@mui/material'
import { ThemeProvider } from '@mui/material/styles'
import ReactDOM from 'react-dom/client'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import App from './App'
import web3Theme from './theme'

const rootElement = document.getElementById('root')

if (rootElement === null) {
  throw new Error('Failed to find the root element')
}

const root = ReactDOM.createRoot(rootElement)

root.render(
  <ThemeProvider theme={web3Theme}>
    <ToastContainer
      position='top-center'
      autoClose={5000} // auto close after 5 seconds
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
    />
    <CssBaseline />
    <App />
  </ThemeProvider>
)
