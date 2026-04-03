# Módulo Insumos – Regras (apenas complementares)

## O que NÃO fazer
- Não mudar a tabela de insumos (layout, colunas, ordenação).
- Não adicionar abas ou modais novos sem autorização.
- Não alterar o nome das funções ou props do componente.

## O que pode ser feito
- Conectar o componente ao `insumoService` para salvar/ler dados reais.
- Adicionar validações nos campos (ex: custo não negativo) sem alterar o visual.
- Se houver um campo "fornecedor" que atualmente é texto livre, pode-se transformar em um `<select>` populado pela lista de fornecedores, **desde que mantenha o estilo existente**.

## Dados de exemplo iniciais (se storage vazio)
- Usar os mesmos insumos do script SQL original, inseridos via service ao primeiro acesso.