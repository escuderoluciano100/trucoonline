'use strict';
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const crypto = require('crypto');
const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: true }, maxHttpBufferSize: 1e5 });
const PORT = process.env.PORT || 3000;
const rooms = new Map();
app.use(express.static(path.join(__dirname, 'public')));
app.get('/health', (_req, res) => res.json({ ok: true, service: 'truco-online-lobby', rooms: rooms.size }));
function makeCode(){ return crypto.randomBytes(3).toString('hex').toUpperCase(); }
function cleanName(v){ return String(v || 'Jugador').replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,18) || 'Jugador'; }
function publicRoom(room){ return { code:room.code, mode:room.mode, players:[...room.players.values()].map(p=>({name:p.name, avatar:p.avatar, connected:p.connected, host:p.host})), started:room.started, capacity:room.capacity }; }
io.on('connection', socket => {
  socket.emit('server:ready', { message:'Conectado al servidor de Truco Argentino' });
  socket.on('room:create', (data={}, ack=()=>{}) => {
    const mode = data.mode === '2v2' ? '2v2' : '1v1';
    let code; do { code = makeCode(); } while(rooms.has(code));
    const room = { code, mode, capacity: mode==='2v2'?4:2, host:socket.id, started:false, players:new Map() };
    room.players.set(socket.id,{ name:cleanName(data.name), avatar:String(data.avatar||'🧉').slice(0,8), connected:true, host:true });
    rooms.set(code,room); socket.join(code); socket.data.room=code;
    ack({ok:true, room:publicRoom(room)}); io.to(code).emit('room:update',publicRoom(room));
  });
  socket.on('room:join', (data={}, ack=()=>{}) => {
    const code=String(data.code||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,6);
    const room=rooms.get(code);
    if(!room) return ack({ok:false,error:'No existe esa mesa. Revisá el código.'});
    if(room.started) return ack({ok:false,error:'La partida ya empezó.'});
    if(room.players.size>=room.capacity) return ack({ok:false,error:'La mesa está completa.'});
    room.players.set(socket.id,{name:cleanName(data.name),avatar:String(data.avatar||'🧉').slice(0,8),connected:true,host:false});
    socket.join(code); socket.data.room=code; ack({ok:true,room:publicRoom(room)}); io.to(code).emit('room:update',publicRoom(room));
    io.to(code).emit('chat:message',{system:true,text:`${cleanName(data.name)} se unió a la mesa.`});
  });
  socket.on('room:start', (_data, ack=()=>{}) => {
    const room=rooms.get(socket.data.room); if(!room) return ack({ok:false,error:'No estás en una mesa.'});
    if(room.host!==socket.id) return ack({ok:false,error:'Solo quien creó la mesa puede iniciar.'});
    if(room.players.size!==room.capacity) return ack({ok:false,error:'Faltan jugadores para completar la mesa.'});
    room.started=true; io.to(room.code).emit('room:update',publicRoom(room)); io.to(room.code).emit('room:started',{code:room.code,mode:room.mode}); ack({ok:true});
  });
  socket.on('chat:send', (data={}, ack=()=>{}) => {
    const room=rooms.get(socket.data.room); if(!room) return ack({ok:false,error:'No estás en una mesa.'});
    const text=String(data.text||'').trim().slice(0,240); if(!text) return ack({ok:false,error:'Escribí un mensaje.'});
    const p=room.players.get(socket.id); if(!p) return ack({ok:false,error:'No estás en esa mesa.'});
    io.to(room.code).emit('chat:message',{name:p.name,text,at:Date.now()}); ack({ok:true});
  });
  socket.on('disconnect',()=>{
    const code=socket.data.room, room=rooms.get(code); if(!room) return;
    const p=room.players.get(socket.id); if(p){p.connected=false; io.to(code).emit('chat:message',{system:true,text:`${p.name} se desconectó.`});}
    // Conservamos la plaza durante 60 segundos para permitir reconexión futura; limpieza básica por ahora.
    setTimeout(()=>{ const current=rooms.get(code); if(current && current.players.has(socket.id) && !current.players.get(socket.id).connected){ current.players.delete(socket.id); if(current.players.size===0) rooms.delete(code); else { if(current.host===socket.id) current.host=current.players.keys().next().value; io.to(code).emit('room:update',publicRoom(current)); } } },60000);
    io.to(code).emit('room:update',publicRoom(room));
  });
});
server.listen(PORT,()=>console.log(`Truco online escuchando en ${PORT}`));
