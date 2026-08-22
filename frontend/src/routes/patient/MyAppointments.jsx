import { useEffect, useState } from 'react';
import { myAppointments, cancelAppointment } from '../../api/appointments';
import { getVisit } from '../../api/visits';

function VisitSummary({ appointmentId }) {
  const [visit, setVisit] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getVisit(appointmentId)
      .then(setVisit)
      .catch((err) => setError(err.message));
  }, [appointmentId]);

  if (error) return null;
  if (!visit) return <p className="muted">Loading summary…</p>;


  if (visit.llmStatus !== 'OK' || !visit.patientSummary) {
    return <p className="muted">Post-visit summary unavailable right now. Doctor's notes are on file.</p>;
  }

  return (
    <div className="visit-summary">
      <p>{visit.patientSummary.summary}</p>
      {visit.patientSummary.medicationSchedule?.length > 0 && (
        <>
          <strong>Medication schedule</strong>
          <ul>
            {visit.patientSummary.medicationSchedule.map((m, i) => (
              <li key={i}>{m}</li>
            ))}
          </ul>
        </>
      )}
      {visit.patientSummary.followUpSteps?.length > 0 && (
        <>
          <strong>Follow-up steps</strong>
          <ul>
            {visit.patientSummary.followUpSteps.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

export function MyAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(null);

  async function load() {
    try {
      setAppointments(await myAppointments());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCancel(id) {
    setError('');
    try {
      await cancelAppointment(id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div>
      <h1>My appointments</h1>
      {error && <p className="error">{error}</p>}
      {appointments.length === 0 && <p className="empty-state">No appointments yet — book one to get started.</p>}
      <ul className="list">
        {appointments.map((a) => (
          <li key={a.id} className="card">
            <div className="appt-card-header">
              <div>
                <strong>{a.doctor.user.name}</strong>
                <span className="muted"> · {a.doctor.specialisation}</span>
              </div>
              <span className={`status status-${a.status.toLowerCase()}`}>{a.status.replace(/_/g, ' ')}</span>
            </div>
            <p className="muted">{new Date(a.slotStart).toLocaleString()}</p>
            <div className="card-actions">
              {['HELD', 'CONFIRMED'].includes(a.status) && (
                <button className="btn-danger" onClick={() => handleCancel(a.id)}>
                  Cancel
                </button>
              )}
              {a.status === 'COMPLETED' && (
                <button className="btn-secondary" onClick={() => setExpanded(expanded === a.id ? null : a.id)}>
                  {expanded === a.id ? 'Hide summary' : 'View visit summary'}
                </button>
              )}
            </div>
            {expanded === a.id && <VisitSummary appointmentId={a.id} />}
          </li>
        ))}
      </ul>
    </div>
  );
}
