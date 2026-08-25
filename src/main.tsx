import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { dbService } from './db/sqlite-service';

if (typeof window !== 'undefined') {
  (window as any).dbService = dbService;
  (window as any).runSeed = async () => {
    await dbService.resetToDefaultSeed();
    console.log('Database successfully re-seeded from seed.ts!');
    window.location.reload();
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
