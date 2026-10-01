Tablas y atributo a hacer en dynamoDB

Usuario:
    - idUsuario (uuid)
    - rut (texto)
    - nombreUsuario (texto)
    - fechaNacimiento (fecha)
    - receta (json anidado)
    - visitasMedicas (json anidado)
    - idFamilia (lista de uuid)  


toma de medicamento:
    - idToma (sk grupo familiar)
    - idUsuario (uuid)
    - medicamento (nombre (mismo que en receta))
    - horaFecha (hora en utc)


GrupoFamiliar:
    - idFamilia (uuid)
    - nombreGrupo (texto)


