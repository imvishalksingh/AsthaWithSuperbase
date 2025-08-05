// middleware/superbase.js
const supabase = require("../services/superbaseClient");

module.exports = (req, res, next) => {
  req.supabase = supabase;
  next();
};
