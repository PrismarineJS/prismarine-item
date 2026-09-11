# Component fixtures

`components.json` contains decoded inventory slots received from unmodified
vanilla servers. These are server responses, not the objects sent by the client.

For each version, a server command created a sword with `max_damage=100` and
`damage=25`. The client edited damage to 40, set a name and lore, and set repair
cost to 7 using Item setters, then sent a creative inventory update. The server
copied its stored item to the offhand and sent the `edited` slot. The client then
removed damage, maximum damage, name and lore; the server repeated the copy to
produce the `removed` slot.

On 1.21.5+, the test harness encodes each component payload into the ByteArray
required by `UntrustedSlot` using minecraft-protocol's codec. `Item.toNotch`
returns the ordinary decoded `Slot` representation, not that packet-specific
ByteArray wrapper. The captures below verify the component values accepted
by the server after that encoding step.

Server JAR SHA-1 values (verified against Mojang's release metadata):

- 1.20.6: `145ff0858209bcfc164859ba735d4199aafa1eea`
- 1.21.11: `64bb6d763bed0a9f1d632ec347938594144943ed`
- 26.1: `3872a7f07a1a595e651aef8b058dfc2bb3772f46`

Captured using Node 24.15.0, Temurin Java 25.0.4, offline local servers bound to
127.0.0.1, and minecraft-protocol's packet decoder. No authentication data or
generated worlds are included.
