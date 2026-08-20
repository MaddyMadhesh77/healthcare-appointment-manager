import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Navbar } from './components/Navbar';
import { Login } from './routes/Login';
import { Register } from './routes/Register';
import { BookAppointment } from './routes/patient/BookAppointment';
import { MyAppointments } from './routes/patient/MyAppointments';
import { DoctorAppointments } from './routes/doctor/DoctorAppointments';
import { AdminDoctors } from './routes/admin/AdminDoctors';

const HOME_BY_ROLE = { PATIENT: '/patient', DOCTOR: '/doctor', ADMIN: '/admin' };

function Home() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/patient"
            element={
              <ProtectedRoute roles={['PATIENT']}>
                <BookAppointment />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patient/appointments"
            element={
              <ProtectedRoute roles={['PATIENT']}>
                <MyAppointments />
              </ProtectedRoute>
            }
          />

          <Route
            path="/doctor"
            element={
              <ProtectedRoute roles={['DOCTOR']}>
                <DoctorAppointments />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['ADMIN']}>
                <AdminDoctors />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </AuthProvider>
  );
}
