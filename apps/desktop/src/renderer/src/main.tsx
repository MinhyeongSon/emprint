import './lib/node-polyfills'
import ReactDOM from 'react-dom/client'
import { App } from './app'
import './styles/globals.css'
import './asset/font/variable/pretendardvariable.css'

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(<App />)
