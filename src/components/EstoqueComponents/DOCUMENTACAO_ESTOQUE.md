# Documentação Técnica: Módulo Estoque (Inventory)

Este documento detalha a arquitetura, regras de negócio e estrutura do módulo de Estoque, após a refatoração para o padrão modular **"Ohana Clean"**.

## 🏗️ Arquitetura do Módulo

O módulo foi decomposto de um arquivo único para uma estrutura de componentes e ganchos (hooks) especializados, garantindo a separação de interesses e facilitando a manutenção.

### 🪝 Camada de Lógica (Hooks)

1.  **`useInventoryData`**: Gerencia o carregamento de dados (Insumos e Produtos Acabados) com suporte a **Dual Storage** (Supabase + LocalStorage). Abstrai a lógica de redução de logs para calcular o estoque de PA no modo nuvem.
2.  **`useInventoryFilters`**: Controla o estado de busca e filtragem por abas (`finished` | `raw`).
3.  **`useInventoryActions`**: Encapsula as funções de mutação, como exclusão de registros e ajustes rápidos de estoque via UI (principalmente para o modo local).

### 🧱 Componentes de Interface

-   **`InventoryStats`**: Renderiza os cards de KPI (indicadores chave de performance) baseados na aba ativa.
-   **`FinishedGoodsGallery`**: Exibe os produtos acabados em formato de cartões com controles de ajuste rápido.
-   **`RawMaterialsTable`**: Exibe os níveis de estoque de insumos e matérias-primas com indicadores visuais de "Status de Compra".
-   **`InventoryActivityFeed`**: Feed lateral de logs de movimentação (Entradas/Saídas).

## 📊 Regras de Negócio e Persistência

### 1. Suporte Híbrido (Supabase/Local)
O sistema detecta automaticamente o modo de armazenamento configurado:
-   **LocalStorage**: Lê e grava em `local_finished_goods` e `local_inventory_logs`.
-   **Supabase**: Lê da tabela `inventory_logs`. Registros de PA são identificados pelo `reference_id` e prefixos nas notas ("Entrada PA", "Saída PA").

### 2. Estados de Estoque de Insumos
| Status | Cor | Condição |
| :--- | :--- | :--- |
| **Crítico** | Vermelho (Animado) | `estoque_atual < estoque_minimo` |
| **Atenção** | Amarelo | `estoque_atual < estoque_minimo * 1.2` |
| **Ok** | Verde | `estoque_atual >= estoque_minimo * 1.2` |

## 💾 Estruturas principais (Types)

| Tipo | Descrição |
| :--- | :--- |
| `InventoryLog` | Registro de movimentação unitário de insumo ou PA. |
| `FinishedGood` | Objeto de inventário para produtos prontos. |
| `IngredientStats` | Dados consolidados de estoque para insumos. |

---

> [!NOTE]
> Este módulo agora utiliza o **ErrorBoundary Global**, garantindo que falhas em renderizações de dados corrompidos ou falhas de rede no Supabase não quebrem o dashboard principal.
