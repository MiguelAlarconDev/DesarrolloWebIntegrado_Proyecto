const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// Execute the recovered HTTP handlers with a fake SDK, never Chromium/WhatsApp.
function fixture(sendMessage = async () => {}) {
    const routes = {}, events = {}, logs = [];
    const app = { use() {}, get: (p, f) => routes[p] = f,
        post: (p, f) => routes[p] = f, listen() {} };
    const express = () => app;
    express.json = () => {};
    class Client {
        on(name, fn) { events[name] = fn; }
        initialize() {}
        sendMessage(...args) { return sendMessage(...args); }
    }
    const dependencies = { express, 'whatsapp-web.js': { Client, LocalAuth: class {} },
        'qrcode-terminal': { generate() {} }, dotenv: { config() {} } };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/index.js'), 'utf8'), {
        require: name => dependencies[name], process: { env: {} },
        console: { log: (...args) => logs.push(args.join(' ')), error: (...args) => logs.push(args.join(' ')) }
    });
    async function send(body) {
        const response = { code: 200, status(code) { this.code = code; return this; },
            json(body) { this.body = body; return this; } };
        await routes['/api/whatsapp/send']({ body }, response);
        return response;
    }
    return { send, events, logs };
}

test('offline returns 503 without invoking provider', async () => {
    const f = fixture(() => assert.fail('Must not send'));
    const result = await f.send({ phone: '51999999999', message: 'test' });
    assert.equal(result.code, 503);
    assert.equal(result.body.success, false);
});

test('success only after SDK resolves, normalized international phone', async () => {
    let calls = 0;
    const f = fixture(async (phone, message) => {
        calls++; assert.equal(phone, '51999999999@c.us'); assert.equal(message, 'test');
    });
    f.events.ready();
    const result = await f.send({ phone: '+51 999999999', message: 'test' });
    assert.equal(result.body.success, true);
    assert.equal(calls, 1);
});

test('provider failure never exposes OTP in logs or response', async () => {
    const f = fixture(async () => { throw new Error('OTP 123456'); });
    f.events.ready();
    const result = await f.send({ phone: '51999999999', message: 'OTP 123456' });
    assert.equal(result.code, 500);
    assert.equal(result.body.success, false);
    assert.doesNotMatch(JSON.stringify(result.body) + f.logs.join(), /123456/);
});

test('auth failure resets readiness and invalid bodies return 400', async () => {
    const f = fixture(); f.events.ready();
    assert.equal((await f.send({ phone: 123, message: 'test' })).code, 400);
    assert.equal((await f.send({ phone: 'abc', message: 'test' })).code, 400);
    f.events.auth_failure('private provider data');
    assert.equal((await f.send({ phone: '51999999999', message: 'test' })).code, 503);
});
