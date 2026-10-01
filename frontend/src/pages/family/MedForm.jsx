import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import FamilyShell, { useFamily } from './FamilyShell'

const EMPTY = { nombre: '', dosis: '', cantidad: '1 pastilla', indicacion: '', horarios: [], stockDias: 30, responsableId: '' }

export default function MedForm() {
  const { state, me, elder, elderId, saveMedication, removeMedication } = useFamily()
  const { medId } = useParams()
  const navigate = useNavigate()
  const existing = medId ? state.medications.find((m) => m.id === medId && m.elderId === elderId) : null
  const [form, setForm] = useState(() => existing || { ...EMPTY, responsableId: me.id })
  const [newTime, setNewTime] = useState('08:00')
  const [errors, setErrors] = useState({})

  if (medId && !existing) return <Navigate to="/familiar/remedios" replace />
  if (me.permiso === 've') return <Navigate to="/familiar/remedios" replace />

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const addTime = () => {
    if (!newTime || form.horarios.includes(newTime)) return
    setForm((f) => ({ ...f, horarios: [...f.horarios, newTime].sort() }))
  }
  const removeTime = (t) => setForm((f) => ({ ...f, horarios: f.horarios.filter((x) => x !== t) }))

  const submit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.nombre.trim()) errs.nombre = 'Escribe el nombre del remedio.'
    if (!form.dosis.trim()) errs.dosis = 'Indica la dosis, por ejemplo 50 mg.'
    if (form.horarios.length === 0) errs.horarios = 'Agrega al menos un horario.'
    if (!(Number(form.stockDias) >= 0)) errs.stockDias = 'Debe ser un número.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    saveMedication({ ...form, nombre: form.nombre.trim(), dosis: form.dosis.trim(), stockDias: Number(form.stockDias), elderId })
    navigate('/familiar/remedios')
  }

  const remove = () => {
    if (window.confirm(`¿Eliminar ${existing.nombre} de los remedios de ${elder.nombre}?`)) {
      removeMedication(existing.id)
      navigate('/familiar/remedios')
    }
  }

  return (
    <FamilyShell title={existing ? 'Editar remedio' : 'Nuevo remedio'} back="/familiar/remedios" nav={false}>
      <form className="form" onSubmit={submit} noValidate>
        <div className="field">
          <label htmlFor="m-nombre">Nombre</label>
          <input id="m-nombre" className="input" value={form.nombre} onChange={set('nombre')} aria-invalid={!!errors.nombre} placeholder="Losartán" />
          {errors.nombre && <span className="field__error">{errors.nombre}</span>}
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="m-dosis">Dosis</label>
            <input id="m-dosis" className="input" value={form.dosis} onChange={set('dosis')} aria-invalid={!!errors.dosis} placeholder="50 mg" />
            {errors.dosis && <span className="field__error">{errors.dosis}</span>}
          </div>
          <div className="field">
            <label htmlFor="m-cant">Cantidad</label>
            <input id="m-cant" className="input" value={form.cantidad} onChange={set('cantidad')} placeholder="1 pastilla" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="m-ind">Indicación (opcional)</label>
          <input id="m-ind" className="input" value={form.indicacion} onChange={set('indicacion')} placeholder="Con el desayuno" />
        </div>
        <fieldset className="field" style={{ border: 0 }}>
          <legend className="field__label" style={{ marginBottom: 6 }}>Horarios</legend>
          <div className="times">
            {form.horarios.map((t) => (
              <span key={t} className="time-chip">
                {t}
                <button type="button" onClick={() => removeTime(t)} aria-label={`Quitar ${t}`}><Icon name="x" size={16} stroke={2.5} /></button>
              </span>
            ))}
            {form.horarios.length === 0 && <span className="f-meta">Sin horarios todavía.</span>}
          </div>
          <div className="time-add" style={{ marginTop: 8 }}>
            <label htmlFor="m-hora" className="visually-hidden">Nuevo horario</label>
            <input id="m-hora" type="time" className="input" value={newTime} onChange={(e) => setNewTime(e.target.value)} />
            <button type="button" className="btn btn--secondary btn--sm" onClick={addTime}>
              <Icon name="plus" size={18} stroke={2.5} />Agregar
            </button>
          </div>
          {errors.horarios && <span className="field__error">{errors.horarios}</span>}
        </fieldset>
        <div className="field-row">
          <div className="field">
            <label htmlFor="m-stock">Stock (días)</label>
            <input id="m-stock" type="number" min="0" inputMode="numeric" className="input" value={form.stockDias} onChange={set('stockDias')} aria-invalid={!!errors.stockDias} />
            {errors.stockDias && <span className="field__error">{errors.stockDias}</span>}
          </div>
          <div className="field">
            <label htmlFor="m-resp">Compra a cargo de</label>
            <select id="m-resp" className="input" value={form.responsableId} onChange={set('responsableId')}>
              {state.members.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
        </div>
        <button type="submit" className="btn btn--primary"><Icon name="check" size={20} stroke={2.5} />Guardar remedio</button>
        {existing && (
          <button type="button" className="btn btn--danger" onClick={remove}><Icon name="trash" size={20} />Eliminar remedio</button>
        )}
      </form>
    </FamilyShell>
  )
}
