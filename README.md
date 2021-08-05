# parco-api

node, express, Joi, axios, bcrypt jwt

end Poits: 

/signIn:{
  tipo: post
  parametros:
    nombre: string
    telefono: strin 10 digitos
    correo: string correo valido
    contrasena: minimo 3 caracteres maximo 10
}

/logIn:{
  tipo: get
  parametros:
    correo: string correo previamente registrado
    contrasena: string contrasena previamente registrada
}

/modificar:{
  tipo: patch 
  parametros :
    obligatorio: token: obtenido en el endpoint "logIn" string
    opcionales:
      nombre: string
      telefono: string 10 digitos
      correo: string correo valido
      contrasena: minimo 3 caracteres maximo 10
}

/abonar:{
  tipo: post
  parametros:
   id: id del usuario sttring
   monto: float
   token: obtenido en el endpoint "logIn" string
}

/estacionamentos:{
  tipo: get
}

/pagarEstacionamiento:{
  tipo: post
  parametros:
    token: obtenido en el endpoint "logIn" string
    idusuario: id del usuario string 
    monto: total a pagar float
    idEstacionamiento: id de estacionamiento valido con status 0
    
}

/transaccionesUsuario:{
  tipo: get
  parametros: 
    token: obtenido en el endpoint "logIn" string
    idUsuario: idusuario: id del usuario string
}

/reporteEstacionamiento:{
  tipo: get
  parametros: 
  obligatorios: 
    fechaInicio string formato"aaaa/mmdd"
    fechaFin string formato"aaaa/mmdd"
    token: obtenido en el endpoint "logIn" de usuario con tipo 0 string
}
