CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_source TEXT NOT NULL,
    sequence_number TEXT,
    extract_number TEXT,
    account_number TEXT,
    execution_date DATE,
    accounting_date DATE,
    value_date DATE,
    amount DECIMAL,
    currency TEXT DEFAULT 'EUR',
    transaction_type TEXT,
    counterparty_account TEXT,
    counterparty_name TEXT,
    counterparty_street TEXT,
    counterparty_city TEXT,
    communication TEXT,
    details TEXT,
    status TEXT,
    rejection_reason TEXT,
    bic TEXT,
    country_code TEXT,
    raw_data JSONB,
    UNIQUE (bank_source, sequence_number)
);

CREATE INDEX IF NOT EXISTS idx_transactions_execution_date ON transactions(execution_date);
CREATE INDEX IF NOT EXISTS idx_transactions_accounting_date ON transactions(accounting_date);
CREATE INDEX IF NOT EXISTS idx_transactions_value_date ON transactions(value_date);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value JSONB
);

CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT,
    year INTEGER NOT NULL,
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
