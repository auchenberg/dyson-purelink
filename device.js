const mqtt = require('mqtt');
const EventEmitter = require('events');
const decrypt = require('./decrypt')
const debug = require('debug')

class Device extends EventEmitter {

    constructor (deviceInfo) {
        super();

        this.password = null;
        this.username = null;
        this.ip = null;
        this.url = null;
        this.name = null;
        this.port = null;
        this.serial = null;
        this.name = null;

        this._MQTTPrefix = "475"
        this._deviceInfo = deviceInfo;

        if(this._deviceInfo.Serial) {
            this.serial = this._deviceInfo.Serial
        }

        if(this._deviceInfo.Name) {
            this.name = this._deviceInfo.Name
        }

        this._decryptCredentials();
    }

    updateNetworkInfo(info) {
        this.ip = info.ip;
        this.url = 'mqtt://' + this.ip;
        this.name = info.name;
        this.port = info.port;

        this._connect();
    }

    getTemperature() {
        return new Promise((resolve, reject) => {
            this.once('sensor', (json) => {
                var temperature = parseFloat(json.data.tact) / 10 - 273.15;
                resolve(temperature);
            });
            this._requestCurrentState();
        })
    }

    getRelativeHumidity() {
        return new Promise((resolve, reject) => {
            this.once('sensor', (json) => {
                var relative_humidity = parseInt(json.data.hact);
                resolve(relative_humidity);
            });
            this._requestCurrentState();
        })
    }

    getAirQuality() {
        return new Promise((resolve, reject) => {
            this.once('sensor', (json) => {
                var air_quality = Math.min(Math.max(Math.floor((parseInt(json.data.pact) + parseInt(json.data.vact)) / 2), 1), 5);
                resolve(air_quality);
            });
            this._requestCurrentState();
        })
    }

    getFanStatus() {
        return new Promise((resolve, reject) => {
            this.once('state', (json) => {
                var fmod = json['product-state']['fmod'];
                var isOn = (fmod === "FAN")
                resolve(isOn);
            });
            this._requestCurrentState();
        })
    }

    getFanSpeed() {
        return new Promise((resolve, reject) => {
            this.once('state', (json) => {
                var fnsp = parseInt(json['product-state']['fnsp']);
                var rotation_speed = fnsp * 10;
                resolve(rotation_speed);
            });
            this._requestCurrentState();
        })
    }

    getAutoOnStatus() {
        return new Promise((resolve, reject) => {
            this.once('state', (json) => {
                var fmod = json['product-state']['fmod'];
                var isOn = (fmod === "AUTO")
                resolve(isOn);
            });
            this._requestCurrentState();
        })
    }    

    getRotationStatus() {
        return new Promise((resolve, reject) => {
            this.once('state', (json) => {
                var oson = json['product-state']['oson'];
                var isOn = (oson === "ON")
                resolve(isOn);
            });
            this._requestCurrentState();
        })
    }    

    turnOff() {
        return this.setFan(false)
    }

    turnOn() {
        return this.setFan(true)
    }

    setFan(value) {
        var now = new Date();
        var fmod = value ? "FAN" : "OFF";
        var message = '{"msg":"STATE-SET","time":"' + now.toISOString() + '","data":{"fmod":"' + fmod + '"}}';
        this.client.publish(
            this._getCommandTopic(),
            message
        );

        return this.getFanStatus()
    }

    setFanSpeed(value) {
        var now = new Date();
        var fnsp = Math.round(value / 10);
        var message = '{"msg":"STATE-SET","time":"' + now.toISOString() + '","data":{"fnsp":"' + fnsp + '"}}'
        this.client.publish(
            this._getCommandTopic(),
            message
        );

        return this.getFanSpeed()
    }

    setAuto(value) {
        var now = new Date();
        var fmod = value ? "AUTO" : "OFF";
        var message = '{"msg":"STATE-SET","time":"' + now.toISOString() + '","data":{"fmod":"' + fmod + '"}}';
        this.client.publish(
            this._getCommandTopic(),
            message
        );

        return this.getAutoOnStatus()
    }

    setRotation(value) {
        var now = new Date();
        var oson = value ? "ON" : "OFF";
        var message = '{"msg":"STATE-SET","time":"' + now.toISOString() + '","data":{"oson":"' + oson + '"}}';
        this.client.publish(
            this._getCommandTopic(),
            message
        );

        return this.getRotationStatus()
    }

    _connect() {
        this.options = {
            keepalive: 10,
            clientId: 'dyson_' + Math.random().toString(16),
            protocolId: 'MQTT',
            protocolVersion: 4,
            clean: true,
            reconnectPeriod: 1000,
            connectTimeout: 30 * 1000,
            username: this.username,
            password: this.password,
            rejectUnauthorized: false
        };

        this.client = mqtt.connect(this.url, this.options);
        this.client.on('connect', () => {
            this.client.subscribe(this._getCurrentStatusTopic());
        })

        this.client.on('message', (topic, message) => {
            let json = JSON.parse(message);
            if (json !== null) {
                if (json.msg === "ENVIRONMENTAL-CURRENT-SENSOR-DATA") {
                    this.emit('sensor', json);
                }
                if (json.msg === "CURRENT-STATE") {
                    this.emit('state', json);
                }
            }
        });
    }

    _decryptCredentials() {
        var decrypted = JSON.parse(decrypt(this._deviceInfo.LocalCredentials))
        this.password = decrypted.apPasswordHash;
        this.username = decrypted.serial
    }

    _requestCurrentState() {
        if ((this.listenerCount('state') + this.listenerCount('sensor')) == 1) {
            this.client.publish(this._getCommandTopic(),'{"msg":"REQUEST-CURRENT-STATE"}');
        }
    }

    _getCurrentStatusTopic() {
        return this._MQTTPrefix + '/' + this.username + '/status/current';
    }

    _getCommandTopic() {
        return this._MQTTPrefix + '/' + this.username + '/command';
    }
}

module.exports = Device