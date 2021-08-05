const express = require("express");
const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const csv = require('csv-express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Joi = require('joi');

const prisma = new PrismaClient();
const app = express();

const saltRounds = 10;
const secreto = 'parcoapisecreto';
const port = 5000;
const salt = bcrypt.genSaltSync(saltRounds);

const schemaSignIn = Joi.object({
	nombre: Joi.string().pattern(new RegExp('^[a-zA-Z]+(([,. -][a-zA-Z ])?[a-zA-Z]*)*$')),
	contrasena: Joi.string().pattern(new RegExp(RegExp('^[a-zA-Z0-9.]{3,30}$'))),
	telefono: Joi.string().pattern(new RegExp('^[0-9]{10}$')),
	token: Joi.string(),
	monto: Joi.number(),
	idEstacionamieno: Joi.string(),
	idUsuario: Joi.string(),
	id: Joi.string(),
	correo: Joi.string().email({ minDomainSegments: 2, tlds: { allow: ['com', 'net'] } })
});

app.post('/signIn', async (req, res) => {
	try {
		const datos = req.query;
		const fechaCreacion = Date.now();
		const contrasena = bcrypt.hashSync(datos.contrasena, salt);
		const validated = await schemaSignIn.validateAsync(datos);
		const post = await prisma.usuario.create({
			data: {
				...datos,
				fechaCreacion,
				contrasena,
				tipo: '1'
			},
		});
		res.json(post);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

app.get('/logIn', async (req, res) => {
	try {
		const { correo, contrasena } = req.query;
		const usuario = await prisma.usuario.findUnique({
			where: {
				correo
			},
		});
		if (usuario) {
			if (bcrypt.compareSync(contrasena, usuario.contrasena)) {
				const token = jwt.sign({ data: usuario }, secreto, { expiresIn: '24h' });
				res.json(token);
			} else res.json({ message: "contrasena incorrecta" });
		} else res.json({ message: "usuario no encontrado" });
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

app.patch('/modificar', async (req, res) => {
	try {
		const datos = req.query;
		const validated = await schemaSignIn.validateAsync(datos);
		const usuarioDecodificado = jwt.verify(datos.token, secreto);
		let usuario = [];
		if (!usuarioDecodificado) {
			res.json({ message: 'no autorizado' });
		}
		const id = usuarioDecodificado.data.id;
		if (datos.contrasena) {
			const contrasena = bcrypt.hashSync(datos.contrasena, salt);
			usuario = await prisma.usuario.update({
				where: { id },
				data: { ...datos, contrasena },
			});
		} else {
			usuario = await prisma.usuario.update({
				where: { id },
				data: { ...datos },
			});
		}
		res.json(usuario);
	} catch (error) {
		res.status(500).json({ message: error.message });
	}
});

app.post('/abonar', async (req, res) => {
	try {
		const usuarioDecodificado = jwt.verify(req.query.token, secreto);
		if (!usuarioDecodificado) {
			res.json({ message: 'no autorizado' });
		}
		const { id, monto } = req.query;
		const validated = await schemaSignIn.validateAsync(req.query);
		const usuarioS = await prisma.usuario.findUnique({
			where: { id },
		});
		const { saldoDisponible } = usuarioS;
		const montoFloat = saldoDisponible + parseFloat(monto);
		const usuario = await prisma.usuario.update({
			where: { id },
			data: { saldoDisponible: + montoFloat },
		});
		res.json(usuario);
	} catch (error) {
		res.json({ message: error.message });
	}
});

app.get('/estacionamentos', async (req, res) => {
	try {
		const estacionamientos = await axios.get('https://dev.parcoapp.com/api/Parkings');
		res.json(estacionamientos.data);
	} catch (error) {
		res.json({ message: error.message });
	}
});

app.post('/pagarEstacionamiento', async (req, res) => {
	try {
		const usuarioDecodificado = jwt.verify(req.query.token, secreto);
		if (!usuarioDecodificado) {
			res.json({ message: 'no autorizado' });
		}
		const { idUsuario, monto, idEstacionamieno } = req.query;
		const validated = await schemaSignIn.validateAsync(req.query);
		const total = parseFloat(monto);
		const fechaCreacion = Date.now();
		const boleto = Math.floor(Math.random() * 10000) + "" + Math.floor(Math.random() * 10000) + "" + Math.floor(Math.random() * 10000);
		const usuario = await prisma.usuario.findUnique({
			where: { id: idUsuario },
		});
		const estacionamientos = await axios.get('https://dev.parcoapp.com/api/Parkings');
		const estacionamiento = estacionamientos.data.filter(item => item.id === idEstacionamieno);
		if (estacionamiento.length === 0) {
			res.json({ message: "estacionamiento no encontrado" });
		}
		if (usuario.saldoDisponible >= total && estacionamiento[0].status === 0) {
			const nuevoSaldo = usuario.saldoDisponible - total;
			const NuevoUsuario = await prisma.usuario.update({
				where: { id: idUsuario },
				data: { saldoDisponible: nuevoSaldo },
			});
			const transaccion = await prisma.transaccion.create({
				data: {
					idUsuario,
					idEstacionamieno,
					total,
					boleto,
					fechaCreacion
				},
			});
			res.json(transaccion);
		} else res.json({ message: 'saldo no disponible' });
	} catch (error) {
		res.json({ error: error.message });
	}
});

app.get('/transaccionesUsuario', async (req, res) => {
	try {
		const usuarioDecodificado = jwt.verify(req.query.token, secreto);
		if (!usuarioDecodificado) {
			res.json({ message: 'no autorizado' });
		}
		const { idUsuario } = req.query;
		const trasacciones = await prisma.transaccion.findMany({
			where: { idUsuario },
		});
		res.send(trasacciones);
	} catch (error) {
		res.json({ error: error.message });
	}
});

app.get('/reporteEstacionamiento', async (req, res) => {
	try {
		const usuarioDecodificado = jwt.verify(req.query.token, secreto);
		if (!usuarioDecodificado) {
			res.json({ message: 'no autorizado' });
		}
		if (usuarioDecodificado.data.tipo !== '0') {
			res.json({ message: 'no autorizado' });
		}
		let reporte = [];
		const datos = req.query;
		const fechaInicio = new Date(datos.fechaInicio).getTime();
		const fechaFin = new Date(datos.fechaFin).getTime();
		if (datos.idEstacionamieno) {
			const idEstacionamieno = datos.idEstacionamieno;
			reporte = await prisma.transaccion.findMany({
				where: { idEstacionamieno },
				orderBy: {
					fechaCreacion: "asc"
				},
			});
		} else {
			reporte = await prisma.transaccion.findMany({
				orderBy: {
					fechaCreacion: "asc"
				},
			});
		}
		const reporteFil = reporte.filter(item => item.fechaCreacion >= fechaInicio && item.fechaCreacion <= fechaFin);
		res.csv(reporteFil, true);
	} catch (error) {
		res.json({ error: error.message });
	}
});

app.get('/', function async(req, res) {
	res.send('hello world');
});

app.listen(port, () => {
	console.log(`server is running at http://localhost:${port}`);
});