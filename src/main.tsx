// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  RouterProvider,
} from "react-router-dom";
import './index.scss'
import router from './router.ts';

createRoot(document.getElementById('root')!).render(<RouterProvider router={router} />)
