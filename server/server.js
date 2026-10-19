require("dotenv").config();

const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

const { generateActivities } = require("./gemini");

const app = express();

app.use(cors());
app.use(express.json());

const {
  SMTP_HOST = "smtp.gmail.com",
  SMTP_PORT = 587,
  SMTP_USER,
  SMTP_PASS,
  TO,
  CC,
  GEMINI_API_KEY,
  GEMINI_MODEL,
} = process.env;

// ======================================
// Nodemailer Transport
// ======================================

// SMTP is enabled based on the flag below. Ensure SMTP_* env vars are set.
const SMTP_ENABLED = true;

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: false,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

transporter.verify((err) => {
  if (err) {
    console.error("❌ SMTP Connection Failed");
    console.error(err.message);
  } else {
    console.log("✅ SMTP Connected Successfully");
  }
});

// ======================================
// History File
// ======================================

const historyDir = path.join(__dirname, "history");
const historyFile = path.join(historyDir, "reports.json");

// Create folder if missing
if (!fs.existsSync(historyDir)) {
  fs.mkdirSync(historyDir);
}

// Create file if missing
if (!fs.existsSync(historyFile)) {
  fs.writeFileSync(historyFile, "[]");
}

// ======================================
// Read History
// ======================================

function getHistory() {
  try {
    const content = fs.readFileSync(historyFile, "utf8").trim();

    if (!content) return [];

    return JSON.parse(content);
  } catch (err) {
    return [];
  }
}

// ======================================
// Save Report
// ======================================

function saveReport(report) {
  const history = getHistory();

  history.unshift({
    id: Date.now(),
    ...report,
  });

  fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
}

// ======================================
// Allow only one email per day
// ======================================

function hasSentToday() {
  const history = getHistory();

  const today = new Date().toLocaleDateString("en-GB");

  return history.some((item) => item.date === today);
}

// ======================================
// Send Email
// ======================================

app.post("/send-email", async (req, res) => {
  try {
    const {
      subject,
      body,
      project,
      activities,
    } = req.body;

    // Prevent multiple emails in one day

    if (hasSentToday()) {
      return res.status(409).json({
        success: false,
        message: "Status report has already been sent today.",
      });
    }

    const mailOptions = {
      from: SMTP_USER,
      to: TO,
      cc: CC || undefined,
      subject,
      text: body,
    };

    let info = { messageId: null };
    if (SMTP_ENABLED) {
      // when enabled, actually send the email
      info = await transporter.sendMail(mailOptions);
    } else {
      console.log("SMTP disabled — skipping actual send. Saving report only.");
    }

    saveReport({
      date: new Date().toLocaleDateString("en-GB"),
      project,
      subject,
      activities,
      body,
      messageId: info ? info.messageId : null,
      sentAt: new Date().toISOString(),
    });

    console.log("==================================");
    console.log("✅ Email Sent Successfully");
    console.log("Project :", project);
    console.log("Message :", info.messageId);
    console.log("==================================");

    res.status(200).json({
      success: true,
      message: "Email sent successfully.",
      messageId: info.messageId,
    });

  } catch (error) {
    console.error("❌ Send Failed");
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// ======================================
// Generate Activities (Gemini)
// ======================================

app.post("/generate-activities", async (req, res) => {
  try {
    const { project, notes, count, examples } = req.body;

    if (!project) {
      return res.status(400).json({
        success: false,
        message: "Please select a project first.",
      });
    }

    if (!GEMINI_API_KEY) {
      return res.status(503).json({
        success: false,
        message: "AI generation is not configured. Add GEMINI_API_KEY to the server .env file.",
      });
    }

    const result = await generateActivities({
      project,
      notes,
      count,
      examples,
      apiKey: GEMINI_API_KEY,
      // A single GEMINI_MODEL in .env overrides the built-in fallback list.
      models: GEMINI_MODEL ? [GEMINI_MODEL] : undefined,
    });

    console.log(
      `✨ Gemini ${result.mode} → ${result.activities.length} activities (${result.model})`
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("❌ Gemini generation failed");
    console.error(error.message);

    res.status(502).json({
      success: false,
      message: error.message,
    });
  }
});

// ======================================
// Get History
// ======================================

app.get("/history", (req, res) => {
  try {
    res.json(getHistory());
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

// ======================================
// Health Check
// ======================================

app.get("/", (req, res) => {
  res.send("Daily Status Reporter Backend Running 🚀");
});

// ======================================
// Start Server
// ======================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("----------------------------------");
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📧 Email API : http://localhost:${PORT}/send-email`);
  console.log(`📜 History API : http://localhost:${PORT}/history`);
  console.log(`✨ AI API : http://localhost:${PORT}/generate-activities`);
  console.log(`   Gemini : ${GEMINI_API_KEY ? "configured" : "MISSING GEMINI_API_KEY"}`);
  console.log("----------------------------------");
});