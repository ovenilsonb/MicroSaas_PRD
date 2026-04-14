# Documentação Técnica: Módulo Precificação

Este documento detalha a arquitetura, regras de negócio e estrutura do módulo de Precificação, após a refatoração para o padrão modular "Ohana Clean".

## 🏗️ Arquitetura do Módulo

O módulo foi decomposto de um arquivo único de 1.724 linhas para uma estrutura de componentes e ganchos (hooks) especializados, garantindo alta manutenibilidade e separação de responsabilidades.

### 🪝 Camada de Lógica (Hooks)

1.  **`usePricingData`**: Responsável pela camada de dados e persistência.
    *   Gerenciamento "Dual Storage" (Supabase + LocalStorage).
    *   Mapeamento dinâmico de opções de embalagem e rótulos baseados nos insumos disponíveis.
    *   Lógica de Importação/Exportação de backups de precificação.
2.  **`usePricingFilters`**: Gerencia o estado e lógica da galeria principal.
    *   Busca por nome do produto ou código LM.
    *   Filtragem por status de precificação (Pendente vs. Precificado).
    *   Ordenação dinâmica e gerenciamento de colunas (Drag & Drop).
    *   Cálculo de estatísticas globais (Margem Média, Pendências).
3.  **`usePricingEditor`**: Centraliza a inteligência de formação de preços.
    *   Orquestração das variantes de volume (0.5L, 1L, etc).
    *   Cálculos em tempo real de Margem, Markup e Lucro Bruto.
    *   Gerenciamento de disponibilidade por canal de venda.

### 🧱 Componentes de Interface

-   **`PricingStats`**: Painel de indicadores de desempenho financeiro.
-   **`PricingGrid`** / **`PricingTable`**: Modos de visualização otimizados para galeria.
-   **`PricingEditorHeader`**: Navegação e ações globais (Salvar, Zerar, Descartar).
-   **`PricingCostComposition`**: Detalhamento visual da composição de custos unitários.
-   **`PricingAdjusterSection`**: Interface de ajuste fino de preços por canal (Varejo, Atacado, Fardo).
-   **`PricingAnalytics`**: Sidebar de análise com gráficos de donut (composição) e barras (comparativo).

## ⚖️ Regras de Negócio e Cálculos

### 1. Formação do Custo Total Unitário
O custo de uma unidade pronta para venda é calculado pela fórmula:
`Custo Total = (Custo Líquido + Custo Embalagem + Custo Rótulo) + Custos Fixos`
*   **Custo Líquido**: Proporcional ao volume da embalagem baseado no custo por litro da fórmula.
*   **Custos Fixos**: Valor manual inserido para cobrir despesas operacionais por unidade.

### 2. Canais de Venda e Estratégias
O sistema suporta três estratégias de preços simultâneas:
-   **Varejo**: Preço base para consumidor final (geralmente final .95).
-   **Atacado**: Preço com desconto para volumes intermediários (geralmente final .90).
-   **Fardo/Caixa**: Preço para venda em lote com quantidade variável, permitindo descontos agressivos por volume.

### 3. Métricas Financeiras
-   **Margem (%)**: `((Preço - Custo) / Preço) * 100`. Indica a porcentagem de lucro sobre a venda.
-   **Markup (%)**: `((Preço - Custo) / Custo) * 100`. Indica o percentual adicionado sobre o custo.
-   **Atratividade**: O sistema calcula automaticamente o percentual de desconto do Atacado e Fardo vs. Varejo.

## 💾 Estrutura de Dados (PricingEntry)

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `formulaId` | String | Relacionamento com a Fórmula |
| `capacityKey`| String | Volume da embalagem (ex: "1", "5") |
| `varejoPrice`| Number | Preço final unitário varejo |
| `atacadoPrice`| Number | Preço final unitário atacado |
| `fardoPrice` | Number | Preço do lote (fardo/caixa) |
| `fardoQty` | Number | Quantidade de itens no fardo |
| `fixedCosts` | Number | Custos operacionais fixos rateados |
| `varejoDisabled`| Boolean| Indica se o canal varejo está inativo |
| `atacadoDisabled`| Boolean| Indica se o canal atacado está inativo |
| `fardoDisabled`| Boolean| Indica se o canal fardo está inativo |

---

> [!NOTE]
> Este módulo preserva integralmente as regras matemáticas e a experiência de usuário da versão original, enquanto otimiza o código para futuras expansões (como novos canais de venda ou integrações de e-commerce).
