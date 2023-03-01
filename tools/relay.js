process.env.DEBUG = process.argv.includes("--debug") && "minecraft-protocol";

const { Relay } = require("bedrock-protocol");

const relay = new Relay({
    host: "0.0.0.0",
    port: 19130,
    offline: false,
    destination: {
        host: "127.0.0.1",
        port: 19132,
        offline: true,
    },
});

relay.listen();

relay.on("join", (player) => {
    console.log("Player %s joined.", player.getUserData().displayName);

    player.on("clientbound", ({ name, params }) => {
        if (name === "start_game") {
            console.dir(params.itemstates[0], { depth: null });
            console.dir(params.itemstates.find((x) => x.name === "minecraft:iron_shovel"));
            console.dir(params.itemstates.find((x) => x.name.includes("spawn_egg")));
        }
        if (name === "inventory_content") {
            console.dir({ ...params, input: params.input.filter((x) => x.network_id !== 0) }, { depth: null });
        }
    });

    player.on("serverbound", ({ name, params }) => {});
});
