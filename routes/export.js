const express = require("express");
const { Parser } = require("json2csv");
const router = express.Router();

// 🔁 Reusable export function
const exportToCSV = async (res, supabase, tableName, fileName) => {
  try {
    const { data, error } = await supabase.from(tableName).select("*");
    if (error) throw error;

    const parser = new Parser();
    const csv = parser.parse(data);

    res.header("Content-Type", "text/csv");
    res.attachment(fileName);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

router.get("/students", async (req, res) => {
  await exportToCSV(res, req.supabase, "students", "students_export.csv");
});

router.get("/attendance", async (req, res) => {
  await exportToCSV(res, req.supabase, "attendance", "attendance_export.csv");
});

router.get("/fees", async (req, res) => {
  await exportToCSV(res, req.supabase, "fees", "fees_export.csv");
});

router.get("/results", async (req, res) => {
  await exportToCSV(res, req.supabase, "results", "results_export.csv");
});

module.exports = router;
