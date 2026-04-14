# Documentação Técnica: Módulo Fórmulas

Este documento detalha a arquitetura, regras de negócio e estrutura do módulo de Fórmulas, após a refatoração para o padrão modular "Ohana Clean".

## 🏗️ Arquitetura do Módulo

O módulo foi decomposto de um arquivo único de 2.241 linhas para uma estrutura de componentes e ganchos (hooks) especializados, reduzindo o arquivo principal para cerca de 340 linhas.

### 🪝 Camada de Lógica (Hooks)

1.  **`useFormulasData`**: Gerencia a persistência (Supabase ou LocalStorage).
    *   CRUD de fórmulas e categorias.
    *   Lógica de Importação/Exportação de backups JSON.
    *   Carregamento de variantes de embalagem e insumos.
2.  **`useFormulaFilters`**: Gerencia o estado da galeria.
    *   Busca por nome, código LM ou categoria.
    *   Filtragem por status (Ativa, Rascunho, Arquivada).
    *   Ordenação dinâmica e cálculos de estatísticas (stats).
3.  **`useFormulaEditor`**: Centraliza o estado complexo da edição.
    *   Gerenciamento de ingredientes da fórmula.
    *   Busca avançada de insumos com suporte a variantes.
    *   Cálculos de custo total e volume químico em tempo real.

### 🧱 Componentes de Interface

-   **`FormulaStats`**: Cards de indicadores superiores.
-   **`FormulaTable`**: Renderização em modo lista com ações rápidas.
-   **`FormulaEditor`**: Componente pai do editor, dividido em:
    -   `FormulaEditorGeneral`: Dados cadastrais e categorias.
    -   `FormulaEditorProduction`: Volume base, rendimento e qualidade.
    -   `FormulaCompositionSection`: Gestão de insumos, custos e volume total.
-   **`CategoryManagerModal`**: Modal independente para gestão de categorias.

## ⚖️ Regras de Negócio e Cálculos

### 1. Cálculo de Custo Total
O custo é calculado somando o custo de cada ingrediente multiplicado por sua quantidade:
-   **Prioridade:** Se um insumo tiver uma variante selecionada, o custo da variante sobrepõe o custo base do insumo.
-   **Conversão:** Valores em string (formatados como moeda) são convertidos para float antes do cálculo.

### 2. Volume Base vs Volume Químico
-   O **Volume Base** é o volume total planejado para a batelada (ex: 1000L).
-   O **Volume Químico** é a soma das quantidades apenas dos insumos marcados como `produto_quimico`.
-   **Alerta:** O sistema exibe um alerta visual se o Volume Químico divergir do Volume Base, indicando erro na formulação.

### 3. Versionamento
-   O sistema permite "Salvar como Nova Versão".
-   A lógica incrementa automaticamente a versão minor (ex: V1.0 -> V1.1).
-   A versão anterior permanece intacta no banco de dados.

## 💾 Estrutura de Dados (Formulas)

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | UUID / String | Identificador único |
| `name` | String | Nome comercial do produto |
| `version` | String | Versão (ex: V1.2) |
| `base_volume`| Number | Volume da batelada (L ou Kg) |
| `status` | Enum | active, draft, archived |
| `group_id` | UUID | Relacionamento com Categorias |
| `lm_code` | String | Código interno / Lista de Material |
| `yield_amount`| Number | Quanto o volume base rende no final |
| `yield_unit` | String | Unid (UN, CX, GL, LT, KG) |

---

> [!NOTE]
> Este módulo segue as diretrizes de estabilidade: todas as propriedades visuais e comportamentos originais foram rigorosamente preservados.
