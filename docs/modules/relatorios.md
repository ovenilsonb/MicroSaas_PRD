# Módulo Relatórios – Regras

## Tipos de relatório (implementar gradualmente)
1. Custo por fórmula (lista com custo total e custo por unidade de rendimento)
2. Consumo de insumos (soma de quantidades usadas em fórmulas)
3. Fornecedores por insumo

## Formato de saída
- Tabela simples, igual ao estilo atual do sistema.
- Botão para exportar CSV (usar `papaparse` ou similar) – adicionar sem quebrar layout.

## Dados
- Buscar sempre do storage local.
- Relatórios não modificam dados.

## Preservação
- Não recriar o componente `Relatorios.tsx`. Apenas preencher com lógica real.