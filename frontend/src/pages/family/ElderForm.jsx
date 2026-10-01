import { useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { elderById } from '../../lib/selectors'
import FamilyShell, { useFamily } from './FamilyShell'

export default function ElderForm() {
  const { state, me, addElder, updateElder, selectElder } = useFamily()
  const { elderId } = useParams()
  const navigate = useNavigate()
  const existing = elderId ? elderById(state, elderId) : null
  const [form, setForm] = useState(
    () => existing || { nombre: '', apellido: '', fechaNacimiento: '', residencia: 'Vive en casa', telefono: '+569' },
  )
  const [errors, setErrors] = useState({})

  if (me.permiso !== 'admin') return <Navigate to="/familiar/personas" replace />
  if (elderId && !existing) return <Navigate to="/familiar/personas" replace />

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.nombre.trim()) errs.nombre = 'Requerido.'
    if (!form.apellido.trim()) errs.apellido = 'Requerido.'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.fechaNacimiento)) errs.fechaNacimiento = 'Elige una fecha.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    // Datos que ya no se usan (como el RUT) no se guardan aunque vengan de un estado antiguo.
    const { rut: _rut, ...rest } = form
    const data = { ...rest, nombre: form.nombre.trim(), apellido: form.apellido.trim() }
    if (existing) {
      updateElder(existing.id, data)
      navigate('/familiar/personas')
    } else {
      const elder = addElder(data)
      selectElder(elder.id)
      navigate('/familiar/resumen')
    }
  }

  const field = (k, label, props = {}) => (
    <div className="field">
      <label htmlFor={`e-${k}`}>{label}</label>
      <input id={`e-${k}`} className="input" value={form[k]} onChange={set(k)} aria-invalid={!!errors[k]} {...props} />
      {errors[k] && <span className="field__error">{errors[k]}</span>}
    </div>
  )

  return (
    <FamilyShell title={existing ? `Editar a ${existing.nombre}` : 'Añadir adulto mayor'} back={existing ? '/familiar/personas' : '/familiar'} nav={false} withElder={false}>
      <form className="form" onSubmit={submit} noValidate>
        <div className="field-row">
          {field('nombre', 'Nombre', { autoComplete: 'given-name' })}
          {field('apellido', 'Apellido', { autoComplete: 'family-name' })}
        </div>
        <div className="field-row">
          {field('fechaNacimiento', 'Fecha de nacimiento', { type: 'date' })}
          {field('telefono', 'Teléfono', { type: 'tel', autoComplete: 'tel' })}
        </div>
        <div className="field">
          <label htmlFor="e-res">Dónde vive</label>
          <select id="e-res" className="input" value={form.residencia} onChange={set('residencia')}>
            <option>Vive en casa</option>
            <option>Vive con familia</option>
            <option>ELEAM Los Aromos</option>
            <option>Otro ELEAM</option>
          </select>
        </div>
        {!existing && (
          <p className="f-help">Le enviaremos un acceso a su correo o teléfono para que use la app con letra grande.</p>
        )}
        <button type="submit" className="btn btn--primary">
          <Icon name="check" size={20} stroke={2.5} />Guardar
        </button>
      </form>
    </FamilyShell>
  )
}
