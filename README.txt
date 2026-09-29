AMVF2 - correção de gravação da mensalidade

Arquivos:
- src/App.jsx
- src/lib/api.js

O App.jsx fecha imediatamente a janela de mensalidade ao iniciar o envio,
mostra "Salvando..." no morador enquanto a operação está em andamento e
faz a sincronização com a planilha em segundo plano.

O api.js mantém a recuperação quando o POST do Apps Script devolve HTML,
confirmando a operação por uma leitura da API.

Substitua somente esses dois arquivos no repositório GitHub e faça Commit.
O GitHub Actions fará a publicação.
