# Documentação do Módulo de Vendas (Vendas.tsx)

Este módulo é responsável por todo o ciclo comercial, desde a prospecção (catálogo) até a entrega final e pós-venda (devoluções/quarentena). Ele possui um vínculo crítico com o módulo de produção, sendo capaz de gerar Ordens de Fabricação (OF) automaticamente.

## Estrutura de Arquivos (Padrão Ohana Clean)

```text
src/components/VendasComponents/
├── hooks/
│   ├── useSalesData.ts          # Busca e Sincronização de Dados
│   ├── useSalesActions.ts       # Ações de Modal, Salvamento e Deleção
│   ├── useSalesInventory.ts     # Lógica de Reserva e Baixa de Estoque
│   ├── useSalesProductionLink.ts # Automação de Geração de OFs
│   └── useSalesFilters.ts       # Filtros de Busca e Modos de Visualização
├── OrderModal/
│   ├── SalesOrderModal.tsx      # Maestro do formulário de pedido
│   ├── OrderGeralTab.tsx        # Dados do cliente e endereço
│   ├── OrderItensTab.tsx        # Carrinho de compras e precificação
│   └── OrderLogisticaTab.tsx     # Entrega e observações
├── SearchModals/
│   ├── ClientSearchModal.tsx     # Pesquisa avançada de clientes
│   └── ProductSearchModal.tsx   # Catálogo comercial avançado
├── services/
│   └── salesPrintService.ts     # Motor de impressão (PDF via Iframe)
├── types.ts                     # Interfaces globais
└── salesUtils.ts                # Configurações de status e cores
```

## Regras de Negócio Críticas

### 1. Automação de Produção (`checkStockAndConfirm`)
Ao confirmar um pedido, o sistema faz uma varredura no estoque de produtos acabados. Se houver déficit:
1.  Identifica a fórmula do produto.
2.  Busca a **Embalagem** compatível (Frasco/Galão) filtrando por capacidade.
3.  Busca o **Rótulo** compatível (Insumos que contenham "Rótulo" no nome).
4.  Gera automaticamente uma OF no status `planned` no módulo de Produção.

### 2. Ciclo de Vida do Pedido
- **Rascunho**: Pedido editável sem impacto no estoque.
- **Produção**: Aguardando finalização das OFs vinculadas.
- **Separação**: Estoque disponível reservado (sai do saldo "Livre" e entra no "Reservado").
- **Trânsito / Retirada**: Logística em andamento.
- **Recebido**: Baixa definitiva do estoque reservado.
- **Devolvido**: Inicia quarentena técnica de 5 dias.

### 3. Tabelas de Preço
Os preços são aplicados dinamicamente com base no perfil do cliente:
- **Varejo**: Preço base unitário.
- **Atacado**: Preço promocional para volume.
- **Fardo**: Preço fechado para múltiplos.

## Integração com Persistência
O módulo utiliza o padrão dual-storage:
- **LocalStorage**: `local_sale_orders`, `local_finished_goods`, `local_production_orders`.
- **Supabase**: Placeholder implementado no `useSalesData` para futura migração.

---
*Documentação atualizada em 13/04/2026 segundo as normas Ohana Clean.*
