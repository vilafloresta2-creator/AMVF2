# AMVF2 — Patrimônio

## v12

Módulo administrativo de patrimônio integrado ao login, permissões e auditoria.

### Campos
- Item
- Categoria
- Quantidade
- Localização
- Data de aquisição
- Valor total do item/registro
- Estado
- Observação

### Permissões
- Administrador: visualizar, cadastrar, editar e excluir.
- Diretoria: somente visualização.
- Tesoureiro: cadastrar, editar e excluir.
- Consulta: somente visualização.

### Auditoria
Cadastros, alterações e exclusões são registrados na aba `Audit` com o usuário autenticado.

### Planilha
A nova aba `Assets` é criada automaticamente quando a API for lida pela primeira vez. Não execute `setup()` sobre uma planilha existente, pois ele recria as abas.
