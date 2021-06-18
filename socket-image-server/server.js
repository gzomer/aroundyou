const http = require('http');
const socketIO = require('socket.io');
const fs = require('fs')
const fetch = require('node-fetch')
const FormData = require('form-data');

const https = require('https');
const options = {}

const SERVER_PORT = 9000;

const SERVER_MAPPING = {
    'clothing': 'http://localhost:5001/inference',
    'objects': 'http://localhost:5002/inference',
    'explore': 'http://localhost:5003/inference',
    'reading': 'http://localhost:5004/inference',
    'menu': 'http://localhost:5004/inference',
    'labels': 'http://localhost:5004/inference',
    'numbers': 'http://localhost:5004/inference',
    'walking': 'http://localhost:5005/inference',
}

const app = http.createServer(options, function(req, res) {
    res.writeHead(200);
    res.write('AroundYou - Image Socket Server');
    res.end();
});

const io = socketIO(app, {});

const API_DEBOUNCE = {
    'clothing': 1,
    'objects': 1,
    'explore': 1,
    'walking': 1,
    'reading': 1,
    'menu': 1,
    'products': 1,
    'labels': 1,
    'numbers': 1,
}

let COUNTER = {}

io.set('origins', '*:*');

io.on('connection', function(socket) {
    console.log('client connected');

    socket.once('disconnect', () => {
        console.log('client disconnected');
    });

    socket.on('stream-data', function(data) {
        if (typeof data.mode === 'undefined') {
            return
        }
        const form = new FormData();

        const buffer = data.image
        const fileName = 'image.jpeg';

        form.append('file', buffer, {
            contentType: 'text/plain',
            name: 'file',
            filename: fileName,
        });
        for (var key in data) {
            if (key != 'image' && data[key] != null) {
                form.append(key, data[key])
            }
        }
        if (typeof COUNTER[data.mode] == 'undefined') {
            COUNTER[data.mode] = 0
        }
        if (typeof API_DEBOUNCE[data.mode] != 'undefined' && COUNTER[data.mode] + 1 > API_DEBOUNCE[data.mode]) {
            return
        }

        if (typeof SERVER_MAPPING[data.mode] === 'undefined') {
            console.log('Invalid mode')
            return
        }

        COUNTER[data.mode] += 1
        fetch(SERVER_MAPPING[data.mode], {
                method: 'POST',
                body: form
            })
            .then(res => res.json())
            .then(function(json) {
                console.log('[Recognition]', json)
                socket.emit('recognize', json);
                COUNTER[data.mode] -= 1
            })
            .catch(err => function(err) {
                console.log(err)
                COUNTER[data.mode] -= 1
            })
    });

});

app.listen(SERVER_PORT, () => {
    console.log('Image Socket server listening on:', SERVER_PORT);
});

module.exports = app;