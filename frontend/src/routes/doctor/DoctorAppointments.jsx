import { useEffect, useState } from 'react';
import { doctorAppointments } from '../../api/appointments';
import { submitVisit } from '../../api/visits';

const EMPTY_MED = { medicationName: '', dosage: '', timesPerDay: 2, durationDays: 5 };

function VisitForm({ appointment, onSubmitted }) {
  const [doctorNotes, setDoctorNotes] = useState('');
  const [prescription, setPrescription] = useState([{ ...EMPTY_MED }]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function updateMed(i, field, value) {
    setPrescription((prev) => prev.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)));
  }

  function addMed() {
    setPrescription((prev) => [...prev, { ...EMPTY_MED }]);
  }

  function removeMed(i) {
    setPrescription((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const cleanPrescription = prescription
        .filter((m) => m.medicationName.trim())
        .map((m) => ({
          ...m,
          timesPerDay: Number(m.timesPerDay),
          durationDays: Number(m.durationDays),
        }));
      await submitVisit(appointment.id, { doctorNotes, prescription: cleanPrescription });
      onSubmitted();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h3>Complete visit — {appointment.patient.name}</h3>
      <label>
        Clinical notes
        <textarea required rows={4} value={doctorNotes} onChange={(e) => setDoctorNotes(e.target.value)} />
      </label>
      <strong>Prescription</strong>
      {prescription.map((m, i) => (
        <div className="prescription-row" key={i}>
          <input
            placeholder="Medication"
            value={m.medicationName}
            onChange={(e) => updateMed(i, 'medicationName', e.target.value)}
          />
          <input placeholder="Dosage (e.g. 500mg)" value={m.dosage} onChange={(e) => updateMed(i, 'dosage', e.target.value)} />
          <input
            type="number"
            min={1}
            max={6}
            title="Times per day"
            value={m.timesPerDay}
            onChange={(e) => updateMed(i, 'timesPerDay', e.target.value)}
          />
          <input
            type="number"
            min={1}
            max={90}
            title="Duration (days)"
            value={m.durationDays}
            onChange={(e) => updateMed(i, 'durationDays', e.target.value)}
          />
          <button type="button" className="btn-danger" onClick={() => removeMed(i)}>
            Remove
          </button>
        </div>
      ))}
      <button type="button" className="btn-secondary" onClick={addMed}>
        + Add medication
      </button>
      {error && <p className="error">{error}</p>}
      <div className="card-actions">
        <button type="submit" disabled={busy}>
          {busy ? 'Submitting…' : 'Submit visit note'}
        </button>
      </div>
    </form>
  );
}

const URGENCY_CLASS = { Low: 'urgency-low', Medium: 'urgency-medium', High: 'urgency-high' };

export function DoctorAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [error, setError] = useState('');
  const [activeVisitForm, setActiveVisitForm] = useState(null);

  async function load() {
    try {
      setAppointments(await doctorAppointments());
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <h1>My appointments</h1>
      {error && <p className="error">{error}</p>}
      {appointments.length === 0 && <p className="empty-state">No appointments scheduled.</p>}
      <ul className="list">
        {appointments.map((a) => (
          <li key={a.id} className="card">
            <div className="appt-card-header">
              <div>
                <strong>{a.patient.name}</strong>
              </div>
              <span className={`status status-${a.status.toLowerCase()}`}>{a.status.replace(/_/g, ' ')}</span>
            </div>
            <p className="muted">{new Date(a.slotStart).toLocaleString()}</p>
            {a.symptomForm && (
              <div className="pre-visit-summary">
                <strong>Pre-visit summary</strong>
                {a.symptomForm.llmStatus === 'OK' ? (
                  <>
                    <p>
                      Urgency:{' '}
                      <span className={`urgency-badge ${URGENCY_CLASS[a.symptomForm.urgency] || ''}`}>
                        {a.symptomForm.urgency}
                      </span>
                    </p>
                    <p>Chief complaint: {a.symptomForm.chiefComplaint}</p>
                    <ul>
                      {(a.symptomForm.suggestedQuestions || []).map((q, i) => (
                        <li key={i}>{q}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="muted">AI summary unavailable — raw symptoms: {a.symptomForm.rawSymptoms}</p>
                )}
              </div>
            )}
            {a.status === 'CONFIRMED' && activeVisitForm !== a.id && (
              <div className="card-actions">
                <button onClick={() => setActiveVisitForm(a.id)}>Complete visit</button>
              </div>
            )}
            {a.status === 'CONFIRMED' && activeVisitForm === a.id && (
              <VisitForm
                appointment={a}
                onSubmitted={() => {
                  setActiveVisitForm(null);
                  load();
                }}
              />
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
