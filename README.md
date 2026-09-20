# 🔐 OTP Verification System

A secure and lightweight **OTP (One-Time Password) Verification System** built with **Node.js, Express.js, Redis, and SendGrid**.

The application generates temporary OTPs, stores them in Redis with an automatic expiration time, and sends them to users via email using SendGrid. Users can then verify the OTP through a REST API.

## 🚀 Features

* Generate random OTPs for user verification
* Store OTPs temporarily in Redis
* Automatic OTP expiration using Redis TTL
* Send OTPs via email using SendGrid
* Verify user-entered OTPs
* Handle invalid and expired OTPs
* RESTful API architecture
* Environment-based configuration for sensitive credentials
* Simple backend structure for easy integration

## 🛠️ Tech Stack

| Technology     | Purpose                                        |
| -------------- | ---------------------------------------------- |
| **Node.js**    | Backend runtime                                |
| **Express.js** | REST API framework                             |
| **Redis**      | Temporary OTP storage and TTL-based expiration |
| **SendGrid**   | Email delivery service                         |
| **JavaScript** | Application logic                              |
| **REST API**   | Client-server communication                    |

## 🔄 How It Works

```text
User requests OTP
       ↓
Server generates random OTP
       ↓
OTP is stored in Redis with TTL
       ↓
SendGrid sends OTP via email
       ↓
User enters OTP
       ↓
Server retrieves OTP from Redis
       ↓
OTP is compared
       ↓
Success / Invalid / Expired response
```

## 📌 API Endpoints

### 1. Generate OTP

**POST** `/otp`

Generates an OTP, stores it temporarily in Redis, and sends it to the user's email.

**Request:**

```json
{
  "email": "user@example.com"
}
```

### 2. Verify OTP

**POST** `/otp/verify`

Verifies the OTP entered by the user against the OTP stored in Redis.

**Request:**

```json
{
  "email": "user@example.com",
  "otp": "123456"
}
```

## ⚙️ Environment Variables

Create a `.env` file in the project root:

```env
PORT=3000
REDIS_URL=your_redis_url
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=your_verified_sender_email
```

> ⚠️ Never commit your `.env` file or API keys to GitHub.

Add `.env` to your `.gitignore`:

```text
.env
node_modules/
```

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

## 🌐 Live Demo

**Live API:**
https://otp-verification-with-redis.onrender.com

> Note: The API requires valid request data and configured backend services.

## 📂 Project Structure

```text
otp-verification-with-redis/
│
├── src/
│   ├── ...
│
├── .env
├── .gitignore
├── package.json
└── README.md
```

## 🎯 Learning Outcomes

Through this project, I practiced:

* Using **Redis** for temporary data storage
* Implementing **TTL-based OTP expiration**
* Integrating a third-party email service using **SendGrid**
* Building REST APIs with **Express.js**
* Managing environment variables securely
* Designing an OTP-based verification workflow
* Handling API requests and server-side validation

## 🔒 Security Considerations

* OTPs are stored temporarily in Redis and automatically expire.
* Sensitive credentials are managed through environment variables.
* OTP verificat
