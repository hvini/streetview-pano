const SpaceNavigator = require('./lib/spacenav');
const express = require('express');
const app = express();
const cors = require('cors');
const http = require('http').Server(app);
const io = require('socket.io')(http, {
    cors: {
        origin: '*'
    }
});

// Initializing cors middleware
app.use(cors());

// initialize dotenv
require('dotenv').config();

// serve static files
app.use(express.static(__dirname + '/public'));

app.get('/display/:yawoffset', function(req, res) {
    res.sendFile(__dirname + '/public/display/index.html');
});

io.on('connection', function (socket) {
    if (SpaceNavigator.deviceCount() > 0) {
        const spacenav = new SpaceNavigator.SpaceNavigator();
        
        spacenav.on('transform', function (transform) {
            io.emit('transform', transform);
        });

        spacenav.on('button', function (event) {
            io.emit('button', event);
        });
    }

    socket.on('search_result', function (panodata) {
        io.emit('search_result', panodata);
    });

    socket.on('update', function (pov) {
        io.emit('update', pov);
    });

    socket.on('pano_changed', function (panoid) {
        io.emit('pano_changed', panoid);
    });
});

const port = process.env.PORT || 8086;
http.listen(port, () => console.log(`Listening on port ${port}!`));