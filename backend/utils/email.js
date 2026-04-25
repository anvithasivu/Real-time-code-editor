const nodemailer = require('nodemailer');

// In-memory OTP store (email -> { otp, expiresAt })
const otpStore = {};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTPEmail = async (email, otp) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('\n=============================================');
    console.log(`[DEVELOPMENT MODE] OTP for ${email}: ${otp}`);
    console.log('=============================================\n');
    return true;
  }

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: 'Your Verification Code',
    text: `Your OTP for the Real-Time Collaborative Code Editor is: ${otp}\n\nIt expires in 5 minutes.`
  };

  try {
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
};

module.exports = {
  otpStore,
  generateOTP,
  sendOTPEmail
};
