# Verona Schemer 3.2.0 contract fixtures

These are local, unchanged schema snapshots for browser message validation:

- `schemer-3.2.0.json` is the complete AsyncAPI YAML document converted to JSON from
  [Schemer tag 3.2.0](https://github.com/verona-interfaces/schemer/blob/86cb276b7eebc42331390cc43c18369ef8695a19/schemerapi.yaml).
- `variable-info-1.3.json` is the referenced JSON Schema from
  [Variable Info tag 1.3](https://github.com/verona-interfaces/variable-info/blob/3a9519162642afc9dee0de2d10ee39e24e12200c/variable-info.schema.json).

Both sources are published under CC0-1.0. The original external variable-schema
URL is registered with Ajv locally, so the tests do not fetch schemas at runtime.
The `date-time` format is validated by `ajv-formats`. The API's `byte` annotation
is accepted as a serialized string, matching its plain XML example and the
Studio protocol's JSON strings; it is not treated as a base64 requirement.

`studio-start-command.json` contains synthetic unit data serialized by the real
Studio `UnitSchemerComponent.postStore` method at
[`5dad1592`](https://github.com/iqb-berlin/studio-lite/blob/5dad15920d9f894dd13012b2d66c1f84ab73c9a4/apps/frontend/src/app/modules/workspace/components/unit-schemer/unit-schemer.component.ts).
It includes Studio's `role`, `definitionReportPolicy` and `sharedParameters`
extensions. No real unit data or credentials are included.

The tests exercise the existing Studio exchange: ready notification, a start
with variables/role/scheme, edits returned under the same session, later unit
updates and read-only roles. They also check the API's optional start fields and
the rule that missing or empty session IDs must not be processed. Packed-HTML
runs additionally check the metadata actually delivered to the host.
