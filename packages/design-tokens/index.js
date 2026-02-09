const tokens = require("./tokens.json");

const colors = tokens.colors;
const radius = tokens.radius;
const typography = tokens.typography;

const out = {
  colors,
  radius,
  typography,
  ...colors,
  ...radius,
  ...typography,
};
module.exports = out;
module.exports.default = out;
