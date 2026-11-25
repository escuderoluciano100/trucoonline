# Truco Argentino Online — etapa 1

Este proyecto conserva el HTML original en `public/index.html` y agrega un servidor real Node.js + Socket.IO para **salas privadas, códigos, presencia, chat y comienzo de sala**.

## Ejecutar
Requiere Node.js 20 o superior.

```bash
npm install
npm start
```
Abrir `http://localhost:3000`.

## Publicar
Se incluye `render.yaml` para crear un Web Service en Render desde un repositorio Git. Build command: `npm install`; Start command: `npm start`.

## Estado honesto de esta etapa
- Implementado en servidor: creación/unión a sala privada, código aleatorio, capacidad 1v1/2v2, presencia, mensajes de chat y permiso de inicio para el anfitrión.
- Aún pendiente: integración de las cartas/turnos/reglas del HTML con eventos Socket.IO, manos privadas enviadas solo al jugador correspondiente, reconexión persistente, voces en vivo, base de datos de cuentas/estadísticas y pruebas entre dispositivos.
- El HTML original se conserva intacto; por eso todavía se abre en modo local y no se debe anunciar como juego multijugador terminado.

## Seguridad antes de producción
Esta es una base de desarrollo. Antes de abrirla al público hay que validar cada acción del truco en el servidor, añadir límites anti-spam, persistencia y pruebas automatizadas.
