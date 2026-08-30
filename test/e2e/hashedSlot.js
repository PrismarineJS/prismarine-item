/* eslint-env mocha */

// Joins a real vanilla server, /give's each vector's item, then moves it with
// window_click claims built by Item.toHashedNotch. The server is the oracle:
// it resends any slot whose claimed hash doesn't match its own copy, so a
// quiet server means every hash was accepted. Needs java on the PATH. Run
// with `npm run e2e`; MC_VERSION=1.21.5 restricts the run to one version.

const expect = require('expect').default
const fs = require('fs')
const os = require('os')
const path = require('path')
const mc = require('minecraft-protocol')
const { WrapServer, LauncherDownload } = require('minecraft-wrap')
const vectors = require('../hashedSlot.vectors.json')

const USERNAME = 'e2e'
const PORT = 25585
const root = path.join(os.tmpdir(), 'prismarine-item-e2e')
// A hotbar slot no give reaches: each test gives one item into slot 36 and
// clears it, so this slot is always empty.
const SENTINEL_SLOT = 44

const versions = process.env.MC_VERSION ? [process.env.MC_VERSION] : Object.keys(vectors)

for (const version of versions) {
  describe(`vanilla ${version} accepts our window_click slot claims`, function () {
    this.timeout(30 * 1000)
    const registry = require('prismarine-registry')(version)
    const Item = require('prismarine-item')(registry)
    const jar = path.join(root, `vanilla-${version}.jar`)
    const server = new WrapServer(jar, path.join(root, `server-${version}`))
    let client
    let stateId = 0
    let resyncs = null // collects slot packets between a click and its round trip

    function nextPacket (names, test = () => true, what = names.join('/')) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => fail(new Error(`timed out waiting for ${what}`)), 10000)
        const onPacket = packet => { if (test(packet)) { cleanup(); resolve(packet) } }
        const onEnd = reason => fail(new Error(`disconnected waiting for ${what}: ${reason}`))
        const fail = err => { cleanup(); reject(err) }
        const cleanup = () => {
          clearTimeout(timer)
          client.removeListener('end', onEnd)
          for (const name of names) client.removeListener(name, onPacket)
        }
        for (const name of names) client.on(name, onPacket)
        client.on('end', onEnd)
      })
    }

    function click (slot, slotClaim, cursorClaim) {
      client.write('window_click', {
        windowId: 0,
        stateId,
        slot,
        mouseButton: 0,
        mode: 0,
        changedSlots: [{ location: slot, item: slotClaim }],
        cursorItem: cursorClaim
      })
    }

    // Clicks are processed in receipt order on the server's main thread, and
    // a claim the server rejects makes it resend the slot. So a click falsely
    // claiming the sentinel slot holds stone forces a resync of that slot,
    // and its arrival means any resync an earlier click caused is already
    // here -- while proving the server really is checking the hashes. A drag
    // end with no drag in progress moves nothing and leaves no drag state
    // behind, whatever the cursor holds; cursorClaim must be what the cursor
    // truly holds so only the sentinel slot mismatches.
    async function roundTrip (cursorClaim = null) {
      const echo = nextPacket(['set_slot'], packet => packet.slot === SENTINEL_SLOT, 'sentinel resync')
      client.write('window_click', {
        windowId: 0,
        stateId,
        slot: -999,
        mouseButton: 2,
        mode: 5,
        changedSlots: [{ location: SENTINEL_SLOT, item: { itemId: registry.itemsByName.stone.id, itemCount: 1, components: [], removeComponents: [] } }],
        cursorItem: cursorClaim
      })
      await echo
    }

    before(function (done) {
      this.timeout(10 * 60 * 1000)
      fs.mkdirSync(root, { recursive: true })
      new LauncherDownload(root, 'linux').getServer(version, jar).then(() => {
        server.deleteServerData(err => {
          if (err) return done(err)
          server.startServer({
            'server-port': PORT,
            'online-mode': 'false',
            'level-type': 'flat',
            difficulty: '0',
            'spawn-monsters': 'false',
            'spawn-animals': 'false',
            'spawn-npcs': 'false'
          }, err => {
            if (err) return done(err)
            client = mc.createClient({ host: '127.0.0.1', port: PORT, username: USERNAME, version, auth: 'offline' })
            client.on('error', err => console.error('client error:', err.message))
            client.on('position', packet => client.write('teleport_confirm', { teleportId: packet.teleportId }))
            client.on('set_slot', packet => { stateId = packet.stateId; if (packet.slot !== SENTINEL_SLOT) resyncs?.push(`set_slot ${packet.slot}`) })
            client.on('window_items', packet => { stateId = packet.stateId; resyncs?.push('window_items') })
            client.on('set_cursor_item', () => resyncs?.push('set_cursor_item'))
            nextPacket(['position'], () => true, 'spawn').then(() => done(), done)
          })
        })
      }, done)
    })

    after(function (done) {
      client?.end()
      server.stopServer(done)
    })

    afterEach(async () => {
      resyncs = null
      // Closing the inventory returns anything a failed claim left on the
      // cursor to a slot, where the clear can reach it. The console runs the
      // clear before the next test's give: stdin lines execute in order.
      client.write('close_window', { windowId: 0 })
      await roundTrip()
      server.writeServer(`clear ${USERNAME}\n`)
    })

    for (const vector of vectors[version]) {
      it(vector.give, async () => {
        server.writeServer(`give ${USERNAME} ${vector.give}\n`)
        const given = await nextPacket(['set_slot'], packet => packet.item.itemCount > 0, `give ${vector.give}`)
        const hashed = Item.toHashedNotch(Item.fromNotch(given.item))
        // Pick the item up, then put it back: each click claims what the slot
        // and cursor now hold, and the server checks both against its copy.
        for (const [slotClaim, cursorClaim] of [[null, hashed], [hashed, null]]) {
          resyncs = []
          click(given.slot, slotClaim, cursorClaim)
          await roundTrip(cursorClaim)
          expect(resyncs).toStrictEqual([])
          resyncs = null
        }
      })
    }
  })
}
