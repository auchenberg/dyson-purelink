var bonjour = require('bonjour')()
var DysonCloud = require('./dysonCloud')
var Device = require('./device')

class DysonPurelink {

    constructor(email, password) {
        this._email = email;
        this._password = password;
        
        this._networkDevices = new Map()
        this._dysonCloud = new DysonCloud()
        this._devices = new Map()

        this._findNetworkDevices();
    }

    getDevices() {
        return this._dysonCloud.authenticate(this._email, this._password).then(() => {
            return this._dysonCloud.getCloudDevices().then(cloudDevices => {
                
                // Create devices from cloudDevices
                cloudDevices.forEach(deviceInfo => {
                    var device = new Device(deviceInfo)

                    // Update devices with network info
                    if(this._networkDevices.has(device.serial)) {
                        var networkDevice = this._networkDevices.get(device.serial)
                        device.updateNetworkInfo(networkDevice)
                    }

                    this._devices.set(device.serial, device)
                })

                // return devices
                return Array.from(this._devices.values())
            })
        })
    }

    _findNetworkDevices() {
        bonjour.find({ type: 'dyson_mqtt' }, (service) => {
            var networkDevice = {
                name: service.name,
                ip:  service.addresses[0],
                port: service.port,
                serial: service.name.replace('475_', '')
            }

            // Update devices with network info or push to network collectio
            if(this._devices.has(networkDevice.serial)) {
                this._devices.get(networkDevice.serial).updateNetworkInfo(networkDevice)
            } else {
                this._networkDevices.set(networkDevice.serial, networkDevice) 
            }
        })
    }

}

module.exports = DysonPurelink