const express = require("express");
const router = express.Router();
const verifyToken = require("../midleware/verifyToken.js");
const moment = require("moment");

// ✅ Mark attendance for a single student
router.post("/mark", verifyToken, async (req, res) => {
  const supabase = req.supabase;

  if (!["admin", "teacher"].includes(req.user.role)) {
    return res.status(403).json({ error: "Only admin or teachers can mark attendance" });
  }

  const student_id = req.body.student_id || req.body.studentId;
  const { date, status } = req.body;

  if (!student_id || !date || !status) {
    return res.status(400).json({ error: "Missing fields" });
  }

  if (!["Present", "Absent"].includes(status)) {
    return res.status(400).json({ error: "Invalid attendance status" });
  }

  const formattedDate = moment(date).format("YYYY-MM-DD");
  const today = moment().format("YYYY-MM-DD");

  if (formattedDate !== today) {
    return res.status(400).json({ error: "You can only mark attendance for today" });
  }

  try {
    // Upsert logic using Supabase
    const { data, error } = await supabase
      .from("attendance")
      .upsert({ student_id, date: formattedDate, status }, { onConflict: ["student_id", "date"] })
      .select("*")
      .single();

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("Attendance marking failed:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Batch Mark Attendance
router.post("/batch-mark", verifyToken, async (req, res) => {
  const supabase = req.supabase;

  if (!["admin", "teacher"].includes(req.user.role)) {
    return res.status(403).json({ error: "Only admin or teachers can mark attendance" });
  }

  const { date, records } = req.body;

  if (!date || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: "Missing date or records" });
  }

  const formattedDate = moment(date).format("YYYY-MM-DD");
  const today = moment().format("YYYY-MM-DD");

  if (formattedDate !== today) {
    return res.status(400).json({ error: "You can only mark attendance for today" });
  }

  try {
    const batch = records.map(({ student_id, status }) => {
      if (!student_id || !["Present", "Absent"].includes(status)) {
        throw new Error("Invalid student_id or status");
      }
      return { student_id, date: formattedDate, status };
    });

    const { error } = await supabase
      .from("attendance")
      .upsert(batch, { onConflict: ["student_id", "date"] });

    if (error) throw error;

    res.json({ message: "Attendance marked for all students" });
  } catch (err) {
    console.error("Batch attendance failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// ✅ Get Attendance of a Student
router.get("/:student_id", verifyToken, async (req, res) => {
  const supabase = req.supabase;
  const studentId = req.params.student_id;

  try {
    if (req.user.role === "parent") {
      const { data: student, error: checkError } = await supabase
        .from("students")
        .select("id")
        .eq("id", studentId)
        .eq("parent_id", req.user.id)
        .maybeSingle();

      if (checkError) throw checkError;
      if (!student) {
        return res.status(403).json({ error: "Not authorized to view this student's attendance" });
      }
    }

    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("student_id", studentId);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ Get Attendance by Date
router.get("/date/:date", verifyToken, async (req, res) => {
  const supabase = req.supabase;
  const { date } = req.params;

  try {
    if (req.user.role === "parent") {
      const { data, error } = await supabase
        .from("attendance")
        .select("*, students!inner(id, parent_id)")
        .eq("date", date)
        .eq("students.parent_id", req.user.id);

      if (error) throw error;
      return res.json(data);
    }

    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("date", date);

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
