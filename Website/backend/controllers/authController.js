const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { promisePool } = require('../config/database');

const hashResetToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const parseFlatId = (flatId) => {
  if (flatId === undefined || flatId === null || flatId === '') return null;
  const numericFlatId = Number(flatId);
  return Number.isInteger(numericFlatId) && numericFlatId > 0 ? numericFlatId : null;
};

const isMissingSmtpValue = (value, placeholder) => !value || value === placeholder || value.includes('your_');

const sendPasswordResetEmail = async ({ to, name, resetLink }) => {
  if (
    !process.env.SMTP_HOST ||
    isMissingSmtpValue(process.env.SMTP_USER, 'your_real_email@gmail.com') ||
    isMissingSmtpValue(process.env.SMTP_PASS, 'your_gmail_app_password')
  ) {
    console.log(`Password reset link for ${to}: ${resetLink}`);
    return { sent: false, reason: 'SMTP is not configured with real credentials' };
  }

  try {
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to,
      subject: 'Reset your Society Management password',
      html: `
        <p>Hello ${name || 'there'},</p>
        <p>Click the button below to reset your password. This link expires in 30 minutes.</p>
        <p><a href="${resetLink}" style="display:inline-block;padding:10px 16px;background:#1473e6;color:#fff;text-decoration:none;border-radius:8px;">Reset Password</a></p>
        <p>If the button does not work, copy this link:</p>
        <p>${resetLink}</p>
      `
    });

    return { sent: true };
  } catch (error) {
    const isAuthError = error.code === 'EAUTH' || error.responseCode === 535;
    console.error(
      'Password reset email was not sent:',
      isAuthError
        ? 'Gmail rejected the SMTP username/password. Use your Gmail address and a 16-character App Password.'
        : error.message
    );
    return { sent: false, reason: isAuthError ? 'Gmail SMTP login failed' : 'Email service failed' };
  }
};

const register = async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    const { name, email, password, role, flat_id, phone } = req.body;
    const userRole = role || 'resident';
    const assignedFlatId = parseFlatId(flat_id);

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    await connection.beginTransaction();

    const [existingUsers] = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'User already exists' });
    }

    if (userRole === 'resident' && assignedFlatId) {
      const [flats] = await connection.query(
        'SELECT id, owner_id FROM flats WHERE id = ? FOR UPDATE',
        [assignedFlatId]
      );

      if (flats.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: 'Selected flat was not found' });
      }

      if (flats[0].owner_id) {
        await connection.rollback();
        return res.status(409).json({ message: 'Selected flat is already assigned to another resident' });
      }

      const [assignedUsers] = await connection.query(
        'SELECT id FROM users WHERE flat_id = ? AND role = ? LIMIT 1',
        [assignedFlatId, 'resident']
      );

      if (assignedUsers.length > 0) {
        await connection.rollback();
        return res.status(409).json({ message: 'Selected flat is already assigned to another resident' });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const [result] = await connection.query(
      'INSERT INTO users (name, email, password, phone, role, status, flat_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, phone || null, userRole, userRole === 'resident' ? 'pending' : 'approved', userRole === 'resident' ? assignedFlatId : null]
    );

    if (userRole === 'resident' && assignedFlatId) {
      await connection.query(
        'UPDATE flats SET owner_id = ?, status = ? WHERE id = ?',
        [result.insertId, 'Occupied', assignedFlatId]
      );
    }

    await connection.commit();

    const userStatus = userRole === 'resident' ? 'pending' : 'approved';
    const token = userStatus === 'approved'
      ? jwt.sign(
        { id: result.insertId, email, role: userRole },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      )
      : null;

    res.status(201).json({
      token,
      message: userStatus === 'pending' ? 'Registration submitted. Please wait for admin approval.' : 'Registration successful',
      user: {
        id: result.insertId,
        name,
        email,
        role: userRole,
        phone: phone || null,
        status: userStatus,
        flat_id: userRole === 'resident' ? assignedFlatId : null
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Register error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const [users] = await promisePool.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = users[0];

    if (user.status && user.status !== 'approved') {
      return res.status(403).json({
        message: user.status === 'pending'
          ? 'Your account is pending admin approval'
          : 'Your account has been rejected. Please contact the society admin.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || null,
        role: user.role,
        status: user.status || 'approved',
        flat_id: user.flat_id || null
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const [users] = await promisePool.query(
      'SELECT id, password FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await bcrypt.compare(currentPassword, users[0].password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await promisePool.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, req.user.id]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    const [users] = await promisePool.query(
      'SELECT id, name, email FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.json({ message: 'If this email exists, a reset link has been sent.' });
    }

    const user = users[0];
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(rawToken);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${rawToken}`;

    await promisePool.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL',
      [user.id]
    );

    await promisePool.query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE))',
      [user.id, tokenHash]
    );

    const emailResult = await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetLink
    });

    res.json({
      message: emailResult.sent
        ? 'Password reset link sent to your email.'
        : `${emailResult.reason}. Reset link created for testing.`,
      resetLink: emailResult.sent ? undefined : resetLink
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const resetPassword = async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const tokenHash = hashResetToken(token);
    const [tokens] = await connection.query(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [tokenHash]
    );

    if (tokens.length === 0) {
      return res.status(400).json({ message: 'Reset link is invalid or expired' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await connection.beginTransaction();
    await connection.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, tokens[0].user_id]);
    await connection.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = ?', [tokens[0].id]);
    await connection.commit();

    res.json({ message: 'Password reset successfully. You can login now.' });
  } catch (error) {
    await connection.rollback();
    console.error('Reset password error:', error);
    res.status(500).json({ message: 'Server error' });
  } finally {
    connection.release();
  }
};

module.exports = { register, login, changePassword, forgotPassword, resetPassword };
