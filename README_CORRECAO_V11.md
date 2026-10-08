# AMVF2 — Correção v11 — Menu administrativo

## Correção
A v10 autenticava corretamente, mas o menu verificava `user.permissions` enquanto as permissões retornadas pelo login estavam em `session.permissions`. Isso fazia o Administrador visualizar somente o Dashboard.

## Correção aplicada
O Layout agora recebe explicitamente `session.permissions` e usa essa lista para montar o menu.

### Administrador
- Início
- Financeiro
- Inadimplência
- Prestação de contas
- Agendamentos
- Reuniões / Assembleias
- Moradores
- Configurações
- Usuários

### Diretoria
- Início
- Financeiro
- Inadimplência
- Prestação de contas
- Agendamentos
- Reuniões / Assembleias
- Moradores

### Consulta
- Início
- Financeiro
- Inadimplência
- Prestação de contas
- Agendamentos
- Reuniões / Assembleias
- Moradores

As permissões do backend continuam sendo verificadas pelo Apps Script.
