# Protocolo de Desenvolvimento — Refatoração Checklist (Laravel 11 + Angular 17.3)

> Versão enxuta de um protocolo de desenvolvimento que venho aplicando nos meus
> projetos (autorais e em equipe), adaptada para este teste técnico.
> Doc operacional: o "o que construir" está na análise (`.claude/docs/analise-preliminar.md`)
> e no plano de execução (`.claude/plan/plano-execucao.md`).

## 1. Workflow obrigatório

```
1. ANÁLISE     - entender o pedido, mapear impacto e riscos
2. SOLUÇÕES    - opções com prós e contras quando há escolha relevante
3. PLANO       - atualizar .claude/plan/plano-execucao.md (fases, checklist)
4. APROVAÇÃO   - validar o plano antes de codar
5. DECISÕES    - registrar escolhas não triviais em .claude/decisions/DECISIONS.md
6. IMPLEMENTAR - só então codar, bloco a bloco, marcando [x]
7. VERIFICAR   - testes + docker compose up; honestidade sobre pronto vs pendente
```

Guardrail: nunca sair implementando direto, mesmo em tarefa "óbvia".

## 2. Guiado por testes

O requisito do teste é **manter a app funcionando** durante a refatoração. Testes
automatizados (PHPUnit no backend, Jasmine/Karma no frontend) são a rede de segurança
e o critério de aceite de cada fase — adicionados junto com a refatoração, não depois.

## 3. Decisões (rastreabilidade)

Cada decisão não trivial vira um registro em `DECISIONS.md`:

```
DEC-XXX — <título>
Contexto / Opções / Escolha / Trade-off
```

Isso alimenta a seção de "decisões de arquitetura" do README de entrega.

## 4. Uso de IA no desenvolvimento (transparência)

Este projeto é desenvolvido com **Claude Code** (LLM) como par de engenharia, de forma
transparente e rastreável: a IA apoia análise, planejamento, geração e revisão de
código; as decisões e a validação são do desenvolvedor. O processo (análise → plano →
decisões → implementação → verificação) fica versionado neste `.claude/`, espelhando a
prática de engenharia orientada a especificações (SDD).

Não assinamos co-autoria por commit — o histórico e estes docs de processo já tornam o
método explícito.

## 5. Git

- Commits pequenos ao fim de cada fase ou bloco, incluindo os docs de processo.
- Mensagens semânticas que refletem o processo (ex.: `feat(fase-1): TarefaController + apiResource`, `test(fase-3): feature tests do CRUD`).
- Nada destrutivo (`reset --hard`, `push --force`) nem `--no-verify` sem aprovação.

## 6. Princípios

- Correção e clareza antes de completude (right-sizing: sem gold-plating).
- Documentar o "porquê", não o "o quê".
- Honestidade de engenharia: assumir limites e trade-offs, não inflar.
- Preferir editar a criar arquivos.
- Manter a app funcionando a cada fase (fatias pequenas e verificáveis, não big-bang).

## 7. Reanálise pré-fase e descobertas

Disciplina central: nenhum plano sobrevive intacto ao contato com o código. Sempre
surgem descobertas (gaps, decisões novas, fricções). Para capturá-las com a janela de
contexto fresca:

- ANTES de cada fase: reanálise curta e proporcional. Reler a parte relevante da
  análise e dos testes daquela fase; concatenar o que a fase anterior entregou com o
  que a próxima exige. Saída: um mini-roadmap de 3 a 5 itens, com gaps e riscos
  atualizados.
- DEPOIS de cada fase: registrar as descobertas (o que mudou vs. o plano, gaps achados,
  decisões tomadas) em `.claude/plan/diario-de-fases.md`. Decisões formais vão para
  `DECISIONS.md`.
- Atualizar o `plano-execucao.md` se a reanálise mudar o escopo da fase.

Princípio: "plano aprovado" ≠ "cada fase aprovada". Cada fase tem seu micro-ciclo de
análise, dentro do contexto fresco da anterior.

## 8. Subagentes (rigor proporcional à complexidade)

O rigor de análise acompanha a complexidade da fase:

- Fase simples e de contrato claro: análise direta, reanálise no diário e mini-roadmap
  para aprovação.
- Fase complexa, incerta ou de superfície ampla: subagentes de exploração/planejamento
  em paralelo quando as frentes são independentes.
- Correção crítica: somar verificação adversarial (um subagente tentando refutar a
  solução).

Registrar no diário quando uma fase foi analisada com subagentes (rastreabilidade do
método).

---
> Mantido por: Diogo Soares + Claude Code.
