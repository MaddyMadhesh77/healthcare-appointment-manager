import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const HOME_BY_ROLE = { PATIENT: '/patient', DOCTOR: '/doctor', ADMIN: '/admin' };

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <nav className="navbar">
      <Link to={user ? HOME_BY_ROLE[user.role] : '/'} className="navbar-brand">
        HCA Clinic
      </Link>
      {user?.role === 'PATIENT' && (
        <div className="navbar-links">
          <Link to="/patient">Book</Link>
          <Link to="/patient/appointments">My appointments</Link>
        </div>
      )}
      {user && (
        <div className="navbar-user">
          <span>
            {user.name} ({user.role})
          </span>
          <button onClick={handleLogout}>Log out</button>
        </div>
      )}
    </nav>
  );
}
