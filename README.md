# 🔐 OTP Verification System

A secure and lightweight **OTP (One-Time Password) Verification System** built using **Node.js, Express.js, Redis, and SendGrid**. The application generates temporary OTPs, stores them securely in Redis with an expiration time, and sends them to users via email using SendGrid.

## 🚀 Features

* Generate a random OTP for user verification
* Store OTPs temporarily in **Redis**
* Automatic OTP expiration using Redis TTL
* Send OTPs through **SendGrid**
* Verify user-entered OTP
* RESTful API endpoints
* Environment-based configuration for sensitive credentials
* Simple and easy-to-integrate backend structure

## 🛠️ Tech Stack

* **Node.js** – Backend runtime
* **Express.js** – REST API framework
* **Redis** – Temporary OTP storage and expiration
* **SendGrid** – Email delivery service
* **JavaScript** – Application logic
* **REST API** – Client-server communication

## 🔄 How It Works

```text
User requests OTP
       ↓
Server generates OTP
       ↓
OTP stored in Redis with TTL
       ↓
SendGrid sends OTP via email
       ↓
User enters OTP
       ↓
Server retrieves OTP from Redis
       ↓
OTP verified
       ↓
Success / Invalid / Expired response
```

## 📌 API Endpoints

### Generate OTP

**POST** `/otp`

Generates an OTP, stores it in Redis with a limited expiration time, and sends it to the user's email.

### Verify OTP

**POST** `/otp/verify`

Verifies the OTP entered by the user against the OTP stored in Redis.

## ⚙️ Environment Variables

Create a `.env` file in the project root:

```env
PORT=3000
REDIS_URL=your_redis_url
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=your_verified_sender_email
```

> Never commit your `.env` file or API keys to GitHub.

## ▶️ Installation & Setup

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd otp-verification-with-redis
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file and add your Redis and SendGrid credentials.

### 4. Start the application

```bash
npm run dev
```

The API will run on:

```text
http://localhost:3000
```

## 🎯 Learning Outcomes

Through this project, I practiced:

* Working with **Redis for temporary data storage**
* Implementing **TTL-based OTP expiration**
* Integrating a third-party email service using **SendGrid**
* Building REST APIs with **Express.js**
* Managing environment variables and API credentials
* Designing a basic authentication/verification workflow

## 🔒 Security Considerations

* OTPs are stored temporarily and automatically expire.
* Sensitive credentials are managed using environment variables.
* OTP verification is performed on the server side.
* API keys should never be exposed in the source code.


Built as a backend project to understand **Redis, OTP workflows, REST APIs, and third-party service integration**.
