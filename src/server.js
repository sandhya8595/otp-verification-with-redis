import express from "express";
import Redis from "ioredis";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";
import sgMail from "@sendgrid/mail";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file automatically (checks project root first, then src/)
try {
  if (typeof process.loadEnvFile === 'function') {
    const rootEnv = path.resolve(__dirname, "../.env");
    const srcEnv = path.resolve(__dirname, ".env");
    if (fs.existsSync(rootEnv)) {
      process.loadEnvFile(rootEnv);
      console.log("✅ Loaded .env from project root:", rootEnv);
    } else if (fs.existsSync(srcEnv)) {
      process.loadEnvFile(srcEnv);
      console.log("✅ Loaded .env from src/:", srcEnv);
    }
  }
} catch (e) { console.warn("⚠️ .env load error:", e.message); }

const app = express();
app.use(express.json()); // express middleware

// Serve static UI from src/public/
app.get("/favicon.ico", (req, res) => res.status(204).end());
app.use(express.static(path.join(__dirname, "public")));

const redis = new Redis("redis://localhost:6379");

// ── Redis key helpers ──
function otpKey(email)       { return `otp:${email}`; }
function rateLimitKey(email) { return `ratelimit:${email}`; }
function attemptsKey(email)  { return `attempts:${email}`; }
function lockedKey(email)    { return `locked:${email}`; }

// ── Real Email Gateway Sender (SendGrid) ──
async function sendEmail({ email, otp, providerConfig }) {
  let provider = (providerConfig && providerConfig.provider) || 'none';
  if (provider === 'none' && process.env.EMAIL_PROVIDER === 'sendgrid') {
    provider = 'sendgrid';
  }

  const sgKey = (providerConfig && providerConfig.sendgridKey) || process.env.SENDGRID_API_KEY;
  const sgFrom = (providerConfig && providerConfig.sendgridFrom) || process.env.SENDGRID_FROM_EMAIL;

  if (provider === 'none' || !provider || provider === 'demo') {
    return { sent: false, provider: 'demo', reason: 'No real email gateway configured' };
  }

  if (provider === 'sendgrid') {
    if (!sgKey || !sgFrom) {
      throw new Error("SendGrid API Key or From Email is missing. Please add them in UI settings or .env.");
    }

    sgMail.setApiKey(sgKey);

    const msg = {
      to: email,
      from: sgFrom,
      subject: 'Your OTP Verification Code',
      text: `Your OTP verification code is ${otp}. Valid for 30 seconds. Do not share.`,
      html: `<strong>Your OTP verification code is ${otp}.</strong><br/>Valid for 30 seconds. Do not share.`
    };

    console.log(`\n📤 [SendGrid] Sending email to: ${email}`);
    
    try {
      await sgMail.send(msg);
      console.log(`\n📩 [SendGrid Response]: Email sent successfully to ${email}`);
      return { sent: true, provider: 'sendgrid', message: 'Email sent via SendGrid' };
    } catch (error) {
      const errMsg = error.response ? JSON.stringify(error.response.body.errors) : error.message;
      throw new Error(`SendGrid API error: ${errMsg}`);
    }
  }

  return { sent: false, provider: 'demo' };
}

// ── POST /otp — Generate & store OTP with rate limiting and send to verification email ──
app.post("/otp", async (req, res) => {
  const { email, verificationEmail, providerConfig } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });
  if (!verificationEmail) return res.status(400).json({ message: "Verification email is required" });

  // Check if user email is locked due to too many failed verifications
  const locked = await redis.get(lockedKey(email));
  if (locked) {
    const ttl = await redis.ttl(lockedKey(email));
    return res.status(403).json({ message: `Too many failed attempts. Try again in ${ttl}s.`, lockedFor: ttl });
  }

  // Rate limiting: max 3 OTP requests per email per 5 minutes
  const requests = await redis.incr(rateLimitKey(email));
  if (requests === 1) {
    await redis.expire(rateLimitKey(email), 300); // 5‑minute sliding window
  }
  if (requests > 3) {
    const ttl = await redis.ttl(rateLimitKey(email));
    return res.status(429).json({ message: `Too many OTP requests. Try again in ${ttl}s.`, retryAfter: ttl });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  await redis.set(otpKey(email), otp, "EX", 30); // OTP valid for 30 seconds

  // Reset attempt counter whenever a fresh OTP is issued
  await redis.del(attemptsKey(email));

  let emailResult = { sent: false, provider: 'demo' };
  let emailError = null;

  try {
    emailResult = await sendEmail({ email: verificationEmail, otp, providerConfig });
    console.log(`\n📧 [REAL EMAIL RESULT] Provider: ${emailResult.provider} | Sent: ${emailResult.sent} | Email: ${verificationEmail}\n`);
  } catch (err) {
    emailError = err.message;
    console.error(`\n❌ [REAL EMAIL GATEWAY ERROR] ${err.message}\n`);
  }

  console.log(`📧 [Email Simulation Fallback] Verification Email: ${verificationEmail} | OTP for ${email}: ${otp} | Valid: 30s`);

  res.json({
    message: emailResult.sent ? `Real Email sent to ${verificationEmail} via ${emailResult.provider}!` : "OTP generated successfully",
    requestsUsed: requests,
    requestsLeft: 3 - requests,
    verificationEmail,
    otp, // Included for simulated Email display
    emailResult,
    emailError
  });
});

