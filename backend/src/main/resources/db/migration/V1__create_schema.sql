CREATE TABLE lists (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE cards (
    id BIGSERIAL PRIMARY KEY,
    list_id BIGINT NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    priority VARCHAR(10) CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW')),
    due_date DATE,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX idx_cards_list_id ON cards (list_id);
CREATE INDEX idx_cards_priority ON cards (priority);
CREATE INDEX idx_cards_due_date ON cards (due_date);
