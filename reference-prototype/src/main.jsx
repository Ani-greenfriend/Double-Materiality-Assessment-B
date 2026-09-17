import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PreviewWindowApp from './PreviewWindowApp.jsx'

// Hash fragment, not a query string: the hash is never sent to the server,
// so it can't break a signed/temporary URL's signature or trigger a 404 when
// this file is served from a host that doesn't expect extra query params.
const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
const previewId = hashParams.get('preview');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {previewId ? <PreviewWindowApp assessmentId={previewId} /> : <App />}
  </StrictMode>,
)
