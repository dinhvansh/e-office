
-- Tenants
CREATE TABLE tenants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    domain VARCHAR(255),
    plan VARCHAR(50),
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    tenant_id INT REFERENCES tenants(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50),
    status VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Documents
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    tenant_id INT REFERENCES tenants(id),
    owner_id INT REFERENCES users(id),
    file_path TEXT NOT NULL,
    hash TEXT,
    status VARCHAR(20),
    version INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Sign Requests
CREATE TABLE sign_requests (
    id SERIAL PRIMARY KEY,
    tenant_id INT REFERENCES tenants(id),
    document_id INT REFERENCES documents(id),
    title VARCHAR(255),
    message TEXT,
    workflow_type VARCHAR(50),
    status VARCHAR(20),
    deadline TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Signers
CREATE TABLE signers (
    id SERIAL PRIMARY KEY,
    sign_request_id INT REFERENCES sign_requests(id),
    email VARCHAR(255),
    name VARCHAR(255),
    role VARCHAR(50),
    status VARCHAR(20),
    otp VARCHAR(10),
    otp_expire TIMESTAMP,
    signed_at TIMESTAMP,
    position_data JSONB
);

-- Audit Logs
CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    document_id INT REFERENCES documents(id),
    event VARCHAR(255),
    user_id INT REFERENCES users(id),
    ip VARCHAR(50),
    ua TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- License (On-Prem)
CREATE TABLE license (
    id SERIAL PRIMARY KEY,
    tenant VARCHAR(255),
    license_key VARCHAR(255),
    expire_date DATE,
    limit_user INT,
    limit_docs INT,
    signature TEXT
);
