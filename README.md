# Bairro Unido — sistema independente

Versão independente inspirada no aplicativo criado no Base44. O projeto funciona no navegador e pode ser instalado como PWA. Os dados ficam no navegador por padrão e podem ser sincronizados com Google Sheets usando Google Apps Script.

## Estrutura
- `index.html` — aplicativo
- `styles.css` — visual responsivo
- `app.js` — regras e armazenamento local
- `manifest.json` — instalação como aplicativo
- `sw.js` — cache/offline
- `Code.gs` — backend Google Apps Script

## Publicar no GitHub Pages
1. Crie um repositório no GitHub.
2. Envie os arquivos desta pasta.
3. Settings > Pages > Deploy from branch > `main` / root.
4. Abra o endereço do GitHub Pages.
5. No celular, use a opção de instalar/adicionar à tela inicial.

## Google Sheets
1. Crie uma planilha Google Sheets.
2. Extensões > Apps Script.
3. Cole `Code.gs`.
4. Execute `setup()` uma vez.
5. Implantar > Nova implantação > Aplicativo da Web.
6. Execute como sua conta e permita acesso a quem tiver o link.
7. Copie a URL que termina em `/exec`.
8. No app, abra Configurações e cole a URL do Apps Script.
9. Salve e use “Buscar dados da planilha”.

## Observação
O frontend não expõe a planilha diretamente. A comunicação passa pelo Apps Script. Para uma associação pequena, esta arquitetura é simples e de baixo custo. Antes de uso definitivo, faça testes de cadastro, edição, exclusão, pagamento e agendamento.