// ── POST /otp/reset-limit — Dev helper to clear rate limit & lockouts ──
app.post("/otp/reset-limit", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });
  await redis.del(rateLimitKey(email));
  await redis.del(lockedKey(email));
  await redis.del(attemptsKey(email));
  await redis.del(otpKey(email));
  res.json({ message: "Rate limit & lockouts reset successfully for " + email });
});

// ── POST /otp/verify — Verify OTP with attempt tracking & lockout ──
app.post("/otp/verify", async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: "Email and OTP are required" });

  // Check lockout
  const locked = await redis.get(lockedKey(email));
  if (locked) {
    const ttl = await redis.ttl(lockedKey(email));
    return res.status(403).json({ message: `Account locked. Try again in ${ttl}s.`, lockedFor: ttl });
  }

  const savedOtp = await redis.get(otpKey(email));

  // OTP not found or expired
  if (!savedOtp) {
    return res.status(400).json({ message: "OTP expired or not found. Request a new one." });
  }

  // Wrong OTP — track attempt
  if (savedOtp !== otp) {
    const attempts = await redis.incr(attemptsKey(email));
    if (attempts === 1) await redis.expire(attemptsKey(email), 300);

    const attemptsLeft = 3 - attempts;

    if (attemptsLeft <= 0) {
      // Lock for 2 minutes, clean up OTP
      await redis.set(lockedKey(email), "1", "EX", 120);
      await redis.del(otpKey(email));
      await redis.del(attemptsKey(email));
      return res.status(403).json({
        message: "Too many failed attempts. Locked for 2 minutes.",
        lockedFor: 120,
        attemptsLeft: 0,
      });
    }

    return res.status(400).json({
      message: `Invalid OTP. ${attemptsLeft} attempt${attemptsLeft === 1 ? "" : "s"} left.`,
      attemptsLeft,
    });
  }

  // ✅ OTP correct — clean up all keys
  await redis.del(otpKey(email));
  await redis.del(attemptsKey(email));

  res.json({ message: "OTP verified successfully" });
});

// ── GET /otp/:email/ttl — OTP time-to-live ──
app.get("/otp/:email/ttl", async (req, res) => {
  const ttl = await redis.ttl(otpKey(req.params.email));
  res.json({ ttl });
});

// ── GET /otp/:email/status — Full Redis debug status ──
app.get("/otp/:email/status", async (req, res) => {
  const email = req.params.email;
  const [savedOtp, otpTtl, attempts, lockedTtl, rateCount, rateTtl] = await Promise.all([
    redis.get(otpKey(email)),
    redis.ttl(otpKey(email)),
    redis.get(attemptsKey(email)),
    redis.ttl(lockedKey(email)),
    redis.get(rateLimitKey(email)),
    redis.ttl(rateLimitKey(email)),
  ]);
  res.json({
    activeOtp: savedOtp || null,
    otpTtl,
    attempts: parseInt(attempts) || 0,
    attemptsLeft: Math.max(0, 3 - (parseInt(attempts) || 0)),
    isLocked: lockedTtl > 0,
    lockedFor: lockedTtl > 0 ? lockedTtl : 0,
    rateRequestsUsed: parseInt(rateCount) || 0,
    rateRequestsLeft: Math.max(0, 3 - (parseInt(rateCount) || 0)),
    rateWindowTtl: rateTtl > 0 ? rateTtl : 0,
  });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
