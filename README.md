AMVF2 — correção segura do horário das reuniões

Base: backup estável enviado pelo usuário em 07/10/2026.
Alteração: somente src/App.jsx.

A correção normaliza horários vindos da planilha (incluindo datas ISO/Date) apenas na exibição, detalhes, impressão/PDF e edição. Não altera a estrutura dos dados, o módulo de reuniões, o Apps Script ou o restante do sistema.

Não executar setup().
