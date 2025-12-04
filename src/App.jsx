import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'; // Navigate qo'shildi
import DesktopLayout from './components/DesktopLayout';
import WaiterApp from './mobile/WaiterApp';
// Context yo'q joylarda prop-drilling hozircha qoladi, 
// lekin biz keyingi bosqichda DesktopLayout ichida useGlobal() ni ishlatamiz.

function App() {
  return (
    <Router>
      <Routes>
        {/* Asosiy Desktop ilova */}
        <Route path="/" element={<DesktopLayout />} />
        
        {/* Mobil Ofitsiant ilovasi */}
        <Route path="/waiter" element={<WaiterApp />} />
      </Routes>
    </Router>
  );
}

export default App;