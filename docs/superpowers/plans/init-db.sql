CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_source TEXT,
    external_id TEXT UNIQUE,
    date DATE,
    amount DECIMAL,
    description TEXT,
    raw_data JSONB
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value JSONB
);

CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    start_date DATE,
    end_date DATE,
    initial_balance DECIMAL,
    final_balance DECIMAL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_transactions (
    report_id UUID REFERENCES reports(id),
    transaction_id UUID REFERENCES transactions(id),
    category TEXT,
    sub_category TEXT,
    tags JSONB,
    PRIMARY KEY (report_id, transaction_id)
);
