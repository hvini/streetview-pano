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

io.on('connection', function (socket) {
    if (SpaceNavigator.deviceCount() > 0) {
        const spacenav = new SpaceNavigator.SpaceNavigator();
        
        spacenav.on('translate', function (translation) {
            io.emit('translation', translation);
        });

        spacenav.on('rotate', function (rotation) {
            io.emit('rotation', rotation);
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