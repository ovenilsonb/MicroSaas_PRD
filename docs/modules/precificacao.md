# Módulo Precificação – Regras

## Entrada
- Selecionar uma fórmula (apenas ativas).
- Informar: markup (%), impostos (%), despesas fixas (R$), margem de lucro desejada (%).

## Cálculo
- Preço de venda = (custo_total + despesas_fixas) / (1 - (impostos + markup + margem)/100)
- Exibir: custo total, preço sugerido, lucro por unidade, margem líquida.

## Persistência
- Salvar cada configuração de preço no `ohana_precificacoes` com timestamp.
- Permitir histórico de preços para cada fórmula.

## Preservação
- Não alterar o layout do componente `Precificacao.tsx`. Apenas conectar aos serviços.