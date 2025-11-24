# 📧 SMTP Setup Guide - WP Sign

## ❌ Current Status

**All SMTP configurations failed!**

Test results:
- ❌ Gmail: Connection closed (need real credentials)
- ❌ Outlook: Invalid domain name
- ❌ Mailtrap: Invalid argument (need account)
- ❌ locautienphuoc.com: Authentication failed (wrong credentials)

**Current workaround**: Using console logging for development

---

## ✅ Recommended Solutions

### Option 1: Gmail (FREE - Recommended for Testing)

**Pros**: Free, reliable, easy to setup  
**Cons**: Daily limit (500 emails/day)

**Steps**:
1. Go to Google Account: https://myaccount.google.com
2. Enable 2-Step Verification
3. Generate App Password:
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and "Other (Custom name)"
   - Name it "WP Sign"
   - Copy the 16-character password

4. Update `backend/.env`:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=xxxx xxxx xxxx xxxx  # App Password (16 chars)
EMAIL_FROM=your-email@gmail.com
EMAIL_FROM_NAME=WP Sign
```

5. Test:
```bash
cd backend
node scripts/test-send-email.js
```

---

### Option 2: Mailtrap (FREE - Best for Development)

**Pros**: Perfect for testing, no real emails sent, inbox viewer  
**Cons**: Not for production

**Steps**:
1. Sign up: https://mailtrap.io (FREE account)
2. Create inbox
3. Get SMTP credentials from inbox settings

4. Update `backend/.env`:
```env
SMTP_HOST=smtp.mailtrap.io
SMTP_PORT=2525
SMTP_SECURE=false
SMTP_USER=your-mailtrap-username
SMTP_PASSWORD=your-mailtrap-password
EMAIL_FROM=test@wpsign.com
EMAIL_FROM_NAME=WP Sign
```

5. Test:
```bash
cd backend
node scripts/test-send-email.js
```

6. Check inbox at: https://mailtrap.io/inboxes

---

### Option 3: SendGrid (FREE tier available)

**Pros**: Professional, reliable, 100 emails/day free  
**Cons**: Requires verification

**Steps**:
1. Sign up: https://sendgrid.com (FREE account)
2. Verify your email
3. Create API Key:
   - Go to Settings > API Keys
   - Create API Key with "Mail Send" permission
   - Copy the key

4. Update `backend/.env`:
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=apikey
SMTP_PASSWORD=SG.xxxxxxxxxxxxxxxxxxxxx  # Your API Key
EMAIL_FROM=your-verified-email@domain.com
EMAIL_FROM_NAME=WP Sign
```

5. Test:
```bash
cd backend
node scripts/test-send-email.js
```

---

### Option 4: AWS SES (Production - Pay as you go)

**Pros**: Scalable, cheap ($0.10 per 1000 emails)  
**Cons**: Requires AWS account, more complex setup

**Steps**:
1. Create AWS account
2. Go to AWS SES
3. Verify domain or email
4. Create SMTP credentials
5. Move out of sandbox mode (request production access)

6. Update `backend/.env`:
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-aws-smtp-username
SMTP_PASSWORD=your-aws-smtp-password
EMAIL_FROM=your-verified-email@domain.com
EMAIL_FROM_NAME=WP Sign
```

---

### Option 5: Fix locautienphuoc.com

**Current issue**: Authentication failed

**Possible causes**:
1. Wrong password
2. Email account not created on server
3. Server requires different auth method
4. Port blocked by firewall

**Steps to fix**:
1. Contact hosting provider (locautienphuoc.com)
2. Verify email account exists: `teststmp@locautienphuoc.com`
3. Reset password
4. Ask for correct SMTP settings
5. Check if port 587/465 is open

**Alternative**: Create new email account on cPanel/Plesk

---

## 🧪 Testing

### Test Script
```bash
cd backend
node scripts/test-smtp-configs.js
```

### Test with Real Email Service
```bash
# After updating .env
cd backend
node scripts/test-send-email.js
```

### Test OTP Flow
```bash
cd backend
node scripts/quick-test-guided.js
# Check email for OTP
```

---

## 📝 Current .env Configuration

```env
# SMTP disabled - using console logging
# Uncomment and update with real credentials:

# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_SECURE=false
# SMTP_USER=your-email@gmail.com
# SMTP_PASSWORD=your-app-password

EMAIL_FROM=teststmp@locautienphuoc.com
EMAIL_FROM_NAME=WP Sign
```

---

## 💡 Quick Fix for Development

**Use console logging** (current setup):
- Emails are logged to console
- No SMTP needed
- Good for development
- Check backend logs for OTP codes

**To enable**:
- Just don't set SMTP_USER in .env
- System will auto-detect and use console logging

---

## 🎯 Recommendation

**For Development**: Use **Mailtrap** or **Gmail**
- Mailtrap: Best for testing (no real emails)
- Gmail: Easy to setup, works immediately

**For Production**: Use **SendGrid** or **AWS SES**
- SendGrid: Easier to setup
- AWS SES: Cheaper for high volume

**Current Setup**: Keep console logging until you have real SMTP credentials

---

## 📞 Need Help?

1. **Gmail not working?**
   - Make sure 2-Step Verification is enabled
   - Use App Password, not regular password
   - Check "Less secure app access" is OFF

2. **Mailtrap not working?**
   - Verify credentials are correct
   - Check inbox is active
   - Try different port (2525, 587, 465)

3. **SendGrid not working?**
   - Verify email address
   - Check API key has "Mail Send" permission
   - Wait for domain verification

4. **Still not working?**
   - Check firewall/antivirus
   - Try different network
   - Check backend logs for detailed errors

---

## ✅ Success Criteria

When SMTP is working:
- [ ] `test-smtp-configs.js` shows ✅ for at least one config
- [ ] `test-send-email.js` sends email successfully
- [ ] OTP emails arrive in inbox
- [ ] Sign request notifications work
- [ ] No errors in backend logs

---

**Created**: 2025-11-24  
**Status**: ⚠️ SMTP not configured - using console logging  
**Action**: Choose one option above and configure
