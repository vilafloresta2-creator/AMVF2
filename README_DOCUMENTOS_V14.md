# AMVF2 v14 — Documentos + integração com Reuniões/Assembleias

- Biblioteca de documentos oficiais.
- Upload para a pasta do Google Drive `AMVF2 - Documentos`.
- Limite de 8 MB por arquivo.
- Categorias: Ata, Prestação de contas, Nota fiscal, Comprovante, Regulamento, Orçamento, Contrato, Documento da associação e Outro.
- Documentos podem ser vinculados a uma reunião/assembleia.
- Secretário(a) e Administrador podem cadastrar/editar/excluir documentos.
- Diretoria e Consulta podem visualizar.
- A reunião exibe os documentos vinculados.
- A auditoria registra as operações.

## Apps Script
A nova versão usa `DriveApp`, portanto na primeira implantação/reautorização o Google solicitará permissão para criar e gerenciar arquivos no Drive.

Não execute `setup()` em uma planilha já com dados.
