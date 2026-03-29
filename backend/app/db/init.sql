CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Table des hosts
CREATE TABLE IF NOT EXISTS hosts (
    id SERIAL PRIMARY KEY,
    hostname VARCHAR(255) NOT NULL UNIQUE,
    os VARCHAR(100),
    first_seen TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- Table des commandes capturees
CREATE TABLE IF NOT EXISTS command_events (
    id SERIAL PRIMARY KEY,
    command TEXT NOT NULL,
    command_normalized TEXT,
    shell VARCHAR(50) NOT NULL,
    username VARCHAR(255),
    host_id INTEGER REFERENCES hosts(id),
    cwd TEXT,
    exit_code INTEGER,
    duration_ms INTEGER,
    command_type VARCHAR(20) DEFAULT 'command',
    is_sensitive BOOLEAN DEFAULT FALSE,
    raw_command TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table de documentation enrichie
CREATE TABLE IF NOT EXISTS documentation_entries (
    id SERIAL PRIMARY KEY,
    command_normalized TEXT NOT NULL UNIQUE,
    description TEXT,
    section VARCHAR(50) NOT NULL CHECK (section IN ('linux', 'windows', 'automation')),
    category VARCHAR(100),
    tags TEXT[] DEFAULT '{}',
    synonyms TEXT[] DEFAULT '{}',
    is_sensitive BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 1,
    embedding vector(384),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Liaison commandes <-> documentation
CREATE TABLE IF NOT EXISTS command_doc_links (
    command_event_id INTEGER REFERENCES command_events(id) ON DELETE CASCADE,
    doc_entry_id INTEGER REFERENCES documentation_entries(id) ON DELETE CASCADE,
    PRIMARY KEY (command_event_id, doc_entry_id)
);

-- Index pour recherche texte
CREATE INDEX IF NOT EXISTS idx_doc_section ON documentation_entries(section);
CREATE INDEX IF NOT EXISTS idx_doc_command ON documentation_entries USING gin(command_normalized gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_doc_tags ON documentation_entries USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_doc_synonyms ON documentation_entries USING gin(synonyms);
CREATE INDEX IF NOT EXISTS idx_doc_embedding ON documentation_entries USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_cmd_created ON command_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cmd_host ON command_events(host_id);

-- Donnees d'exemple
INSERT INTO hosts (hostname, os) VALUES
    ('workstation-01', 'Linux Ubuntu 22.04'),
    ('desktop-win', 'Windows 11'),
    ('server-prod', 'Linux Debian 12')
ON CONFLICT (hostname) DO NOTHING;

INSERT INTO documentation_entries (command_normalized, description, section, category, tags, synonyms, usage_count) VALUES
    ('df -h', 'Affiche l''utilisation de l''espace disque par systeme de fichiers en format lisible', 'linux', 'stockage', ARRAY['disque', 'stockage', 'filesystem', 'capacite'], ARRAY['espace disque', 'occupation disque', 'place disponible'], 12),
    ('top', 'Affiche en temps reel les processus en cours et l''utilisation des ressources systeme', 'linux', 'monitoring', ARRAY['processus', 'cpu', 'memoire', 'monitoring'], ARRAY['charge systeme', 'utilisation cpu', 'processus actifs'], 34),
    ('journalctl -u nginx', 'Affiche les logs du service nginx via systemd journal', 'linux', 'logs', ARRAY['logs', 'nginx', 'systemd', 'journal'], ARRAY['logs nginx', 'erreurs nginx', 'debug nginx'], 8),
    ('docker compose up -d', 'Demarre tous les services definis dans docker-compose.yml en arriere-plan', 'automation', 'docker', ARRAY['docker', 'compose', 'conteneur', 'deploiement'], ARRAY['lancer docker', 'demarrer conteneurs', 'deployer services'], 22),
    ('Get-Process', 'Liste tous les processus en cours d''execution sur Windows', 'windows', 'monitoring', ARRAY['processus', 'tache', 'powershell'], ARRAY['liste processus', 'taches en cours', 'programmes ouverts'], 15),
    ('chmod 755', 'Modifie les permissions d''un fichier : lecture/ecriture/execution pour le proprietaire, lecture/execution pour les autres', 'linux', 'permissions', ARRAY['permissions', 'droits', 'fichier', 'acces'], ARRAY['changer permissions', 'droits fichier', 'rendre executable'], 9),
    ('netstat -tulnp', 'Affiche les ports ouverts et les connexions reseau actives avec les processus associes', 'linux', 'reseau', ARRAY['reseau', 'ports', 'connexions', 'tcp', 'udp'], ARRAY['ports ouverts', 'connexions actives', 'ecoute reseau'], 17),
    ('scp', 'Copie securisee de fichiers entre machines via SSH', 'linux', 'transfert', ARRAY['copie', 'ssh', 'transfert', 'fichier', 'distant'], ARRAY['copier fichier distant', 'transfert ssh', 'envoyer fichier serveur'], 6),
    ('ansible-playbook', 'Execute un playbook Ansible pour automatiser la configuration de serveurs', 'automation', 'configuration', ARRAY['ansible', 'playbook', 'automatisation', 'configuration'], ARRAY['automatiser serveurs', 'deployer configuration', 'provisionner'], 11),
    ('Get-EventLog -LogName System', 'Consulte le journal d''evenements systeme de Windows', 'windows', 'logs', ARRAY['logs', 'evenements', 'systeme', 'windows'], ARRAY['journal windows', 'erreurs systeme', 'evenements systeme'], 4)
ON CONFLICT (command_normalized) DO NOTHING;
