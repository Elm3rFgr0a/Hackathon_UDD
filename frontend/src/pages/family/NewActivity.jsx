import { useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '../../components/Icon'
import { Avatar } from '../../components/common'
import { toISODate } from '../../lib/dates'
import FamilyShell, { useFamily } from './FamilyShell'

const ICON_BY_TYPE = { actividad: 'sun', consulta: 'cross' }

export default function NewActivity() {
  const { state, now, me, elderId, addActivity } = useFamily()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [tipo, setTipo] = useState('actividad')
  const [form, setForm] = useState({
    titulo: '',
    fecha: params.get('fecha') || toISODate(now),
    hora: '10:00',
    lugar: '',
    con: '',
  })
  const [para, setPara] = useState([elderId])
  const [errors, setErrors] = useState({})

  if (me.permiso === 've') return <Navigate to="/familiar/agenda" replace />

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const all = state.elders.map((e) => e.id)
  const allSelected = all.every((id) => para.includes(id))
  const toggle = (id) => setPara((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))
  const toggleAll = () => setPara(allSelected ? [elderId] : all)

  const submit = (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.titulo.trim()) errs.titulo = 'Escribe un título.'
    if (!form.fecha) errs.fecha = 'Elige una fecha.'
    if (!form.hora) errs.hora = 'Elige una hora.'
    if (para.length === 0) errs.para = 'Elige al menos una persona.'
    setErrors(errs)
    if (Object.keys(errs).length) return
    addActivity(
      { ...form, titulo: form.titulo.trim(), tipo, icono: ICON_BY_TYPE[tipo], elderIds: para, con: allSelected && all.length > 1 && !form.con ? 'Todo el núcleo familiar' : form.con },
      me.id,
    )
    navigate('/familiar/agenda')
  }

  return (
    <FamilyShell title="Nueva actividad" back="/familiar/agenda" nav={false} withElder={false}>
      <form className="form" onSubmit={submit} noValidate>
        <div className="segmented" role="group" aria-label="Tipo">
          {[['actividad', 'Actividad'], ['consulta', 'Consulta médica']].map(([v, l]) => (
            <button key={v} type="button" aria-pressed={tipo === v} onClick={() => setTipo(v)}>{l}</button>
          ))}
        </div>
        <p className="f-help" style={{ marginTop: -6 }}>
          ¿Es un remedio? <Link to="/familiar/remedios/nuevo" style={{ color: 'var(--pri)', fontWeight: 700, textDecoration: 'underline' }}>Agrégalo en Remedios</Link>
        </p>

        <div className="field">
          <label htmlFor="a-titulo">Título</label>
          <input id="a-titulo" className="input" value={form.titulo} onChange={set('titulo')} aria-invalid={!!errors.titulo}
            placeholder={tipo === 'consulta' ? 'Control de cardiología' : 'Almuerzo familiar'} />
          {errors.titulo && <span className="field__error">{errors.titulo}</span>}
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="a-fecha">Fecha</label>
            <input id="a-fecha" type="date" className="input" value={form.fecha} min={toISODate(now)} onChange={set('fecha')} aria-invalid={!!errors.fecha} />
          </div>
          <div className="field">
            <label htmlFor="a-hora">Hora</label>
            <input id="a-hora" type="time" className="input" value={form.hora} onChange={set('hora')} aria-invalid={!!errors.hora} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="a-lugar">Lugar</label>
          <input id="a-lugar" className="input" value={form.lugar} onChange={set('lugar')} placeholder={tipo === 'consulta' ? 'Policlínico Central' : 'Casa de Jorge'} />
        </div>
        <div className="field">
          <label htmlFor="a-con">{tipo === 'consulta' ? 'Profesional' : 'Con quién (opcional)'}</label>
          <input id="a-con" className="input" value={form.con} onChange={set('con')} placeholder={tipo === 'consulta' ? 'Dra. Soto' : 'Con Marta'} />
        </div>

        <fieldset className="field" style={{ border: 0 }}>
          <legend className="field__label" style={{ marginBottom: 6 }}>¿Para quién?</legend>
          <div className="f-card f-card--flush">
            {state.elders.length > 1 && (
              <>
                <label className="check">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} />
                  <span className="check__label">Todo el núcleo familiar</span>
                  <span className="check__meta">{state.elders.length} personas</span>
                </label>
                <div style={{ height: 1, background: 'var(--line)' }} />
              </>
            )}
            {state.elders.map((e) => (
              <label key={e.id} className="check">
                <input type="checkbox" checked={para.includes(e.id)} onChange={() => toggle(e.id)} />
                <Avatar person={e} size={32} />
                <span className="check__label">{e.nombre} {e.apellido}</span>
                <span className="check__meta">Adulto mayor</span>
              </label>
            ))}
          </div>
          {errors.para && <span className="field__error">{errors.para}</span>}
        </fieldset>

        <div className="f-card f-tile">
          <span className="f-tile__icon"><Icon name="bell" /></span>
          <div style={{ fontSize: 15 }}>
            <strong>Avisos automáticos</strong>
            <div className="f-meta">
              {tipo === 'consulta'
                ? 'Le avisamos el día anterior y 1 hora antes.'
                : 'Le avisamos 1 hora antes y, 1 hora después, le preguntamos si asistió.'}
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn--primary"><Icon name="check" size={20} stroke={2.5} />Guardar {tipo === 'consulta' ? 'consulta' : 'actividad'}</button>
        <Link to="/familiar/agenda" className="btn btn--ghost">Cancelar</Link>
      </form>
    </FamilyShell>
  )
}
