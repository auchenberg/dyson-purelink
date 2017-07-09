var request = require('request-promise-native');
var crypto = require('crypto');

class DysonCloud {

    constructor() {
        this.api = 'https://api.cp.dyson.com'
        this.auth = {}
    }

    authenticate(email, password) {
        var options = {
            url: `${this.api}/v1/userregistration/authenticate`,
            method: 'post',
            body: {
                Email: email,
                Password: password
            },
            agentOptions: {
                rejectUnauthorized: false
            },
            json: true
        }

        return request(options).then(info => {
            this.auth = {
                account: info.Account,
                password: info.Password
            }
            return this.auth
        })
    }

    logout() {
        this.auth = {}
    }

    getCloudDevices() {
        var options = {
            url: `${this.api}/v1/provisioningservice/manifest`,
            method: 'get',
            auth: {
                username: this.auth.account,
                password: this.auth.password,
            },
            agentOptions: {
                rejectUnauthorized: false
            },
            json: true
        }

        return request(options);
    }

};

module.exports = DysonCloud;