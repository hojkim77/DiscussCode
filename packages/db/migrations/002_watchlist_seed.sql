-- WatchList: 40 repos for Issue Talks
-- Adjust is_active=FALSE to temporarily disable collection for a repo

INSERT INTO public.watched_repos (owner, name, full_name, domain) VALUES
-- AI / ML
('langchain-ai', 'langchain',          'langchain-ai/langchain',          'AI'),
('openai',       'openai-python',       'openai/openai-python',            'AI'),
('huggingface',  'transformers',        'huggingface/transformers',        'AI'),
('pytorch',      'pytorch',             'pytorch/pytorch',                 'AI'),
('ollama',       'ollama',              'ollama/ollama',                   'AI'),
('microsoft',    'autogen',             'microsoft/autogen',               'AI'),

-- DevOps / Infra
('kubernetes',   'kubernetes',          'kubernetes/kubernetes',           'DevOps'),
('docker',       'cli',                 'docker/cli',                     'DevOps'),
('hashicorp',    'terraform',           'hashicorp/terraform',             'DevOps'),
('prometheus',   'prometheus',          'prometheus/prometheus',           'DevOps'),
('grafana',      'grafana',             'grafana/grafana',                 'DevOps'),
('argoproj',     'argo-cd',             'argoproj/argo-cd',                'DevOps'),
('aws',          'aws-cdk',             'aws/aws-cdk',                    'Cloud'),
('pulumi',       'pulumi',              'pulumi/pulumi',                   'Cloud'),

-- Web Frontend
('vercel',       'next.js',             'vercel/next.js',                 'Web'),
('facebook',     'react',               'facebook/react',                 'Web'),
('vuejs',        'core',                'vuejs/core',                     'Web'),
('sveltejs',     'svelte',              'sveltejs/svelte',                'Web'),
('angular',      'angular',             'angular/angular',                'Web'),
('vitejs',       'vite',                'vitejs/vite',                    'Web'),

-- Web Backend / Runtime
('fastify',      'fastify',             'fastify/fastify',                'Web'),
('expressjs',    'express',             'expressjs/express',              'Web'),
('denoland',     'deno',                'denoland/deno',                  'Web'),
('oven-sh',      'bun',                 'oven-sh/bun',                    'Web'),
('nodejs',       'node',                'nodejs/node',                    'Web'),

-- Security
('OWASP',        'CheatSheetSeries',    'OWASP/CheatSheetSeries',         'Security'),
('swisskyrepo',  'PayloadsAllTheThings','swisskyrepo/PayloadsAllTheThings','Security'),

-- Mobile
('flutter',      'flutter',             'flutter/flutter',                'Mobile'),
('facebook',     'react-native',        'facebook/react-native',          'Mobile'),
('expo',         'expo',                'expo/expo',                      'Mobile'),

-- Data
('apache',       'spark',               'apache/spark',                   'Data'),
('dbt-labs',     'dbt-core',            'dbt-labs/dbt-core',              'Data'),
('apache',       'airflow',             'apache/airflow',                 'Data'),
('pola-rs',      'polars',              'pola-rs/polars',                 'Data'),

-- Languages / Tools
('microsoft',    'TypeScript',          'microsoft/TypeScript',           'Tools'),
('rust-lang',    'rust',                'rust-lang/rust',                 'Tools'),
('golang',       'go',                  'golang/go',                      'Tools'),
('python',       'cpython',             'python/cpython',                 'Tools'),
('microsoft',    'vscode',              'microsoft/vscode',               'Tools'),
('neovim',       'neovim',              'neovim/neovim',                  'Tools')

ON CONFLICT (full_name) DO NOTHING;
