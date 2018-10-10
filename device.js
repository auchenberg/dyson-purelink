const mqtt = require('mqtt')
const EventEmitter = require('events')
const decrypt = require('./decrypt')
const debug = require('debug')('dyson/device')

class Device extends EventEmitter {
  constructor (deviceInfo) {
    super()

    this.password = null
    this.username = null
    this.ip = null
    this.url = null
    this.name = null
    this.port = null
    this.serial = null
    this.name = null
    this.sensitivity = deviceInfo.sensitivity || 1.0

    this._MQTTPrefix = '475'
    this._deviceInfo = deviceInfo

    if (this._deviceInfo.Serial) {
      this.serial = this._deviceInfo.Serial
    }

    if (this._deviceInfo.Name) {
      this.name = this._deviceInfo.Name
    }

    this._decryptCredentials()
  }

  updateNetworkInfo (info) {
    this.ip = info.ip
    this.url = 'mqtt://' + this.ip
    this.name = info.name
    this.port = info.port
    this._MQTTPrefix = info.mqttPrefix || '475'

    // debug('updateNetworkInfo', JSON.stringify(info))
    this._connect()
  }

  getTemperature () {
    return new Promise((resolve, reject) => {
      this.once('sensor', (json) => {
        const temperature = parseFloat(((parseInt(json.data.tact, 10) / 10) - 273.15).toFixed(2))
        resolve(temperature)
      })
      this._requestCurrentState()
    })
  }

  getRelativeHumidity () {
    return new Promise((resolve, reject) => {
      this.once('sensor', (json) => {
        const relativeHumidity = parseInt(json.data.hact)
        resolve(relativeHumidity)
      })
      this._requestCurrentState()
    })
  }

  getAirQuality () {
    return new Promise((resolve, reject) => {
      this.once('sensor', (json) => {
        let dustValue = Number.parseInt(json.data.pact || json.data.pm10)
        let vocValue = Number.parseInt(json.data.vact || json.data.va10)
        let airQuality = 0

        if (isNaN(dustValue) || isNaN(vocValue)) {
          airQuality = 0
        } else {
          airQuality = Math.min(Math.max(Math.floor((dustValue + vocValue) / 2 * this.sensitivity), 1), 5)
        }

        resolve(airQuality)
      })
      this._requestCurrentState()
    })
  }

  getFanStatus () {
    return new Promise((resolve, reject) => {
      this.once('state', (json) => {
        const fpwr = json['product-state']['fpwr']
        const isOn = (fpwr === 'ON')
        resolve(isOn)
      })
      this._requestCurrentState()
    })
  }

  getFanSpeed () {
    return new Promise((resolve, reject) => {
      this.once('state', (json) => {
        const fnsp = json['product-state']['fnsp']
        const rotationSpeed = fnsp === 'AUTO' ? 'AUTO' : parseInt(fnsp, 10)
        resolve(rotationSpeed)
      })
      this._requestCurrentState()
    })
  }

  getAutoOnStatus () {
    return new Promise((resolve, reject) => {
      this.once('state', (json) => {
        const isOn = (json['product-state']['auto'] === 'ON')
        resolve(isOn)
      })
      this._requestCurrentState()
    })
  }

  getRotationStatus () {
    return new Promise((resolve, reject) => {
      this.once('state', (json) => {
        const oson = json['product-state']['oson']
        const isOn = (oson === 'ON')
        resolve(isOn)
      })
      this._requestCurrentState()
    })
  }

  turnOff () {
    return this.setFan(false)
  }

  turnOn () {
    return this.setFan(true)
  }

  setFan (value) {
    const now = new Date()
    const fmod = value ? 'FAN' : 'OFF'
    const message = JSON.stringify({
      msg: 'STATE-SET',
      time: now.toISOString(),
      data: { fmod }
    })

    this.client.publish(
      this._getCommandTopic(),
      message
    )

    return this.getFanStatus()
  }

  setFanSpeed (value) {
    const now = new Date()
    const fnsp = Math.round(value / 10)
    const message = JSON.stringify({
      msg: 'STATE-SET',
      time: now.toISOString(),
      data: {
        fnsp
      }
    })
    this.client.publish(
      this._getCommandTopic(),
      message
    )

    return this.getFanSpeed()
  }

  setAuto (value) {
    const now = new Date()
    const fmod = value ? 'AUTO' : 'OFF'
    const message = JSON.stringify({
      msg: 'STATE-SET',
      time: now.toISOString(),
      data: {
        fmod
      }
    })
    this.client.publish(
      this._getCommandTopic(),
      message
    )

    return this.getAutoOnStatus()
  }

  setRotation (value) {
    const now = new Date()
    const oson = value ? 'ON' : 'OFF'
    const message = JSON.stringify({
      msg: 'STATE-SET',
      time: now.toISOString(),
      data: {
        oson
      }
    })
    this.client.publish(
      this._getCommandTopic(),
      message
    )

    return this.getRotationStatus()
  }

  _connect () {
    this.options = {
      keepalive: 10,
      clientId: 'dyson_' + Math.random().toString(16),
      // protocolId: 'MQTT',
      // protocolVersion: 4,
      clean: true,
      reconnectPeriod: 1000,
      connectTimeout: 30 * 1000,
      username: this.username,
      password: this.password,
      rejectUnauthorized: false
    }

    if (this._MQTTPrefix === '438' || this._MQTTPrefix === '520') {
      this.options.protocolVersion = 3
      this.options.protocolId = 'MQIsdp'
    }

    debug(`MQTT (${this._MQTTPrefix}): connecting to ${this.url}`)

    this.client = mqtt.connect(this.url, this.options)

    this.client.on('connect', () => {
      debug(`MQTT: connected to ${this.url}`)
      this.client.subscribe(this._getCurrentStatusTopic())
    })

    this.client.on('message', (topic, message) => {
      let json = JSON.parse(message)
      debug(`MQTT: got message ${message}`)

      if (json !== null) {
        if (json.msg === 'ENVIRONMENTAL-CURRENT-SENSOR-DATA') {
          this.emit('sensor', json)
        }
        if (json.msg === 'CURRENT-STATE') {
          this.emit('state', json)
        }
      }
    })
  }

  _decryptCredentials () {
    var decrypted = JSON.parse(decrypt(this._deviceInfo.LocalCredentials))
    this.password = decrypted.apPasswordHash
    this.username = decrypted.serial
  }

  _requestCurrentState () {
    this.client.publish(this._getCommandTopic(), JSON.stringify({
      msg: 'REQUEST-CURRENT-STATE',
      time: new Date().toISOString()
    }))
  }

  _getCurrentStatusTopic () {
    return `${this._MQTTPrefix}/${this.username}/status/current`
  }

  _getCommandTopic () {
    return `${this._MQTTPrefix}/${this.username}/command`
  }
}

module.exports = Device
