import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const HOME_BY_ROLE = { PATIENT: '/patient', DOCTOR: '/doctor', ADMIN: '/admin' };

function initials(name) {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

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
          <NavLink to="/patient" end className={({ isActive }) => (isActive ? 'active' : '')}>
            Book
          </NavLink>
          <NavLink to="/patient/appointments" className={({ isActive }) => (isActive ? 'active' : '')}>
            My appointments
          </NavLink>
        </div>
      )}
      {user && (
        <div className="navbar-user">
          <div className="navbar-user-info">
            <span className="avatar">{initials(user.name)}</span>
            <span className="navbar-user-text">
              <span className="name">{user.name}</span>
              <span className="role">{user.role}</span>
            </span>
          </div>
          <button className="btn-secondary" onClick={handleLogout}>
            Log out
          </button>
        </div>
      )}
    </nav>
  );
}
