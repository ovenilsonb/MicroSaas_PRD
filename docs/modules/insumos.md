# Módulo Insumos – Regras

## Preservação do componente existente
- O arquivo `src/components/Insumos.tsx` já existe. Não reescrevê-lo.
- Conectá-lo ao `insumoService` (leitura/escrita) sem alterar o JSX, estados ou funções existentes.

## Campos (manter os que já estão)
- name, codigo, apelido, unit, cost_per_unit, fornecedor, supplier_id, validade_indeterminada, estoque_atual, estoque_minimo, produto_quimico, tem_variantes, especificações técnicas.

## Variantes
- Se `tem_variantes` for true, permitir gerenciar `ingredient_variants` (lista separada).

## Regras de negócio
- `cost_per_unit` não pode ser negativo.
- `estoque_atual` só deve ser alterado por movimentações (entrada/saída) – não permitir edição direta no formulário principal.

## Exportação/importação específica
- Não criar botões extras de exportação/importação dentro do módulo. Usar os botões globais de Configurações.

## Integração com storage
- Usar `ohana_insumos` para salvar.
- Ao carregar, se vazio, popular com dados iniciais (mesmos do script SQL).