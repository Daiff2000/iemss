import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Home from './pages/Home';
import AdminEmployees from './pages/AdminEmployees';
import AdminImport from './pages/AdminImport';
import AdminManualEntry from './pages/AdminManualEntry';
import Reports from './pages/Reports';
import AuditLogs from './pages/AuditLogs';
import Themes from './pages/Themes';
import EmployeesCurrent from './pages/EmployeesCurrent';import EmployeesLeft from './pages/EmployeesLeft';import EmployeesNew from './pages/EmployeesNew';import EmployeeDetail from './pages/EmployeeDetail';

// Route paths deliberately keep the original ".html" filenames because the
// legacy Home scripts (app-home.js, app-login.js, app-shell.js, ...) still hardcode redirects
// like `window.location.href = '/home.html'` and compare
// `location.pathname` against filenames such as 'home.html' to
// highlight the active nav link. Keeping the same paths means we reuse
// those scripts completely unchanged.
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/index.html" element={<Login />} />
        <Route path="/home.html" element={<Home />} />
        <Route path="/dashboard.html" element={<Navigate to="/home.html" replace />} />
        <Route path="/admin-employees.html" element={<AdminEmployees />} />
        <Route path="/admin-import.html" element={<AdminImport />} />
        <Route path="/admin-manual-entry.html" element={<AdminManualEntry />} />
        <Route path="/reports.html" element={<Reports />} />
        <Route path="/audit-logs.html" element={<AuditLogs />} />
        <Route path="/themes.html" element={<Themes />} />
        <Route path="/employees-current.html" element={<EmployeesCurrent />} /><Route path="/employees-left.html" element={<EmployeesLeft />} /><Route path="/employees-new.html" element={<EmployeesNew />} /><Route path="/employee.html" element={<EmployeeDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
