ALTER TABLE signers
  ADD COLUMN otp_sent_at TIMESTAMP(3),
  ADD COLUMN otp_verified_at TIMESTAMP(3),
  ADD COLUMN otp_attempt_count INTEGER NOT NULL DEFAULT 0;
