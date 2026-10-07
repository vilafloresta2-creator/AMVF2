# AMVF2 — Associação de Moradores do Vila Floresta 2

Correções desta versão:
- Não recarrega a página depois de salvar/editar/excluir; a tela permanece no lugar e os dados são atualizados sem congelar.
- O botão **Pendente** da mensalidade agora marca o mês como pago e cria automaticamente um lançamento em **Transactions**.
- O lançamento é criado como **Entrada / Taxa Mensal**, usando o valor de `taxaMensal` das configurações.
- O lançamento recebe como descrição apenas o nome do morador; a categoria fica como `Taxa Mensal`.
- Se o pagamento já estiver lançado, não cria duplicado.
- Clicar em um pagamento já pago permite estornar: remove o mês de `paidMonths` e o lançamento financeiro correspondente.
- Backend usa operação atômica com LockService para atualizar o morador e o financeiro juntos.
- Corrigido o tratamento de abas vazias no Apps Script.

## URL atual da API

https://script.google.com/macros/s/AKfycbwN_APFxqeYHqGaH_RXFeOjeFm1sh2Kk4EZWwoEwbahtKQfyQOddb5f46AD3Mjoc3J2/exec

## Atualização do Apps Script

1. Abra o mesmo Google Sheets.
2. Extensões → Apps Script.
3. Substitua o código pelo arquivo `Apps-Script-Code.gs` desta versão administrativa atual.
4. Salve.
5. Não execute `setup()` novamente se já existem dados, pois `setup()` limpa as abas.
6. Implante uma **nova versão** da mesma implantação do Web App:
   - Executar como: você
   - Quem tem acesso: qualquer pessoa
7. Mantenha a URL do Web App que termina em `/exec`.

## Frontend

Depois de extrair:

```bash
npm install
npm run dev
```

A V5 já está configurada para a URL acima.


## Correção V8
A leitura dos dados do Google Apps Script usa GET com `?action=read` e cache-busting. Isso evita o redirecionamento de POST para `googleusercontent` que podia resultar em 404/Failed to fetch.
