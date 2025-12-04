import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import DesktopLayout from './components/DesktopLayout';
import WaiterApp from './mobile/WaiterApp';

function App() {
  return (
    <Router>
      <Routes>
        {/* Asosiy Desktop ilova (Kassir) */}
        <Route path="/" element={<DesktopLayout />} />
        
        {/* Mobil Ofitsiant ilovasi */}
        <Route path="/waiter" element={<WaiterApp />} />
      </Routes>
    </Router>
  );
}

export default App;