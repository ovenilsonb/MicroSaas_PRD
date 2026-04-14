# Documentação Técnica - Módulo Insumos

Este documento centraliza as informações sobre a arquitetura, regras de negócio e a evolução tecnológica do módulo de Insumos da plataforma Ohana Clean.

---

## 1. Visão Geral
O módulo **Insumos** gerencia todas as matérias-primas, embalagens e produtos químicos utilizados na produção. Permite cadastrar, editar, controlar estoque, gerenciar variantes e acompanhar a rastreabilidade em fórmulas.

---

## 2. Evolução da Arquitetura

### v1 (Legado)
- Arquivo monolítico de **2.130 linhas**.
- Lógica de UI e Banco de Dados misturadas.
- Difícil manutenção e alta propensão a bugs de estado.

### v2 (Transição - 03/04/2026)
- Fragmentação em 9 subcomponentes vinculados ao `barrel index`.
- Integração com `inventory_logs` do Supabase.
- Adição de drag-and-drop e exportação CSV.

### v3 (Atual - Refatoração de Otimização)
- **Desacoplamento Total:** Lógica de interface movida para hooks específicos.
- **Redução de Densidade:** Arquivos principais reduzidos em mais de 60%.
- **Separação de Preocupações:** Componentes do modal divididos por "áreas de interesse" (tabs).

---

## 3. Estrutura de Arquivos Atualizada

```text
src/components/InsumosComponents/
├── types.ts                # Interfaces (Ingredient, Variant, Supplier)
├── useInsumosData.ts       # Hook de Persistência (CRUD, Import/Export, Duplicação)
├── useInsumoFilters.ts     # Hook de UI (Busca, Filtros, Ordenação, Stats)
├── InsumoModal.tsx         # Orquestrador do modal (Tabs)
│   ├── InsumoGeneralTab.tsx   # Dados básicos e estoque
│   ├── InsumoTechnicalTab.tsx # Dados técnicos (pH, viscosidade)
│   ├── InsumoVariantsSection.tsx # Gestão de variantes isolada
│   └── InsumoUsageTab.tsx     # Rastreabilidade em fórmulas
├── InsumoTable.tsx         # Listagem em Tabela
├── InsumoGrid.tsx          # Listagem em Cards
├── InsumoFilters.tsx       # Barra de ferramentas da UI
├── InsumoStats.tsx         # Dashboard de indicadores
├── StockMovementPanel.tsx  # Gestão de inventário
└── DOCUMENTACAO_INSUMOS.md # Este documento
```

---

## 4. Regras de Negócio e Lógica de Dados

### Persistência Híbrida
O sistema opera em **Modo Supabase** (nuvem) ou **Modo Local** (localStorage). O `useInsumosData` detecta o modo ativo e garante que as operações de CRUD funcionem de forma transparente para a UI.

### Gestão de Estoque
- **Estoques Mínimos:** O sistema sinaliza visualmente quando o `estoque_atual` <= `estoque_minimo`.
- **Movimentações:** Após o cadastro inicial, alterações de estoque devem ser feitas via **Logs de Inventário**, garantindo histórico de entradas e saídas.

### Variantes de Insumos
- Ativada via flag `tem_variantes`.
- Permite que um único insumo (ex: Essência) tenha múltiplas variações com custos e estoques independentes.
- O custo do insumo "pai" é ignorado quando existem variantes ativas.

---

## 5. Schema do Banco de Dados (Supabase)

### Tabela `ingredients`
| Coluna | Tipo | Notas |
|---|---|---|
| `id` | uuid | Primary Key |
| `name` | text | Nome do insumo |
| `cost_per_unit` | numeric | Custo unitário |
| `produto_quimico` | boolean | Categoria (Químico vs Embalagem) |
| `tem_variantes` | boolean | Flag de sub-itens |
| `sort_order` | integer | Ordem para drag-and-drop |

### Tabela `inventory_logs`
| Coluna | Tipo| Notas |
|---|---|---|
| `type` | text | 'in', 'out' ou 'adjust' |
| `quantity` | numeric | Volume movimentado |
| `reference_id` | uuid | ID de referência de produção/venda |

---

## 6. Registro de Otimizações

| Data | Ação | Impacto |
|---|---|---|
| 13/04/2026 | Refatoração v3 | Redução de `Insumos.tsx` (628 -> 252 linhas) |
| 13/04/2026 | Decomposição Modal | Redução de `InsumoModal.tsx` (625 -> 190 linhas) |
| 13/04/2026 | Consolidação de Hooks | Movimentação da lógica de filtragem para `useInsumoFilters` |

---
*Este histórico deve ser mantido e atualizado a cada mudança significativa no módulo.*
