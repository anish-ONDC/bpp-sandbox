// Checks a piece of data against a named schema, pulled straight out of a
// real spec file (beckn2.yaml or beckn3.yaml) — the whole file gets loaded
// so internal references (Catalog -> Resource, Offer, ...) resolve
// correctly, nothing gets copied out or trimmed down.
const fs = require("fs");
const yaml = require("js-yaml");
const Ajv = require("ajv");
const addFormats = require("ajv-formats");

function loadValidator(specPath, schemaName) {
  const doc = yaml.load(fs.readFileSync(specPath, "utf-8"));
  const ajv = new Ajv({ strict: false, allErrors: true });
  addFormats(ajv);

  ajv.addSchema(doc, "spec");
  return ajv.compile({ $ref: `spec#/components/schemas/${schemaName}` });
}

function check(specPath, schemaName, data) {
  const validate = loadValidator(specPath, schemaName);
  const valid = validate(data);
  return { valid, errors: validate.errors };
}

module.exports = { loadValidator, check };
