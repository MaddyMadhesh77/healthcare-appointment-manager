import { useEffect, useState } from 'react';
import {
  adminListDoctors,
  adminCreateDoctor,
  adminListLeaves,
  adminAddLeave,
  adminRemoveLeave,
} from '../../api/doctors';

const DAYS = [
  ['mon', 'Mon'],
  ['tue', 'Tue'],
  ['wed', 'Wed'],
  ['thu', 'Thu'],
  ['fri', 'Fri'],
  ['sat', 'Sat'],
  ['sun', 'Sun'],
];

function defaultWorkingHours() {
  const wh = {};
  for (const [key] of DAYS) wh[key] = key === 'sat' || key === 'sun' ? null : { start: '09:00', end: '17:00' };
  return wh;
}

function CreateDoctorForm({ onCreated }) {
  const [form, setForm] = useState({
    email: '',
    password: '',
    name: '',
    specialisation: '',
    slotDurationMinutes: 30,
  });
  const [workingHours, setWorkingHours] = useState(defaultWorkingHours());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function toggleDay(day) {
    setWorkingHours((prev) => ({ ...prev, [day]: prev[day] ? null : { start: '09:00', end: '17:00' } }));
  }

  function updateDayTime(day, field, value) {
    setWorkingHours((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await adminCreateDoctor({
        ...form,
        slotDurationMinutes: Number(form.slotDurationMinutes),
        workingHours,
      });
      setForm({ email: '', password: '', name: '', specialisation: '', slotDurationMinutes: 30 });
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>Add doctor</h2>
      {error && <p className="error">{error}</p>}
      <label>
        Name
        <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </label>
      <label>
        Email
        <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
      </label>
      <label>
        Temporary password
        <input
          type="password"
          required
          minLength={8}
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
      </label>
      <label>
        Specialisation
        <input
          required
          value={form.specialisation}
          onChange={(e) => setForm({ ...form, specialisation: e.target.value })}
        />
      </label>
      <label>
        Slot duration (minutes)
        <input
          type="number"
          min={5}
          max={240}
          value={form.slotDurationMinutes}
          onChange={(e) => setForm({ ...form, slotDurationMinutes: e.target.value })}
        />
      </label>
      <strong>Working hours</strong>
      {DAYS.map(([key, label]) => (
        <div className="working-hours-row" key={key}>
          <label>
            <input type="checkbox" checked={Boolean(workingHours[key])} onChange={() => toggleDay(key)} />
            {label}
          </label>
          {workingHours[key] && (
            <>
              <input
                type="time"
                value={workingHours[key].start}
                onChange={(e) => updateDayTime(key, 'start', e.target.value)}
              />
              <input
                type="time"
                value={workingHours[key].end}
                onChange={(e) => updateDayTime(key, 'end', e.target.value)}
              />
            </>
          )}
        </div>
      ))}
      <button type="submit" disabled={busy}>
        {busy ? 'Creating…' : 'Create doctor'}
      </button>
    </form>
  );
}

function LeaveManager({ doctor }) {
  const [leaves, setLeaves] = useState([]);
  const [date, setDate] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  async function load() {
    try {
      setLeaves(await adminListLeaves(doctor.id));
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doctor.id]);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    setInfo('');
    try {
      const result = await adminAddLeave(doctor.id, { date, reason });
      setInfo(
        result.cancelledCount > 0
          ? `Leave added. ${result.cancelledCount} appointment(s) cancelled and patients notified.`
          : 'Leave added.'
      );
      setDate('');
      setReason('');
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleRemove(leaveId) {
    try {
      await adminRemoveLeave(doctor.id, leaveId);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="card">
      <h3>Leave — {doctor.name}</h3>
      {error && <p className="error">{error}</p>}
      {info && <p className="info">{info}</p>}
      <form onSubmit={handleAdd} className="inline-form">
        <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        <input placeholder="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <button type="submit">Add leave day</button>
      </form>
      {leaves.length === 0 ? (
        <p className="muted">No leave days recorded.</p>
      ) : (
        <ul className="list">
          {leaves.map((l) => (
            <li key={l.id}>
              <span>
                {new Date(l.date).toLocaleDateString()} {l.reason && `— ${l.reason}`}
              </span>
              <button className="btn-danger" onClick={() => handleRemove(l.id)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function AdminDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [error, setError] = useState('');
  const [leaveDoctor, setLeaveDoctor] = useState(null);

  async function load() {
    try {
      setDoctors(await adminListDoctors());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h1>Manage doctors</h1>
      {error && <p className="error">{error}</p>}
      <CreateDoctorForm onCreated={load} />
      <div className="card">
        <h2>Doctors</h2>
        {doctors.length === 0 && <p className="empty-state">No doctors yet — add one above.</p>}
        <ul className="list">
          {doctors.map((d) => (
            <li key={d.id}>
              <span>
                <strong>{d.name}</strong> <span className="muted">— {d.specialisation} ({d.slotDurationMinutes}min slots)</span>
              </span>
              <button className="btn-secondary" onClick={() => setLeaveDoctor(leaveDoctor?.id === d.id ? null : d)}>
                {leaveDoctor?.id === d.id ? 'Hide leave' : 'Manage leave'}
              </button>
            </li>
          ))}
        </ul>
      </div>
      {leaveDoctor && <LeaveManager doctor={leaveDoctor} />}
    </div>
  );
}
