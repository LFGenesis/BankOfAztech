import React from 'react'
import ReactDOM from 'react-dom/client'
import { ChakraProvider, extendTheme } from '@chakra-ui/react'
import App from './App'

// Tema ayarları
const theme = extendTheme({
  styles: {
    global: {
      body: {
        bg: 'gray.900',
        color: 'whiteAlpha.900'
      }
    }
  },
  config: {
    initialColorMode: 'dark',
    useSystemColorMode: false
  }
})

// PWA için service worker kaydı
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered:', registration)
      })
      .catch(error => {
        console.log('SW registration failed:', error)
      })
  })
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ChakraProvider theme={theme}>
      <App />
    </ChakraProvider>
  </React.StrictMode>,
) 