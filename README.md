AMVF2 — Correção da Prestação de Contas

Base: última versão estável do AMVF2 (AMVF2-GITHUB-RESET).

Correção principal:
- remove a referência inválida à variável `end` que fazia a tela de Prestação de Contas quebrar;
- mantém a regra de mensalidade a partir do mês de cadastro;
- calcula A receber como mensalidades pendentes + saldo de reservas;
- mantém os demais módulos da versão estável sem alterações.

Para aplicar no GitHub, substitua somente:
src/App.jsx

Não é necessário alterar o Apps Script para esta correção.
