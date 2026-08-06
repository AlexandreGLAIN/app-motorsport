import { Settings } from 'luxon';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App';
import './styles.css';

// Toute l'application parle français : dates, jours et mois inclus.
Settings.defaultLocale = 'fr';

const container = document.getElementById('root');
if (!container) throw new Error('Élément #root introuvable');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
