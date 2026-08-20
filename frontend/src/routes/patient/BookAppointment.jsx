import { useState } from 'react';
import { Link } from 'react-router-dom';
import { searchDoctors } from '../../api/doctors';
import { getSlots, holdSlot, confirmAppointment } from '../../api/appointments';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function BookAppointment() {
  const [specialisation, setSpecialisation] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [date, setDate] = useState(todayIso());
  const [slots, setSlots] = useState([]);
  const [held, setHeld] = useState(null);
  const [symptoms, setSymptoms] = useState('');
  const [confirmed, setConfirmed] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function handleSearch(e) {
    e.preventDefault();
    setError('');
    try {
      setDoctors(await searchDoctors(specialisation));
    } catch (err) {
      setError(err.message);
    }
  }

  async function selectDoctor(doctor) {
    setSelectedDoctor(doctor);
    setHeld(null);
    setConfirmed(null);
    await loadSlots(doctor.id, date);
  }

  async function loadSlots(doctorId, forDate) {
    setError('');
    try {
      setSlots(await getSlots(doctorId, forDate));
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDateChange(newDate) {
    setDate(newDate);
    setHeld(null);
    if (selectedDoctor) await loadSlots(selectedDoctor.id, newDate);
  }

  async function handleHold(slot) {
    setError('');
    setBusy(true);
    try {
      const appointment = await holdSlot({ doctorId: selectedDoctor.id, slotStart: slot.slotStart });
      setHeld(appointment);
    } catch (err) {
      setError(err.message);
      await loadSlots(selectedDoctor.id, date);
    } finally {
      setBusy(false);
    }
  }

  async function handleConfirm(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const result = await confirmAppointment(held.id, { symptoms });
      setConfirmed(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (confirmed) {
    return (
      <div className="card">
        <h2>Appointment confirmed</h2>
        <p>
          With {selectedDoctor.name} on {new Date(confirmed.appointment.slotStart).toLocaleString()}
        </p>
        {confirmed.symptomForm.llmStatus === 'OK' ? (
          <div>
            <p>
              <strong>Urgency:</strong> {confirmed.symptomForm.urgency}
            </p>
            <p>
              <strong>Chief complaint:</strong> {confirmed.symptomForm.chiefComplaint}
            </p>
          </div>
        ) : (
          <p className="muted">AI summary unavailable — your symptoms were still recorded for the doctor.</p>
        )}
        <Link to="/patient/appointments">View my appointments</Link>
      </div>
    );
  }

  return (
    <div>
      <h1>Book an appointment</h1>
      {error && <p className="error">{error}</p>}

      <form className="card" onSubmit={handleSearch}>
        <label>
          Specialisation
          <input value={specialisation} onChange={(e) => setSpecialisation(e.target.value)} placeholder="e.g. Cardiology" />
        </label>
        <button type="submit">Search doctors</button>
      </form>

      {doctors.length > 0 && (
        <div className="card">
          <h2>Doctors</h2>
          <ul className="list">
            {doctors.map((d) => (
              <li key={d.id}>
                <button className={selectedDoctor?.id === d.id ? 'selected' : ''} onClick={() => selectDoctor(d)}>
                  {d.name} — {d.specialisation}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {selectedDoctor && !held && (
        <div className="card">
          <h2>Available slots for {selectedDoctor.name}</h2>
          <label>
            Date
            <input type="date" value={date} min={todayIso()} onChange={(e) => handleDateChange(e.target.value)} />
          </label>
          {slots.length === 0 ? (
            <p className="muted">No available slots on this date.</p>
          ) : (
            <ul className="list">
              {slots.map((s) => (
                <li key={s.slotStart}>
                  <button disabled={busy} onClick={() => handleHold(s)}>
                    {new Date(s.slotStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {held && (
        <form className="card" onSubmit={handleConfirm}>
          <h2>Describe your symptoms</h2>
          <p className="muted">
            Slot held until {new Date(held.holdExpiresAt).toLocaleTimeString()} — please confirm before then.
          </p>
          <label>
            Symptoms
            <textarea required rows={4} value={symptoms} onChange={(e) => setSymptoms(e.target.value)} />
          </label>
          <button type="submit" disabled={busy}>
            {busy ? 'Confirming…' : 'Confirm appointment'}
          </button>
        </form>
      )}
    </div>
  );
}
