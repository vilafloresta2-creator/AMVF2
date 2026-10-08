# AMVF2 — Perfis e permissões v13

## Perfis

- **Administrador** — Presidente/Admin: acesso total, incluindo usuários, configurações, financeiro, mensalidades, patrimônio, reuniões/documentos e auditoria.
- **Diretoria** — consulta todos os módulos e pode administrar moradores e agendamentos. Não pode alterar lançamentos, mensalidades ou patrimônio.
- **Tesoureiro** — pode incluir, editar e excluir lançamentos financeiros, registrar/estornar mensalidades e incluir, editar e excluir patrimônio.
- **Secretário(a)** — pode incluir, editar e excluir reuniões, atas e documentos administrativos.
- **Consulta** — somente visualização.

## Usuários

Somente o Administrador pode criar, editar, ativar/desativar, excluir usuários e alterar o perfil de um usuário. Cada usuário possui apenas um perfil.

## Segurança

As permissões são aplicadas na interface e novamente no Apps Script. Portanto, uma tentativa de chamar diretamente uma operação sem autorização também é recusada pelo servidor.

## Implantação

Não executar `setup()` em uma planilha existente com dados. Atualizar o Apps Script e publicar uma nova implantação.
