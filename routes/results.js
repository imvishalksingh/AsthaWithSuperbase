const express = require("express");
const router = express.Router();

router.get("/report-pdf/:student_id", async (req, res) => {
  const supabase = req.supabase;
  const { student_id } = req.params;

  try {
    // 1️⃣ Fetch student info
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select("name, class")
      .eq("id", student_id)
      .single();

    if (studentError) throw studentError;
    if (!student) return res.status(404).json({ error: "Student not found" });

    // 2️⃣ Fetch results grouped by exam
    const { data: results, error: resultError } = await supabase
      .from("results")
      .select("exam, subject, marks, totalmarks, grade")
      .eq("student_id", student_id)
      .order("exam", { ascending: true })
      .order("subject", { ascending: true });

    if (resultError) throw resultError;
    if (!results.length) return res.status(404).json({ error: "No results found" });

    // 🔁 Group results by exam
    const groupedExams = {};
    results.forEach((r) => {
      if (!groupedExams[r.exam]) groupedExams[r.exam] = [];
      groupedExams[r.exam].push(r);
    });

    // 3️⃣ Create PDF
    const doc = new PDFDocument({ margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="report-card-${student_id}.pdf"`
    );
    doc.pipe(res);

    // Header
    doc.fontSize(20).text("Student Report Card", { align: "center" });
    doc.moveDown();
    doc.fontSize(14).text(`Name: ${student.name}`);
    doc.text(`Class: ${student.class}`);
    doc.text(`Student ID: ${student_id}`);
    doc.moveDown();

    // Loop each exam
    Object.entries(groupedExams).forEach(([exam, entries]) => {
      doc.moveDown().fontSize(16).text(`${exam}`, { underline: true });
      doc.fontSize(12).text("Subject", 50, doc.y + 10);
      doc.text("Marks", 250, doc.y);
      doc.text("Total", 320, doc.y);
      doc.text("Grade", 390, doc.y);
      doc.moveDown();

      let totalObtained = 0;
      let totalMarks = 0;

      entries.forEach((r) => {
        doc.text(r.subject, 50, doc.y);
        doc.text(`${r.marks}`, 250, doc.y);
        doc.text(`${r.totalmarks}`, 320, doc.y);
        doc.text(`${r.grade}`, 390, doc.y);
        doc.moveDown();

        totalObtained += r.marks;
        totalMarks += r.totalmarks;
      });

      const percentage = ((totalObtained / totalMarks) * 100).toFixed(2);
      const finalGrade =
        percentage >= 90
          ? "A+"
          : percentage >= 80
          ? "A"
          : percentage >= 70
          ? "B+"
          : percentage >= 60
          ? "B"
          : percentage >= 50
          ? "C"
          : "F";

      doc.moveDown();
      doc.fontSize(12).text(`Total: ${totalObtained} / ${totalMarks}`);
      doc.text(`Percentage: ${percentage}%`);
      doc.text(`Final Grade: ${finalGrade}`);
      doc.moveDown();
    });

    doc.end();
  } catch (err) {
    console.error("Error generating PDF:", err);
    res.status(500).json({ error: "Failed to generate report card" });
  }
});

// ✅ Add Multiple Results (One Transaction)
router.post("/add-multiple", async (req, res) => {
  const supabase = req.supabase;
  const { student_id, exam, subjects } = req.body;

  if (!student_id || !exam || !Array.isArray(subjects) || subjects.length === 0) {
    return res.status(400).json({ error: "Invalid request data" });
  }

  try {
    const insertData = subjects.map((subj) => ({
      student_id,
      subject: subj.subject,
      marks: subj.marks,
      totalmarks: subj.totalMarks,
      grade: subj.grade,
      exam,
    }));

    const { data, error } = await supabase
      .from("results")
      .insert(insertData)
      .select("*");

    if (error) throw error;

    res.json({ message: "Results added successfully", results: data });
  } catch (err) {
    console.error("Error adding multiple results:", err);
    res.status(500).json({ error: "Failed to add results" });
  }
});

// ✅ Get Grouped Results for Report Card
router.get("/report/:student_id", async (req, res) => {
  const supabase = req.supabase;
  const { student_id } = req.params;

  try {
    const { data, error } = await supabase
      .from("results")
      .select("exam, subject, marks, totalmarks, grade")
      .eq("student_id", student_id)
      .order("exam", { ascending: true })
      .order("subject", { ascending: true });

    if (error) throw error;
    if (!data.length) {
      return res.status(404).json({ error: "No results found" });
    }

    const grouped = {};
    data.forEach((r) => {
      if (!grouped[r.exam]) grouped[r.exam] = [];
      grouped[r.exam].push(r);
    });

    res.json({ student_id, exams: grouped });
  } catch (err) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Raw results
router.get("/:student_id", async (req, res) => {
  const supabase = req.supabase;

  try {
    const { data, error } = await supabase
      .from("results")
      .select("*")
      .eq("student_id", req.params.student_id);

    if (error) throw error;

    res.json(data);
  } catch (err) {
    console.error("Error fetching student results:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ✅ Aggregated Results
router.get("/", async (req, res) => {
  const supabase = req.supabase;

  try {
    const { data, error } = await supabase.rpc("get_aggregated_results");

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Error fetching aggregated results:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
