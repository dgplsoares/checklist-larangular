# Decisões de Arquitetura (DECISIONS)

> Registro rastreável de decisões não triviais. Alimenta a seção de decisões do README.
> Formato: DEC-XXX — título · Contexto · Opções · Escolha · Trade-off.

## DEC-001 — Persistência: SQLite + Eloquent (não arquivo JSON)
- **Contexto:** o baseline persiste em `storage/tarefas.json` (race condition, sem lock, versionado no git).
- **Opções:** (a) manter arquivo com escrita atômica + lock; (b) banco relacional via Eloquent.
- **Escolha:** (b) SQLite + Eloquent — o `.env` já traz `DB_CONNECTION=sqlite`, então é `migrate` sem setup, e demonstra o idioma do framework.
- **Trade-off:** SQLite é suficiente para o teste; um SaaS real usaria MySQL/Postgres — mencionar no README como evolução.

## DEC-002 — Processo de desenvolvimento versionado em `.claude/`
- **Contexto:** o teste valoriza engenharia orientada a especificações (SDD) e uso de IA aplicada.
- **Escolha:** manter protocolo, plano, diário, decisões e o artefato preliminar de análise versionados em `.claude/`, tornando o método explícito e rastreável.
- **Trade-off:** adiciona docs de processo ao repositório; o ganho de transparência/rastreabilidade supera o custo.
